import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

// Allow GET for direct link-out from the dashboard. POST is still fine for
// forms.
export async function GET(req: NextRequest) {
  return POST(req);
}
