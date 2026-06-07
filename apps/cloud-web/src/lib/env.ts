/**
 * Env var resolution + validation. All "required" vars are loud-fail at
 * import time so a misconfigured deployment surfaces immediately, not at
 * the first authenticated request.
 */

export function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`[cloud-web] missing required env var: ${name}`);
  }
  return v;
}

export function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const RELAY_URL = optional("AUTH_AI_CLOUD_RELAY_URL", "https://relay.authai.dev");
export const WEBAPP_URL = optional("AUTH_AI_CLOUD_WEB_URL", "https://cloud.authai.dev");

// Webapp-side GitHub OAuth client. SEPARATE from the relay's identity —
// this app uses the web OAuth flow (client secret + redirect), the relay
// has no GitHub dependency at all in the cloud edition.
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID ?? "";
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? "";

// Cookie + CLI-bridge session signer. Reused for all webapp-issued
// short-lived tokens. NEVER the same as the relay's JWT secret.
export const SESSION_SECRET_HEX = process.env.AUTH_AI_CLOUD_WEB_SESSION_SECRET ?? "";
