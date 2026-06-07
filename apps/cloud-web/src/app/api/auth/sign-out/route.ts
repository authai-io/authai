import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { absoluteUrl } from "@/lib/urls";

export async function POST(_req: NextRequest) {
  const res = NextResponse.redirect(absoluteUrl("/"));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

// Allow GET for direct link-out from the dashboard. POST is still fine for
// forms.
export async function GET(req: NextRequest) {
  return POST(req);
}
