import Link from "next/link";
import { redirect } from "next/navigation";
import { ulid } from "ulid";
import { getSession } from "@/lib/session";
import { getStore } from "@/lib/db";
import { generateApiKey, generateVerifyToken, hashApiKey, isAutoAllowedOrigin } from "@authai/cloud";
import { CLI_BRIDGE_COOKIE, verifyBridge } from "@/lib/cli-bridge";
import { cookies } from "next/headers";

export default async function NewAppPage({
  searchParams,
}: {
  searchParams: Promise<{ cli?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in?return=/apps/new");

  const params = await searchParams;
  const isCliFlow = params.cli === "1";

  async function createApp(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/sign-in?return=/apps/new");

    const name = String(formData.get("name") ?? "").trim();
    const origin = String(formData.get("origin") ?? "").trim();
    const cliMode = String(formData.get("cli") ?? "") === "1";

    if (!name || name.length > 80) {
      throw new Error("name must be 1-80 chars");
    }
    if (!isValidOrigin(origin)) {
      throw new Error("origin must be a full http(s) URL");
    }

    const store = await getStore();
    const existing = await store.apps.getByOrigin(origin);
    if (existing) {
      throw new Error("origin already in use by another app");
    }

    const id = `app_${ulid()}`;
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const verifyToken = generateVerifyToken();
    const autoVerified = isAutoAllowedOrigin(origin);
    const now = Date.now();

    await store.apps.create({
      id,
      apiKeyHash,
      origin,
      name,
      ownerGithubId: session.githubUserId,
      ownerEmail: session.githubEmail,
      originVerified: autoVerified,
      originVerifiedAt: autoVerified ? now : undefined,
      originVerifyToken: verifyToken,
      rateLimitPerMin: 60,
      dailyRequestCap: autoVerified ? 1000 : 100,
    });

    await store.audit.write({
      id: ulid(),
      ts: now,
      actorType: "owner",
      actorId: session.githubUserId,
      appId: id,
      eventType: "app_created",
      payload: {
        owner_github_login: session.githubLogin,
        origin,
        auto_verified: autoVerified,
        via: cliMode ? "cli" : "web",
      },
    });

    // CLI flow: send the key back to the local listener via 302.
    if (cliMode) {
      const c = await cookies();
      const bridge = await verifyBridge(c.get(CLI_BRIDGE_COOKIE)?.value);
      if (bridge) {
        const callbackUrl = new URL(`http://127.0.0.1:${bridge.port}/callback`);
        callbackUrl.searchParams.set("key", apiKey);
        callbackUrl.searchParams.set("app_id", id);
        callbackUrl.searchParams.set("state", bridge.state);
        if (!autoVerified) callbackUrl.searchParams.set("verify_token", verifyToken);
        c.delete(CLI_BRIDGE_COOKIE);
        // Show the key once on a confirmation page that auto-redirects to the
        // CLI's localhost listener. If the listener is gone the user still
        // sees the key here.
        redirect(`/apps/${id}/created?cli=1&cb=${encodeURIComponent(callbackUrl.toString())}&key=${encodeURIComponent(apiKey)}`);
      }
    }

    redirect(`/apps/${id}/created?key=${encodeURIComponent(apiKey)}`);
  }

  return (
    <>
      <nav className="top">
        <div>
          <strong>AuthAI Cloud</strong>
          <span className="muted"> · new app</span>
        </div>
        <div>
          <Link href="/dashboard">dashboard</Link>
        </div>
      </nav>
      <main>
        <h1>Create app</h1>
        {isCliFlow && (
          <p className="card">
            You arrived here from <code>npx authai-cloud init</code>. After
            you submit, we'll send the new key back to the CLI automatically.
          </p>
        )}

        <form action={createApp}>
          {isCliFlow && <input type="hidden" name="cli" value="1" />}

          <label htmlFor="name">App name</label>
          <input
            id="name"
            name="name"
            placeholder="My AI App"
            required
            maxLength={80}
          />
          <div className="field-hint">
            Shown on the ChatGPT consent screen when end users sign in.
          </div>

          <label htmlFor="origin">Origin</label>
          <input
            id="origin"
            name="origin"
            placeholder="https://myapp.com"
            required
            pattern="https?://.+"
          />
          <div className="field-hint">
            Full URL — scheme + host + optional port. Use
            <code> http://localhost:3000</code> for local dev. Production
            origins need a DNS TXT record to lift the ephemeral rate limit.
          </div>

          <p style={{ marginTop: 24 }}>
            <button className="btn" type="submit">
              Create app
            </button>
          </p>
        </form>
      </main>
    </>
  );
}

function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.pathname === "/" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}
