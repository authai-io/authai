import { describe, it, expect, beforeEach } from "vitest";
import type { AuthRecordStore } from "@authai-io/relay";
import { createPostgresStore, createStore } from "./index.js";
import type { AppStore, AppAdminStore, AuditEventStore, PostgresStore } from "./index.js";

/**
 * Type-level smoke test. Confirms the Postgres store actually implements
 * the @authai-io/relay AuthRecordStore interface AND exposes the cloud-only
 * AppAdminStore / AuditEventStore sub-stores. Doesn't connect to a real DB.
 *
 * Real integration tests against a live Postgres are run separately —
 * spin up a container locally:
 *
 *   docker run -d --rm --name authai-pg \
 *     -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16
 *   AUTHAI_TEST_POSTGRES_URL=postgres://postgres:test@localhost:5432/postgres \
 *     pnpm --filter @authai-io/relay-store-postgres test
 *
 * Those are deliberately not run in the default test suite because they
 * need a side dependency the rest of the repo doesn't.
 */
describe("PostgresStore type compatibility", () => {
  it("createPostgresStore returns AuthRecordStore + apps + audit", () => {
    // Static type assertion via constructed signature — we never call it
    // here because the assignment alone exercises the type relationship.
    type _Returned = ReturnType<typeof createPostgresStore>;
    const fn: (url: string) => Promise<PostgresStore> = (url) =>
      createPostgresStore({ connectionString: url, skipSchema: true });
    expect(typeof fn).toBe("function");
  });

  it("PostgresStore is assignable to AuthRecordStore", () => {
    // Same kind of type-only check: would not compile if the assignment
    // weren't valid. The runtime body never executes the lambda.
    const check = (s: PostgresStore): AuthRecordStore => s;
    expect(typeof check).toBe("function");
  });

  it("AppStore, AppAdminStore and AuditEventStore are exported", () => {
    const _appStore: AppStore | undefined = undefined;
    const _appAdminStore: AppAdminStore | undefined = undefined;
    const _auditStore: AuditEventStore | undefined = undefined;
    expect(_appStore).toBeUndefined();
    expect(_appAdminStore).toBeUndefined();
    expect(_auditStore).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Integration tests — skip unless AUTHAI_TEST_POSTGRES_URL is set
// ---------------------------------------------------------------------------

const TEST_DB_URL = process.env.AUTHAI_TEST_POSTGRES_URL;
const describeIfPg = TEST_DB_URL ? describe : describe.skip;

describeIfPg("Postgres store — new credential/origin columns", () => {
  let store: AppStore & { _pool: import("pg").Pool };

  beforeEach(async () => {
    store = await createStore({ url: TEST_DB_URL! });
    await store._pool.query(
      "TRUNCATE TABLE app_publishable_keys, app_origins, audit_events, apps RESTART IDENTITY CASCADE",
    );
  });

  it("apps table has credential_type column (defaults to 'secret')", async () => {
    const created = await store.apps.create({
      id: "app_1",
      apiKeyHash: "h1",
      origin: "https://example.com",
      name: "Test",
      ownerGithubId: "ghid",
      originVerifyToken: "t",
    });
    expect(created.credentialType).toBe("secret");
    expect(created.browserDirectEnabled).toBe(true);
  });

  it("apps table accepts credential_type='publishable'", async () => {
    const created = await store.apps.create({
      id: "app_2",
      apiKeyHash: "h2",
      origin: "https://example2.com",
      name: "Test",
      ownerGithubId: "ghid",
      originVerifyToken: "t",
      credentialType: "publishable",
    });
    expect(created.credentialType).toBe("publishable");
  });
});

describeIfPg("Postgres store — app_origins table", () => {
  let store: AppStore & { _pool: import("pg").Pool };

  beforeEach(async () => {
    store = await createStore({ url: TEST_DB_URL! });
    await store._pool.query(
      "TRUNCATE TABLE app_publishable_keys, app_origins, audit_events, apps RESTART IDENTITY CASCADE",
    );
  });

  it("addOrigin inserts a row and listForApp returns it", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t",
    });
    const origin = await store.origins.add({
      appId: "app_1",
      origin: "https://b.example.com",
      tier: "production",
    });
    expect(origin.id).toMatch(/^.{10,}$/);
    expect(origin.status).toBe("active");
    const list = await store.origins.listForApp("app_1");
    expect(list.find((o) => o.origin === "https://b.example.com")).toBeDefined();
  });

  it("getAppByActiveOrigin returns the app for an active matching origin", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t",
      credentialType: "publishable",
    });
    await store.origins.add({
      appId: "app_1",
      origin: "https://b.com",
      tier: "production",
    });
    const app = await store.origins.getAppByActiveOrigin("https://b.com");
    expect(app?.id).toBe("app_1");
  });

  it("getAppByActiveOrigin returns null for disabled origin", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t",
      credentialType: "publishable",
    });
    const origin = await store.origins.add({
      appId: "app_1",
      origin: "https://b.com",
      tier: "production",
    });
    await store.origins.setStatus(origin.id, "disabled");
    const app = await store.origins.getAppByActiveOrigin("https://b.com");
    expect(app).toBeNull();
  });

  it("origin global uniqueness — adding the same origin to a second app fails", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h1",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t1",
    });
    await store.apps.create({
      id: "app_2",
      apiKeyHash: "h2",
      origin: "https://x.com",
      name: "n2",
      ownerGithubId: "g",
      originVerifyToken: "t2",
    });
    await store.origins.add({
      appId: "app_1",
      origin: "https://shared.com",
      tier: "production",
    });
    await expect(
      store.origins.add({
        appId: "app_2",
        origin: "https://shared.com",
        tier: "production",
      }),
    ).rejects.toThrow();
  });
});

describeIfPg("Postgres store — app_publishable_keys table", () => {
  let store: AppStore & { _pool: import("pg").Pool };

  beforeEach(async () => {
    store = await createStore({ url: TEST_DB_URL! });
    await store._pool.query(
      "TRUNCATE TABLE app_publishable_keys, app_origins, audit_events, apps RESTART IDENTITY CASCADE",
    );
  });

  it("createKey inserts a row and listForApp returns it", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t",
      credentialType: "publishable",
    });
    const created = await store.publishableKeys.create({
      appId: "app_1",
      keyHash: "deadbeef",
      label: "initial",
      createdBy: "ghid",
    });
    expect(created.status).toBe("active");
    expect(created.label).toBe("initial");
    const list = await store.publishableKeys.listForApp("app_1");
    expect(list).toHaveLength(1);
  });

  it("getActiveByHash returns the app for an active publishable-key hash", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t",
      credentialType: "publishable",
    });
    await store.publishableKeys.create({
      appId: "app_1",
      keyHash: "deadbeef",
      createdBy: "ghid",
    });
    const result = await store.publishableKeys.getActiveByHash("deadbeef");
    expect(result?.app.id).toBe("app_1");
    expect(result?.key.keyHash).toBe("deadbeef");
  });

  it("revoke flips status and getActiveByHash returns null", async () => {
    await store.apps.create({
      id: "app_1",
      apiKeyHash: "h",
      origin: "https://a.com",
      name: "n",
      ownerGithubId: "g",
      originVerifyToken: "t",
      credentialType: "publishable",
    });
    const key = await store.publishableKeys.create({
      appId: "app_1",
      keyHash: "deadbeef",
      createdBy: "ghid",
    });
    await store.publishableKeys.revoke(key.id, "ghid");
    const result = await store.publishableKeys.getActiveByHash("deadbeef");
    expect(result).toBeNull();
  });
});
