/**
 * GitHub web OAuth (the standard authorization_code flow, NOT device code).
 *
 *   /sign-in              → builds the authorize URL, sets a state cookie,
 *                            redirects to github.com/login/oauth/authorize
 *   /api/auth/callback    → receives ?code=... + verifies state, exchanges
 *                            for access_token, fetches profile, sets the
 *                            session cookie, redirects to /dashboard
 *
 * The cookie-based state token prevents CSRF on the callback. The GitHub
 * access token itself is never persisted — we only need it long enough
 * to fetch the user's profile and discard it.
 */

import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, WEBAPP_URL } from "./env";

export const REDIRECT_PATH = "/api/auth/callback";

export function buildAuthorizeUrl(state: string, returnTo: string | null): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", `${WEBAPP_URL}${REDIRECT_PATH}`);
  // Minimum scope. `user:email` lets us call /user/emails to find the
  // user's verified primary email — needed for app-owner notifications.
  // We deliberately omit `read:user`: the basic /user endpoint returns
  // id + login + public profile without any scope, which is all we need
  // for ownership attribution. Asking for read:user would surface "Read
  // all user profile data" on GitHub's consent screen — too much for
  // what we actually use.
  url.searchParams.set("scope", "user:email");
  url.searchParams.set("state", state);
  if (returnTo) url.searchParams.set("allow_signup", "true");
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`github token exchange failed: ${res.status}`);
  }
  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`github token exchange: ${data.error ?? "no token"}`);
  }
  return data.access_token;
}

export async function fetchProfile(
  accessToken: string,
): Promise<{ id: string; login: string; email?: string }> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "authai-cloud-web",
    },
  });
  if (!userRes.ok) throw new Error(`github user lookup failed: ${userRes.status}`);
  const user = (await userRes.json()) as { id: number; login: string; email?: string | null };

  // Public email may be null; fall back to /user/emails (requires user:email scope)
  let email = user.email ?? undefined;
  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "authai-cloud-web",
      },
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails.find((e) => e.verified)?.email;
    }
  }

  return { id: String(user.id), login: user.login, email };
}
