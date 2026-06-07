import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getStore } from "@/lib/db";
import { AuthedShell } from "../authed-shell";

export default async function Dashboard() {
  const session = await getSession();
  if (!session) redirect("/sign-in?return=/dashboard");

  const store = await getStore();
  const apps = await store.apps.listByOwner(session.githubUserId);

  return (
    <AuthedShell githubLogin={session.githubLogin} breadcrumb="Dashboard">
      <h1>Your apps</h1>
      <p>
        Each app gets a secret. The secret authorizes your backend to use AuthAI
        Cloud as the relay; end users sign in via the React SDK.
      </p>

      <p>
        <Link href="/apps/new" className="au-btn">
          Create app
        </Link>
      </p>

      {apps.length === 0 ? (
        <div className="au-empty">
          No apps yet. Create one to get an <code>AUTH_AI_SECRET</code>.
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {apps.map((a) => (
            <Link key={a.id} href={`/apps/${a.id}`} className="au-row-link">
              <div className="au-card">
                <div className="au-card-row">
                  <div>
                    <div className="au-card-title">{a.name}</div>
                    <div className="au-card-sub">
                      <code>{a.origin}</code>
                    </div>
                    <div className="au-card-meta">{a.id}</div>
                  </div>
                  <span className="au-btn au-btn-secondary">manage</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AuthedShell>
  );
}
