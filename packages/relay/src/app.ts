import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { createAuthRoutes } from "./auth-routes.js";
import { createV1Routes } from "./v1-routes.js";
import type { AuthRecordStore } from "./store.js";

export type RelayConfig = {
  store: AuthRecordStore;
  jwtSecret: Uint8Array;
  identitySecret: Buffer;
  originator: string;
};

function validateConfig(config: RelayConfig): void {
  if (!config.originator || config.originator.length === 0) {
    throw new Error("createRelayApp: `originator` is required");
  }
  if (config.jwtSecret.length < 32) {
    throw new Error("createRelayApp: jwtSecret must be at least 32 bytes");
  }
  if (config.identitySecret.length < 32) {
    throw new Error("createRelayApp: identitySecret must be at least 32 bytes");
  }
  // Reject identical secrets so a leak of one doesn't compromise the other.
  // A constant-time compare avoids a length-dependent oracle even though
  // the lengths are public.
  if (config.jwtSecret.length === config.identitySecret.length) {
    const a = Buffer.from(config.jwtSecret);
    const b = config.identitySecret;
    if (timingSafeEqual(a, b)) {
      throw new Error(
        "createRelayApp: jwtSecret and identitySecret must be different",
      );
    }
  }
}

export function createRelayApp(config: RelayConfig): Hono {
  validateConfig(config);
  const app = new Hono();

  app.use("*", async (c, next) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header("Access-Control-Max-Age", "86400");
    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }
    await next();
  });

  app.get("/", (c) => c.json({ ok: true, service: "authai-relay" }));

  app.route("/auth", createAuthRoutes({
    store: config.store,
    jwtSecret: config.jwtSecret,
    identitySecret: config.identitySecret,
    originator: config.originator,
  }));

  app.route("/v1", createV1Routes({
    store: config.store,
    jwtSecret: config.jwtSecret,
  }));

  return app;
}

export function startBackgroundSweep(store: AuthRecordStore, intervalMs = 5 * 60 * 1000): { stop: () => void } {
  const timer = setInterval(() => {
    store.sweepExpired(Date.now()).catch(() => { /* ignore sweep errors */ });
  }, intervalMs);
  timer.unref();
  return { stop: () => clearInterval(timer) };
}
