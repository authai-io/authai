import { describe, it, expect, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { createRelayApp } from "./app.js";
import { encryptJson, generateRecordKey } from "./crypto.js";
import type { AuthRecord, AuthRecordStore } from "./store.js";

/**
 * /auth/revoke is the same "no oracle" contract as /v1/* and /auth/whoami:
 * every authentication failure mode must collapse to the same 401 body.
 * Pre-refactor /revoke had distinguishable error messages ("missing bearer
 * token" vs the thrown JWT verify error) and skipped the record.appId
 * defense-in-depth check before deleting. This pins both fixes.
 */

const UNIFORM_401 = {
  status: 401,
  body: { error: "unauthorized" },
};

const JWT_SECRET = new Uint8Array(32).fill(7);
const OTHER_SECRET = new Uint8Array(32).fill(8);
const IDENTITY_SECRET = Buffer.alloc(32, 9);

function buildStore(initial: AuthRecord[] = []): {
  store: AuthRecordStore;
  deletedIds: string[];
} {
  const rows = new Map<string, AuthRecord>(initial.map((r) => [r.id, { ...r }]));
  const deletedIds: string[] = [];
  const store: AuthRecordStore = {
    async upsertByAccountHash() {
      throw new Error("not used");
    },
    async get(id) {
      const r = rows.get(id);
      return r ? { ...r } : null;
    },
    async update() {
      return false;
    },
    async delete(id) {
      if (rows.has(id)) {
        rows.delete(id);
        deletedIds.push(id);
      }
    },
    async sweepExpired() {
      return 0;
    },
    async close() {},
  };
  return { store, deletedIds };
}

function buildApp(initial: AuthRecord[] = []) {
  const { store, deletedIds } = buildStore(initial);
  const app = createRelayApp({
    store,
    jwtSecret: JWT_SECRET,
    identitySecret: IDENTITY_SECRET,
    originator: "test-app",
  });
  return { app, deletedIds };
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
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.Authorization = authHeader;
  const res = await app.fetch(
    new Request("http://relay.test/auth/revoke", { method: "POST", headers }),
  );
  if (res.status === 204) return { status: 204, body: null };
  const body = await res.json();
  return { status: res.status, body };
}

describe("/auth/revoke — uniform 401 across all auth failures", () => {
  let app: ReturnType<typeof buildApp>["app"];
  let recordKey: Buffer;
  let validJwt: string;
  let record: AuthRecord;
  let deletedIds: string[];

  beforeEach(async () => {
    recordKey = generateRecordKey();
    const now = Date.now();
    const payload = {
      provider: "openai" as const,
      access: "access-tok",
      refresh: "refresh-tok",
      expires: now + 60 * 60 * 1000,
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
    deletedIds = built.deletedIds;
    validJwt = await forgeJwt({
      v: 2,
      rid: record.id,
      k: recordKey.toString("base64url"),
      prov: "openai",
    });
  });

  it("sanity: valid JWT against a present record returns 204 and deletes the row", async () => {
    const ok = await probe(app, `Bearer ${validJwt}`);
    expect(ok.status).toBe(204);
    expect(deletedIds).toEqual([record.id]);
  });

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
        `Bearer ${await forgeJwt({ v: 99, rid: "01ABCDEF", k: generateRecordKey().toString("base64url"), prov: "openai" })}`,
    },
    {
      name: "JWT for a record that doesn't exist",
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: "missing-record-id",
          k: generateRecordKey().toString("base64url"),
          prov: "openai",
        })}`,
    },
    {
      name: "JWT carries an app claim but community tenant has none",
      build: async () =>
        `Bearer ${await forgeJwt({
          v: 2,
          rid: "01ABCDEF",
          k: recordKey.toString("base64url"),
          prov: "openai",
          app: "app_someone_else",
        })}`,
    },
  ];

  for (const c of cases) {
    it(`returns identical 401 envelope: ${c.name}`, async () => {
      const header = await c.build();
      const got = await probe(app, header);
      expect(got).toEqual(UNIFORM_401);
      // None of these probes should have deleted any record.
      expect(deletedIds).toEqual([]);
    });
  }

  it("all probed failure modes produce byte-identical bodies", async () => {
    const results: Array<{ status: number; body: unknown }> = [];
    for (const c of cases) {
      const header = await c.build();
      results.push(await probe(app, header));
    }
    const first = results[0]!;
    for (const r of results) {
      expect(r).toEqual(first);
    }
  });
});
