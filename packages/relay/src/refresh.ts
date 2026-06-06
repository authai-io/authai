import { decryptJson, encryptJson } from "./crypto.js";
import { getProvider } from "./providers/registry.js";
import type { ProviderId } from "./providers/types.js";
import type { AuthRecord, AuthRecordStore } from "./store.js";

export type DecryptedRecord = {
  provider: ProviderId;
  access: string;
  refresh: string;
  expires: number;
  accountId: string;
  originator?: string;
};

const REFRESH_THRESHOLD_MS = 60_000;

export async function loadAndMaybeRefresh(params: {
  store: AuthRecordStore;
  record: AuthRecord;
  recordKey: Buffer;
  expectedProvider: ProviderId;
}): Promise<DecryptedRecord> {
  const decrypted = decryptJson<DecryptedRecord>(params.recordKey, {
    iv: params.record.iv,
    blob: params.record.blob,
  });

  if (decrypted.provider !== params.expectedProvider) {
    throw new Error("JWT provider does not match stored record provider");
  }

  if (decrypted.expires - Date.now() > REFRESH_THRESHOLD_MS) return decrypted;
  if (!decrypted.refresh) throw new Error("token expired and no refresh token available");

  const adapter = getProvider(decrypted.provider);
  const next = await adapter.refreshTokens(decrypted.refresh);
  const merged: DecryptedRecord = {
    provider: decrypted.provider,
    access: next.access,
    refresh: next.refresh,
    expires: next.expires,
    accountId: next.accountId || decrypted.accountId,
    originator: decrypted.originator,
  };
  const { iv, blob } = encryptJson(params.recordKey, merged);
  await params.store.update(params.record.id, { iv, blob, updatedAt: Date.now() });
  return merged;
}
