/**
 * One-time API key handoff via signed HttpOnly cookie.
 *
 * The newly-created API key is shown to the user ONCE (the webapp stores
 * only a SHA-256 hash). To avoid putting the raw key in a URL query
 * string — which would leak via browser history, Vercel access logs,
 * shoulder-surfing, and screenshots — the "Create app" server action
 * sets this cookie and redirects. The /apps/[id]/created page reads the
 * cookie ONCE, deletes it immediately, and renders the key in either:
 *
 *   - a code block (web flow), where the user manually copies it, or
 *   - a hidden field of a POST form (CLI flow), where the browser submits
 *     the key in the body to http://127.0.0.1:PORT/callback. POST bodies
 *     don't enter browser history.
 *
 * The cookie is JWT-signed (same secret as the rest of the webapp's
 * short-lived tokens) so a leaked cookie value can't be forged into a
 * fake key handoff. Lifetime is intentionally short — 5 minutes — to
 * bound the window where a key could be replayed if the cookie escaped
 * the user's machine.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_SECRET_HEX } from "./env";

const COOKIE_NAME = "authai_one_time_key";
const LIFETIME_SECONDS = 5 * 60;

function secret(): Uint8Array {
  if (!SESSION_SECRET_HEX || SESSION_SECRET_HEX.length < 64) {
    throw new Error("AUTH_AI_CLOUD_WEB_SESSION_SECRET missing or too short");
  }
  return new Uint8Array(Buffer.from(SESSION_SECRET_HEX, "hex"));
}

export async function setOneTimeKey(apiKey: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ k: apiKey })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + LIFETIME_SECONDS)
    .sign(secret());
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LIFETIME_SECONDS,
  });
}

/**
 * Read AND delete the cookie atomically — the key is single-use. A page
 * refresh after consumption sees `null` and shows a "key already
 * displayed" message instead of rendering it again.
 */
export async function consumeOneTimeKey(): Promise<string | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  c.delete(COOKIE_NAME);
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    const key = typeof payload.k === "string" ? payload.k : null;
    return key;
  } catch {
    return null;
  }
}
