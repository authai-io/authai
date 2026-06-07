/**
 * GET /cli-init?port=<n>&state=<hex>
 *
 * Entry point the CLI redirects the browser to. Validates inputs,
 * stores the signed bridge in a cookie, redirects through sign-in to
 * /apps/new?cli=1. After app creation the action reads the bridge
 * cookie and 302s back to http://127.0.0.1:port/callback?key=...
 */

import { NextRequest, NextResponse } from "next/server";
import { CLI_BRIDGE_COOKIE, signBridge } from "@/lib/cli-bridge";
import { absoluteUrl } from "@/lib/urls";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const port = Number(url.searchParams.get("port"));
  const state = url.searchParams.get("state") ?? "";

  // Range allowed by Node listening on a non-privileged port. The CLI
  // SHOULD use a random ephemeral port, but we tolerate the full range so
  // operators can pin one if needed for restrictive networks.
  if (!Number.isFinite(port) || port <= 1024 || port >= 65536) {
    return new NextResponse("invalid port", { status: 400 });
  }
  if (!state || !/^[a-f0-9]{16,128}$/i.test(state)) {
    return new NextResponse("invalid state", { status: 400 });
  }

  const token = await signBridge({ port, state });
  const res = NextResponse.redirect(
    absoluteUrl("/sign-in?return=/apps/new?cli=1"),
  );
  res.cookies.set(CLI_BRIDGE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
  return res;
}
