import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStore } from "@/lib/db";

/**
 * The "you just created an app, here's your key" page. Shown ONCE; the
 * key isn't recoverable from this page on a refresh (it's only in the
 * query string from the create action's redirect).
 *
 * If the CLI flow is active (`cli=1` + `cb=<localhost url>`), we render
 * an auto-redirect to the listener. The key is still shown on the page
 * as a fallback in case the listener has timed out.
 */
export default async function CreatedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string; cli?: string; cb?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id } = await params;
  const sp = await searchParams;
  const store = await getStore();
  const app = await store.apps.getById(id);
  if (!app || app.ownerGithubId !== session.githubUserId) redirect("/dashboard");

  const key = sp.key;
  if (!key) redirect(`/apps/${id}`);
  const isCli = sp.cli === "1";

  return (
    <>
      {isCli && sp.cb && (
        <meta httpEquiv="refresh" content={`1; url=${sp.cb}`} />
      )}
      <nav className="top">
        <div>
          <strong>AuthAI Cloud</strong>
          <span className="muted"> · {app.name}</span>
        </div>
        <div>
          <Link href="/dashboard">dashboard</Link>
        </div>
      </nav>
      <main>
        <h1>App created</h1>
        {isCli && (
          <p className="card">
            Returning to your terminal in a moment. If nothing happens, copy
            the key below into your <code>.env</code> manually.
          </p>
        )}

        <h2>Your API key</h2>
        <p className="muted">
          Shown once. The relay stores only a hash — we can't recover this
          for you later. Treat it like a password.
        </p>
        <pre>
          <code>AUTH_AI_KEY={key}</code>
        </pre>

        {!app.originVerified && (
          <>
            <h2>Verify your origin (optional)</h2>
            <p>
              <code>{app.origin}</code> isn't a localhost or <code>*.vercel.app</code>{" "}
              preview, so it's capped at the ephemeral bucket (100 req/day)
              until you publish a DNS TXT record:
            </p>
            <pre>
              <code>
                Host:  {hostnameFor(app.origin)}{"\n"}
                Type:  TXT{"\n"}
                Value: authai-verify={app.originVerifyToken}
              </code>
            </pre>
            <p className="muted">
              The relay re-checks DNS every 60 seconds. Once verified, the
              daily cap rises to 1000.
            </p>
          </>
        )}

        <h2>Next steps</h2>
        <ol>
          <li>
            Install the SDK: <code>npm install @authai/react</code>
          </li>
          <li>
            Wrap your app with <code>&lt;AuthAIProvider relayUrl="https://relay.authai.dev"&gt;</code>
          </li>
          <li>
            Drop in <code>&lt;SignInWithChatGPT /&gt;</code>
          </li>
        </ol>

        <p style={{ marginTop: 32 }}>
          <Link href="/dashboard" className="btn">
            Back to dashboard
          </Link>
        </p>
      </main>
    </>
  );
}

function hostnameFor(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
}
