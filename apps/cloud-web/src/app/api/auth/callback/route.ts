/**
 * GET /api/auth/callback?code=&state=
 *
 * The redirect target GitHub bounces back to after the user authorizes.
 * Verifies state, exchanges code, fetches profile, creates a session
 * cookie, redirects to the return path (or /dashboard).
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken, fetchProfile } from "@/lib/github";
import { createSession, SESSION_COOKIE } from "@/lib/session";
import { OAUTH_STATE_COOKIE, RETURN_COOKIE } from "@/app/sign-in/route";
import { absoluteUrl } from "@/lib/urls";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const returnTo = req.cookies.get(RETURN_COOKIE)?.value;

  // Diagnostic logging while we shake out the prod OAuth flow. Safe to
  // log states (they're random nonces, not secrets) but never log the
  // OAuth `code` (which IS used to exchange for an access token, once).
  console.log(
    JSON.stringify({
      tag: "auth.callback",
      hasCode: Boolean(code),
      hasStateParam: Boolean(state),
      stateParam: state,
      hasStateCookie: Boolean(expectedState),
      stateCookie: expectedState,
      stateMatch: state === expectedState,
      returnTo: returnTo ?? null,
      cookieNames: req.cookies.getAll().map((c) => c.name),
      reqUrl: req.url,
      hostHeader: req.headers.get("host"),
      xfHost: req.headers.get("x-forwarded-host"),
      xfProto: req.headers.get("x-forwarded-proto"),
    }),
  );

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(absoluteUrl("/sign-in?error=state"));
  }

  let token: string;
  let profile: { id: string; login: string; email?: string };
  try {
    token = await exchangeCodeForToken(code);
    profile = await fetchProfile(token);
  } catch (err) {
    console.error("[cloud-web] github callback failed:", err);
    return NextResponse.redirect(absoluteUrl("/sign-in?error=oauth"));
  }

  const session = await createSession({
    githubUserId: profile.id,
    githubLogin: profile.login,
    githubEmail: profile.email,
  });

  const dest = returnTo && returnTo.startsWith("/") ? returnTo : "/dashboard";
  const res = NextResponse.redirect(absoluteUrl(dest));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  res.cookies.delete(RETURN_COOKIE);
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
