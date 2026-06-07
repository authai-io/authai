import { describe, it, expect, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { createRelayApp } from "./app.js";
import { encryptJson, generateRecordKey } from "./crypto.js";
import type { AuthRecord, AuthRecordStore } from "./store.js";

/**
 * /v1 routes funnel every authentication failure through one helper so the
 * caller can't distinguish "no JWT" from "expired JWT" from "revoked record"
 * from "provider mismatch". These tests pin that contract: every probed
 * failure mode must return the exact same status code AND the exact same
 * response body — any divergence would create an oracle.
 */

const UNIFORM_401 = {
  status: 401,
  body: { error: { message: "unauthorized", type: "invalid_request_error" } },
};

const JWT_SECRET = new Uint8Array(32).fill(7);
const OTHER_SECRET = new Uint8Array(32).fill(8);
const IDENTITY_SECRET = Buffer.alloc(32, 9);

function buildStore(initial: AuthRecord[] = []): {
  store: AuthRecordStore;
  rows: Map<string, AuthRecord>;
} {
  const rows = new Map<string, AuthRecord>(initial.map((r) => [r.id, { ...r }]));
  const store: AuthRecordStore = {
    async upsertByAccountHash() {
      throw new Error("not used");
    },
    async get(id) {
      const r = rows.get(id);
      return r ? { ...r } : null;
    },
    async update(id, patch, expectedUpdatedAt) {
      const r = rows.get(id);
      if (!r || r.updatedAt !== expectedUpdatedAt) return false;
      r.iv = new Uint8Array(patch.iv);
      r.blob = new Uint8Array(patch.blob);
      r.updatedAt = patch.updatedAt;
      if (patch.expiresAt !== undefined) r.expiresAt = patch.expiresAt;
      return true;
    },
    async delete(id) {
      rows.delete(id);
    },
    async sweepExpired() {
      return 0;
    },
    async close() {},
  };
  return { store, rows };
}

function buildApp(rows: AuthRecord[] = []) {
  const { store, rows: map } = buildStore(rows);
  const app = createRelayApp({
    store,
    jwtSecret: JWT_SECRET,
    identitySecret: IDENTITY_SECRET,
    originator: "test-app",
  });
  return { app, store, rows: map };
}

async function forgeJwt(
  claims: Record<string, unknown>,
  opts: { secret?: Uint8Array; expSecondsFromNow?: number } = {},
): Promise<string> {
  const secret = opts.secret ?? JWT_SECRET;
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + (opts.expSecondsFromNow ?? 3600))
    .sign(secret);
}

async function probe(
  app: ReturnType<typeof buildApp>["app"],
  authHeader: string | undefined,
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authHeader !== undefined) headers.Authorization = authHeader;
  const res = await app.fetch(
    new Request("http://relay.test/v1/models", { method: "GET", headers }),
  );
  const body = await res.json();
  return { status: res.status, body };
}

describe("/v1 routes — uniform 401 across all auth failures", () => {
  let app: ReturnType<typeof buildApp>["app"];
  let recordKey: Buffer;
  let validJwt: string;
  let record: AuthRecord;

  beforeEach(async () => {
    recordKey = generateRecordKey();
    const now = Date.now();
    const payload = {
      provider: "openai" as const,
      access: "access-tok",
      refresh: "refresh-tok",
      expires: now + 60 * 60 * 1000, // far from expiry → no refresh attempted
      accountId: "acct-1",
      originator: "test-app",
    };
    const { iv, blob } = encryptJson(recordKey, payload);
    record = {
      id: "01ABCDEF",
      iv,
      blob,
      accountIdHash: "hash-1",
      createdAt: now,
      updatedAt: now,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000,
    };
    const built = buildApp([record]);
    app = built.app;
    validJwt = await forgeJwt({
      v: 2,
      rid: record.id,
      k: recordKey.toString("base64url"),
      prov: "openai",
    });
  });

  it("sanity: valid JWT and intact record returns NOT a 401", async () => {
    const ok = await probe(app, `Bearer ${validJwt}`);
    expect(ok.status).not.toBe(401);
  });

  // Each probe below corresponds to one distinct failure path inside the
  // v1 auth middleware or resolveCredentials. They must all collapse to
  // the exact same 401 envelope — any divergence is a regression.
  const cases: Array<{ name: string; build: () => Promise<string | undefined> }> = [
    {
      name: "missing Authorization header",
      build: async () => undefined,
    },
    {
      name: "Authorization header without Bearer prefix",
      build: async () => "Basic some-user:some-pass",
    },
    {
      name: "Bearer with garbage token (malformed JWT)",
      build: async () => "Bearer not.a.valid.jwt.at.all",
    },
    {
      name: "JWT signed with a different secret",
      build: async () =>
        `Bearer ${await forgeJwt(
          { v: 2, rid: "01ABCDEF", k: generateRecordKey().toString("base64url"), prov: "openai" },
          { secret: OTHER_SECRET },
        )}`,
    },
    {
      name: "expired JWT",
      build: async () =>
        `Bearer ${await forgeJwt(
          { v: 2, rid: "01ABCDEF", k: generateRecordKey().toString("base64url"), prov: "openai" },
          { expSecondsFromNow: -10 },
        )}`,
    },
    {
      name: "JWT with unsupported version",
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 99,
          rid: "01ABCDEF",
          k: generateRecordKey().toString("base64url"),
          prov: "openai",
        })}`,
    },
    {
      name: "JWT with wrong-length record key",
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: "01ABCDEF",
          k: Buffer.alloc(16, 0).toString("base64url"), // 16-byte key, not 32
          prov: "openai",
        })}`,
    },
    {
      name: "JWT with unknown provider claim",
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: "01ABCDEF",
          k: generateRecordKey().toString("base64url"),
          prov: "anthropic", // not a registered provider
        })}`,
    },
    {
      name: "valid JWT but record was revoked / never existed",
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: "missing-record-id",
          k: generateRecordKey().toString("base64url"),
          prov: "openai",
        })}`,
    },
    {
      name: "valid JWT but provider claim disagrees with stored record",
      // recordKey + rid are the real ones, so decryption succeeds, but
      // the JWT claims `prov:"xai"` while the encrypted record holds
      // `provider:"openai"`. loadAndMaybeRefresh must reject this.
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: record.id,
          k: recordKey.toString("base64url"),
          prov: "xai",
        })}`,
    },
    {
      name: "valid signature but the record key in JWT can't decrypt the row",
      // A real-shaped JWT with a random key produces a successful JWT
      // verification but AES-GCM authentication fails. The catch in
      // resolveCredentials collapses this to the uniform 401 — never an
      // oracle for "your JWT was valid but the key was wrong".
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: record.id,
          k: generateRecordKey().toString("base64url"),
          prov: "openai",
        })}`,
    },
  ];

  for (const { name, build } of cases) {
    it(`returns identical 401 envelope: ${name}`, async () => {
      const header = await build();
      const out = await probe(app, header);
      expect(out.status).toBe(UNIFORM_401.status);
      expect(out.body).toEqual(UNIFORM_401.body);
    });
  }

  it("all probed failure modes produce byte-identical bodies", async () => {
    // Cross-check: serialize every observed body to JSON and confirm
    // they're all the exact same string. This catches subtle drifts
    // like a stray field added to one error path only.
    const bodies: string[] = [];
    for (const { build } of cases) {
      const header = await build();
      const out = await probe(app, header);
      bodies.push(JSON.stringify(out.body));
    }
    const unique = new Set(bodies);
    expect(unique.size).toBe(1);
    expect(unique.values().next().value).toBe(JSON.stringify(UNIFORM_401.body));
  });
});
