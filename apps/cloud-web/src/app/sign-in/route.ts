/**
 * GET /sign-in
 *
 * Builds the GitHub authorize URL, sets a state cookie, redirects.
 * `?return=<path>` is preserved so callbacks land on the right page
 * (e.g., /apps/new for the CLI flow vs /dashboard for direct sign-in).
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buildAuthorizeUrl } from "@/lib/github";

const OAUTH_STATE_COOKIE = "authai_oauth_state";
const RETURN_COOKIE = "authai_oauth_return";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return");
  const state = randomBytes(16).toString("hex");

  const res = NextResponse.redirect(buildAuthorizeUrl(state, returnTo));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min — covers user latency on the GitHub page.
  });
  if (returnTo) {
    // Whitelist to local paths only to prevent open-redirect via /sign-in.
    if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      res.cookies.set(RETURN_COOKIE, returnTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
    }
  }
  return res;
}

export { OAUTH_STATE_COOKIE, RETURN_COOKIE };
