import Link from "next/link";
import { redirect } from "next/navigation";
import { ulid } from "ulid";
import { getSession } from "@/lib/session";
import { getStore } from "@/lib/db";

export default async function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const { id } = await params;
  const store = await getStore();
  const app = await store.apps.getById(id);
  if (!app || app.ownerGithubId !== session.githubUserId) redirect("/dashboard");

  async function revoke(_: FormData) {
    "use server";
    const session = await getSession();
    if (!session) redirect("/sign-in");
    const store = await getStore();
    const existing = await store.apps.getById(id);
    if (!existing || existing.ownerGithubId !== session.githubUserId) {
      redirect("/dashboard");
    }
    const now = Date.now();
    if (!existing.revokedAt) {
      await store.apps.revoke(id, now);
      await store.audit.write({
        id: ulid(),
        ts: now,
        actorType: "owner",
        actorId: session.githubUserId,
        appId: id,
        eventType: "app_kill_switched",
        payload: { initiated_by: "owner", reason: "revoke via dashboard" },
      });
    }
    redirect("/dashboard");
  }

  const recentEvents = await store.audit.listByApp(id, 20);

  return (
    <>
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
        <h1>{app.name}</h1>
        <p className="muted">App ID: <code>{app.id}</code></p>

        <h2>Origin</h2>
        <p>
          <code>{app.origin}</code>
        </p>
        <p className="field-hint">
          The browser must send this exact value in the
          <code> Origin </code> header when calling{" "}
          <code>/auth/start</code>. Builders typically don't need to think
          about this — the React SDK sets it automatically.
        </p>

        <h2>Limits</h2>
        <table>
          <tbody>
            <tr>
              <th>Per-minute</th>
              <td>{app.rateLimitPerMin}</td>
            </tr>
            <tr>
              <th>Per day</th>
              <td>{app.dailyRequestCap}</td>
            </tr>
          </tbody>
        </table>

        <h2>Recent events</h2>
        {recentEvents.length === 0 ? (
          <p className="muted">No events yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((e) => (
                <tr key={e.id}>
                  <td className="muted">
                    {new Date(e.ts).toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td>
                    {e.actorType}:{e.actorId.slice(0, 8)}
                  </td>
                  <td>
                    <code>{e.eventType}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>Danger zone</h2>
        <form action={revoke}>
          <p>
            Revoke this app. All existing user JWTs return 401 immediately and
            new sign-ins are blocked.
          </p>
          <button className="btn btn-danger" type="submit">
            Revoke app
          </button>
        </form>
      </main>
    </>
  );
}

