/**
 * @authai/cloud — cloud-edition runtime add-ons for the AuthAI relay.
 *
 * The cloud edition's relay is pure data-plane: it accepts encrypted-token
 * reads/writes, runs the OAuth device-code flow, and proxies model calls.
 * App registration, the dashboard, and builder identity all live in a
 * separate webapp (`apps/cloud-web`, deployed to Vercel at
 * `cloud.authai.dev`). This package provides ONLY the relay-side
 * primitives the webapp doesn't:
 *
 *   - CloudTenantResolver (per-request tenant lookup by Origin or
 *     x-authai-key header)
 *   - HKDF per-app identitySecret derivation
 *   - Kill switch state machine + per-app rate limiter
 *   - DNS TXT origin verification
 *   - Edition gate
 *
 * The webapp talks to the same Postgres `apps` table the relay reads.
 * They share data, not code paths.
 */

export { CloudTenantResolver, createMemoryCache } from "./tenant.js";
export type { CloudTenantConfig, TenantCache } from "./tenant.js";

export {
  derivePerAppIdentitySecret,
  hashApiKey,
  generateApiKey,
  generateVerifyToken,
} from "./identity.js";

export {
  verifyOriginByDns,
  createOriginVerifier,
  isAutoAllowedOrigin,
} from "./origin-verify.js";
export type { OriginVerifier, OriginVerifierConfig } from "./origin-verify.js";

export {
  createKillSwitch,
  createRateLimiter,
} from "./kill-switch.js";
export type {
  KillSwitch,
  KillSwitchState,
  KillSwitchEvent,
  RateLimiter,
  RateLimitDecision,
  RateLimiterConfig,
  KillSwitchConfig,
  RedisLike,
} from "./kill-switch.js";

export { resolveEdition } from "./edition.js";
export type { Edition } from "./edition.js";
