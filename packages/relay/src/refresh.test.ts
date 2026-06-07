import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptJson, generateRecordKey } from "./crypto.js";
import type { AuthRecord, AuthRecordStore } from "./store.js";

// Mock the provider registry so refresh tests don't reach out to
// auth.openai.com / api.x.ai / api.github.com. The hoisted vi.mock is
// applied before the module under test imports its dependencies.
const refreshTokensSpy = vi.fn();
vi.mock("./providers/registry.js", () => ({
  getProvider: () => ({
    id: "openai" as const,
    displayName: "Mock",
    refreshTokens: refreshTokensSpy,
    requestDeviceCode: vi.fn(),
    pollDeviceCode: vi.fn(),
    listModels: vi.fn(),
    proxyChatCompletions: vi.fn(),
  }),
  listProviders: vi.fn(),
  isProviderId: vi.fn(),
}));

// Import the module under test AFTER the mock is registered.
const { loadAndMaybeRefresh } = await import("./refresh.js");

type StoredPayload = {
  provider: "openai";
  access: string;
  refresh: string;
  expires: number;
  accountId: string;
  originator?: string;
};

function buildRecord(
  recordKey: Buffer,
  payload: StoredPayload,
  meta: { id?: string; accountIdHash?: string; updatedAt?: number } = {},
): AuthRecord {
  const { iv, blob } = encryptJson(recordKey, payload);
  const now = Date.now();
  return {
    id: meta.id ?? "rec-1",
    iv,
    blob,
    accountIdHash: meta.accountIdHash ?? "hash-1",
    createdAt: now,
    updatedAt: meta.updatedAt ?? now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
}

function buildStore(initial: AuthRecord): { store: AuthRecordStore; rows: Map<string, AuthRecord> } {
  const rows = new Map<string, AuthRecord>([[initial.id, { ...initial }]]);
  const store: AuthRecordStore = {
    async upsertByAccountHash() {
      throw new Error("not used in these tests");
    },
    async get(id) {
      const r = rows.get(id);
      return r ? { ...r } : null;
    },
    async update(id, patch, expectedUpdatedAt) {
      const r = rows.get(id);
      if (!r) return false;
      if (r.updatedAt !== expectedUpdatedAt) return false; // CAS-loss
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

beforeEach(() => {
  refreshTokensSpy.mockReset();
});

describe("loadAndMaybeRefresh — happy paths", () => {
  it("returns decrypted as-is when access is far from expiry", async () => {
    const k = generateRecordKey();
    const payload: StoredPayload = {
      provider: "openai",
      access: "still-good",
      refresh: "r-1",
      expires: Date.now() + 30 * 60 * 1000,
      accountId: "acct-1",
      originator: "test-app",
    };
    const record = buildRecord(k, payload);
    const { store } = buildStore(record);

    const result = await loadAndMaybeRefresh({
      store,
      record,
      recordKey: k,
      expectedProvider: "openai",
    });

    expect(result.access).toBe("still-good");
    expect(refreshTokensSpy).not.toHaveBeenCalled();
  });

  it("refreshes when access is at/near expiry and writes back via CAS", async () => {
    const k = generateRecordKey();
    const payload: StoredPayload = {
      provider: "openai",
      access: "expiring",
      refresh: "r-1",
      expires: Date.now() + 1000,
      accountId: "acct-1",
      originator: "test-app",
    };
    const record = buildRecord(k, payload);
    const { store, rows } = buildStore(record);

    refreshTokensSpy.mockResolvedValue({
      access: "rotated",
      refresh: "r-2",
      expires: Date.now() + 30 * 60 * 1000,
      accountId: "acct-1",
    });

    const result = await loadAndMaybeRefresh({
      store,
      record,
      recordKey: k,
      expectedProvider: "openai",
    });

    expect(result.access).toBe("rotated");
    expect(result.refresh).toBe("r-2");
    expect(refreshTokensSpy).toHaveBeenCalledTimes(1);

    // The stored blob must have been rewritten — even when Date.now()
    // happens to return the same ms as the original updatedAt, the
    // encrypted ciphertext is guaranteed to differ because the AES-GCM
    // IV is freshly random per write.
    const stored = rows.get(record.id)!;
    expect(Buffer.from(stored.blob).equals(Buffer.from(record.blob))).toBe(false);
  });

  it("rejects when JWT provider doesn't match stored record provider", async () => {
    const k = generateRecordKey();
    const payload: StoredPayload = {
      provider: "openai",
      access: "tok",
      refresh: "r",
      expires: Date.now() + 30 * 60 * 1000,
      accountId: "acct",
    };
    const record = buildRecord(k, payload);
    const { store } = buildStore(record);

    await expect(
      loadAndMaybeRefresh({
        store,
        record,
        recordKey: k,
        expectedProvider: "xai", // wrong
      }),
    ).rejects.toThrow(/provider/i);
  });
});

describe("loadAndMaybeRefresh — CAS retry", () => {
  it("on CAS-loss, re-reads and returns the fresher record without calling provider twice", async () => {
    const k = generateRecordKey();
    const stalePayload: StoredPayload = {
      provider: "openai",
      access: "stale",
      refresh: "r-old",
      expires: Date.now() + 1000,
      accountId: "acct",
      originator: "test",
    };
    const staleRecord = buildRecord(k, stalePayload, { updatedAt: 1000 });
    const { store, rows } = buildStore(staleRecord);

    // Simulate a concurrent winner: before we call update(), another writer
    // rotated the row under the same K. We model that by mutating the
    // stored row's blob to encrypt the fresh tokens, and advancing its
    // updatedAt — so our caller's expectedUpdatedAt (still 1000) misses
    // the CAS.
    const freshPayload: StoredPayload = {
      ...stalePayload,
      access: "fresh-from-concurrent-writer",
      refresh: "r-new",
      expires: Date.now() + 30 * 60 * 1000,
    };
    const fresh = encryptJson(k, freshPayload);

    let providerCalls = 0;
    refreshTokensSpy.mockImplementation(async () => {
      providerCalls += 1;
      // First call: simulate the other writer beating us by mutating the
      // store right as our provider call returns. The CAS we issue next
      // will then fail (expected updatedAt 1000, actual 2000).
      const row = rows.get(staleRecord.id)!;
      row.iv = fresh.iv;
      row.blob = fresh.blob;
      row.updatedAt = 2000;
      return {
        access: "would-have-been-ours",
        refresh: "r-ours",
        expires: Date.now() + 30 * 60 * 1000,
        accountId: "acct",
      };
    });

    const result = await loadAndMaybeRefresh({
      store,
      record: staleRecord,
      recordKey: k,
      expectedProvider: "openai",
    });

    // We should observe the concurrent winner's tokens, not our own. And
    // we should have called the provider exactly once — the re-read found
    // already-fresh tokens, so no second refresh was issued.
    expect(result.access).toBe("fresh-from-concurrent-writer");
    expect(providerCalls).toBe(1);
  });

  it("throws after MAX_RETRIES if every CAS attempt loses", async () => {
    const k = generateRecordKey();
    const stalePayload: StoredPayload = {
      provider: "openai",
      access: "stale",
      refresh: "r",
      expires: Date.now() + 1000,
      accountId: "acct",
    };
    const staleRecord = buildRecord(k, stalePayload, { updatedAt: 1000 });
    const { store, rows } = buildStore(staleRecord);

    // The provider returns rotated tokens, but every time we attempt to
    // commit them, a competing writer has just advanced the row again.
    // After exhausting retries we surface a clear conflict error rather
    // than silently overwriting.
    refreshTokensSpy.mockImplementation(async () => {
      // Always advance the row right before our CAS lands. Each call
      // re-stales us — but the re-read happens to find a still-stale
      // token so we'd attempt another refresh, and that second attempt
      // also loses. MAX_RETRIES=1 so we should throw on the second loss.
      const row = rows.get(staleRecord.id)!;
      // Encrypt a still-stale payload so the re-read decides to refresh
      // again instead of bailing out.
      const stillStale = encryptJson(k, {
        ...stalePayload,
        access: `racy-${row.updatedAt}`,
      });
      row.iv = stillStale.iv;
      row.blob = stillStale.blob;
      row.updatedAt = row.updatedAt + 1000;
      return {
        access: "tried",
        refresh: "r",
        expires: Date.now() + 30 * 60 * 1000,
        accountId: "acct",
      };
    });

    await expect(
      loadAndMaybeRefresh({
        store,
        record: staleRecord,
        recordKey: k,
        expectedProvider: "openai",
      }),
    ).rejects.toThrow(/conflict/i);
  });
});
