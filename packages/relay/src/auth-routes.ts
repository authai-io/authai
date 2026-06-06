import { Hono } from "hono";
import {
  exchangeCode,
  pollDeviceCode,
  refreshTokens,
  requestDeviceCode,
} from "./openai-client.js";
import { createSession, getSession, updateSession } from "./sessions.js";

export const authRoutes = new Hono();

authRoutes.post("/start", async (c) => {
  try {
    const device = await requestDeviceCode();
    const session = createSession({
      deviceAuthId: device.deviceAuthId,
      userCode: device.userCode,
      pollIntervalMs: device.intervalMs,
    });
    return c.json({
      sessionId: session.id,
      userCode: device.userCode,
      verificationUrl: device.verificationUrl,
      expiresInMs: session.expiresAt - Date.now(),
      pollIntervalMs: device.intervalMs,
    });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 502);
  }
});

authRoutes.get("/poll/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");
  const session = getSession(sessionId);
  if (!session) {
    return c.json({ status: "error", error: "session not found" }, 404);
  }
  if (session.status !== "pending") {
    return c.json({
      status: session.status,
      tokens: session.tokens,
      error: session.error,
    });
  }

  try {
    const result = await pollDeviceCode(session.deviceAuthId, session.userCode);
    if (result.status === "pending") {
      return c.json({ status: "pending" });
    }
    const tokens = await exchangeCode({
      authorizationCode: result.authorizationCode,
      codeVerifier: result.codeVerifier,
    });
    updateSession(sessionId, { status: "complete", tokens });
    return c.json({ status: "complete", tokens });
  } catch (err) {
    const message = errorMessage(err);
    updateSession(sessionId, { status: "error", error: message });
    return c.json({ status: "error", error: message }, 502);
  }
});

authRoutes.post("/refresh", async (c) => {
  let body: { refresh_token?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid json body" }, 400);
  }
  const refreshToken = body.refresh_token;
  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    return c.json({ error: "missing refresh_token" }, 400);
  }
  try {
    const tokens = await refreshTokens(refreshToken);
    return c.json({ tokens });
  } catch (err) {
    return c.json({ error: errorMessage(err) }, 502);
  }
});

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
