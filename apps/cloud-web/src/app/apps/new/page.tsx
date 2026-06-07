import Link from "next/link";
import { redirect } from "next/navigation";
import { ulid } from "ulid";
import { getSession } from "@/lib/session";
import { getStore } from "@/lib/db";
import { generateApiKey, hashApiKey, normalizeOrigin } from "@authai/cloud";
import { CLI_BRIDGE_COOKIE, verifyBridge } from "@/lib/cli-bridge";
import { setOneTimeKey } from "@/lib/one-time-key";
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
    const rawOrigin = String(formData.get("origin") ?? "").trim();
    const cliMode = String(formData.get("cli") ?? "") === "1";

    if (!name || name.length > 80) {
      throw new Error("name must be 1-80 chars");
    }
    const origin = normalizeOrigin(rawOrigin);
    if (!origin) {
      throw new Error("origin must be a valid http(s) URL");
    }

    const store = await getStore();
    const existing = await store.apps.getByOrigin(origin);
    if (existing) {
      throw new Error("origin already in use by another app");
    }

    const id = `app_${ulid()}`;
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    const now = Date.now();

    // v1 doesn't enforce DNS verification. Every app is treated as usable
    // regardless of origin. v2 introduces the consent dialog + per-app
    // budgets, at which point originVerified actually gates trust — until
    // then this field is dead weight that's set true so the dashboard
    // doesn't show a "pending DNS" UI that has no path forward.
    try {
      await store.apps.create({
        id,
        apiKeyHash,
        origin,
        name,
        ownerGithubId: session.githubUserId,
        ownerEmail: session.githubEmail,
        originVerified: true,
        originVerifiedAt: now,
        originVerifyToken: "",
        rateLimitPerMin: 60,
        dailyRequestCap: 1000,
      });
    } catch (err) {
      // Raced another tab — the unique index on apps.origin caught it.
      // Surface the same friendly message as the pre-check.
      if (isPostgresUniqueViolation(err)) {
        throw new Error("origin already in use by another app");
      }
      throw err;
    }

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
        via: cliMode ? "cli" : "web",
      },
    });

    // Pass the API key through an HttpOnly one-time cookie instead of a
    // URL query string. The /created page reads + deletes the cookie,
    // renders either a code block (web flow) or an auto-submitting POST
    // form (CLI flow). Neither path puts the key into browser history,
    // server access logs, or screenshot-shareable URLs.
    await setOneTimeKey(apiKey);

    if (cliMode) {
      const c = await cookies();
      const bridge = await verifyBridge(c.get(CLI_BRIDGE_COOKIE)?.value);
      c.delete(CLI_BRIDGE_COOKIE);
      if (bridge) {
        redirect(
          `/apps/${id}/created?cli=1&port=${bridge.port}&state=${encodeURIComponent(bridge.state)}`,
        );
      }
    }

    redirect(`/apps/${id}/created`);
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

function isPostgresUniqueViolation(err: unknown): boolean {
  // pg surfaces SQLSTATE on the error object as `.code`. 23505 = unique violation.
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}
