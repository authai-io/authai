import { Hono } from "hono";
import { ulid } from "ulid";
import { encryptJson, generateRecordKey, sha256Hex } from "./crypto.js";
import { issueSessionJwt, verifySessionJwt } from "./jwt.js";
import { getProvider, isProviderId } from "./providers/registry.js";
import type { ProviderId } from "./providers/types.js";
import { createSession, getSession, updateSession } from "./sessions.js";
import type { AuthRecordStore } from "./store.js";

export function createAuthRoutes(deps: {
  store: AuthRecordStore;
  jwtSecret: Uint8Array;
  originator: string;
}): Hono {
  const app = new Hono();

  app.post("/start", async (c) => {
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      /* allow empty body for backward compat */
    }
    const providerId: ProviderId = isProviderId(body?.provider) ? body.provider : "openai";

    try {
      const adapter = getProvider(providerId);
      const device = await adapter.requestDeviceCode(deps.originator);
      const session = createSession({
        providerId,
        deviceAuthId: device.deviceAuthId,
        userCode: device.userCode,
        pollIntervalMs: device.intervalMs,
        expiresInMs: device.expiresInMs,
      });
      return c.json({
        sessionId: session.id,
        provider: providerId,
        userCode: device.userCode,
        verificationUrl: device.verificationUrl,
        expiresInMs: session.expiresAt - Date.now(),
        pollIntervalMs: device.intervalMs,
      });
    } catch (err) {
      return c.json({ error: errorMessage(err) }, 502);
    }
  });

  app.get("/poll/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const session = getSession(sessionId);
    if (!session) {
      return c.json({ status: "error", error: "session not found" }, 404);
    }
    if (session.status === "complete" && session.jwt) {
      return c.json({ status: "complete", jwt: session.jwt });
    }
    if (session.status !== "pending") {
      return c.json({ status: session.status, error: session.error });
    }

    try {
      const adapter = getProvider(session.providerId);
      const result = await adapter.pollDeviceCode({
        deviceAuthId: session.deviceAuthId,
        userCode: session.userCode,
      });
      if (result.status === "pending") {
        return c.json({ status: "pending" });
      }
      const tokens = result.tokens;
      const accountIdHash = sha256Hex(tokens.accountId || tokens.access.slice(0, 32));
      const existing = await deps.store.findByAccountHash(accountIdHash);
      const recordKey = generateRecordKey();
      const now = Date.now();
      const refreshLifeMs = 30 * 24 * 60 * 60 * 1000;
      const expiresAt = now + refreshLifeMs;
      const payload = {
        provider: session.providerId,
        access: tokens.access,
        refresh: tokens.refresh,
        expires: tokens.expires,
        accountId: tokens.accountId,
        originator: deps.originator,
      };
      const { iv, blob } = encryptJson(recordKey, payload);

      const recordId = existing?.id ?? ulid();
      await deps.store.put({
        id: recordId,
        iv,
        blob,
        accountIdHash,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        expiresAt,
      });

      const jwt = await issueSessionJwt({
        recordId,
        recordKey,
        provider: session.providerId,
        secret: deps.jwtSecret,
      });

      updateSession(sessionId, { status: "complete", jwt });
      return c.json({ status: "complete", jwt });
    } catch (err) {
      const message = errorMessage(err);
      updateSession(sessionId, { status: "error", error: message });
      return c.json({ status: "error", error: message });
    }
  });

  app.post("/revoke", async (c) => {
    const auth = c.req.header("Authorization") || "";
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (!match) return c.json({ error: "missing bearer token" }, 401);
    try {
      const verified = await verifySessionJwt(match[1]!, deps.jwtSecret);
      await deps.store.delete(verified.recordId);
      return c.body(null, 204);
    } catch (err) {
      return c.json({ error: errorMessage(err) }, 401);
    }
  });

  app.get("/providers", (c) => {
    const ids: ProviderId[] = ["openai", "xai", "github"];
    return c.json({
      providers: ids.map((id) => {
        const a = getProvider(id);
        return { id: a.id, displayName: a.displayName };
      }),
    });
  });

  return app;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
