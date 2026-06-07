/**
 * URL helpers. Behind nginx (Dokku) the Next.js process sees inbound
 * requests with Host: 0.0.0.0:5000 from its own internal listener — NOT
 * the public hostname. That means `new URL(path, req.url)` builds
 * redirects pointing at `https://0.0.0.0:5000/...`, which the browser
 * cannot reach.
 *
 * Always build absolute redirects against WEBAPP_URL (the public URL
 * we set via env) instead of req.url. WEBAPP_URL is the single source
 * of truth for the public origin.
 */

import { WEBAPP_URL } from "./env";

/**
 * Resolve a path-or-absolute string against the public WEBAPP_URL.
 *
 *   absoluteUrl("/dashboard")           → "https://authai.io/dashboard"
 *   absoluteUrl("/sign-in?error=state") → "https://authai.io/sign-in?error=state"
 *   absoluteUrl("https://other.com/x")  → "https://other.com/x"  (passes through)
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = WEBAPP_URL.replace(/\/$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
