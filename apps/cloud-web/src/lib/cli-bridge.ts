/**
 * CLI bridge — the browser dance that backs `npx authai-cloud init`.
 *
 *   1. CLI binds a local HTTP listener on a random port and opens
 *      `https://authai.io/cli-init?port=PORT&state=STATE`.
 *   2. /cli-init validates state + port, stores them in a short-lived
 *      cookie, redirects to /sign-in?return=/apps/new?cli=1.
 *   3. After app creation, the action returns the API key. The webapp
 *      reads the cli state from the cookie and 302s the browser to
 *      `http://127.0.0.1:PORT/callback?key=...&state=STATE`.
 *   4. CLI's listener receives + closes, writes `.env`.
 *
 * We sign the bridge state (port + nonce) so even if a third-party
 * tricks the user into hitting /cli-init with arbitrary params, the
 * callback can't be forged to leak the key off-host.
 */

import { SignJWT, jwtVerify } from "jose";
import { SESSION_SECRET_HEX } from "./env";

const COOKIE_NAME = "authai_cli_bridge";
const LIFETIME_SECONDS = 5 * 60; // 5 min — generous for OAuth + app create.

function secret(): Uint8Array {
  if (!SESSION_SECRET_HEX || SESSION_SECRET_HEX.length < 64) {
    throw new Error("AUTH_AI_CLOUD_WEB_SESSION_SECRET missing or too short");
  }
  return new Uint8Array(Buffer.from(SESSION_SECRET_HEX, "hex"));
}

export type CliBridgeState = {
  /** Local port the CLI listener bound to. Always 127.0.0.1. */
  port: number;
  /** Random nonce echoed back to the CLI as `state`. */
  state: string;
};

export async function signBridge(state: CliBridgeState): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ port: state.port, state: state.state })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + LIFETIME_SECONDS)
    .sign(secret());
}

export async function verifyBridge(token: string | undefined): Promise<CliBridgeState | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const port = Number(payload.port);
    const state = String(payload.state);
    if (!Number.isFinite(port) || port <= 0 || port >= 65536) return null;
    if (!state) return null;
    return { port, state };
  } catch {
    return null;
  }
}

export { COOKIE_NAME as CLI_BRIDGE_COOKIE };
