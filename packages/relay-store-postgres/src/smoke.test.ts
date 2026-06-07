import { describe, it, expect } from "vitest";
import type { AuthRecordStore } from "@authai/relay";
import { createPostgresStore } from "./index.js";
import type { AppStore, AuditEventStore, PostgresStore } from "./index.js";

/**
 * Type-level smoke test. Confirms the Postgres store actually implements
 * the @authai/relay AuthRecordStore interface AND exposes the cloud-only
 * AppStore / AuditEventStore sub-stores. Doesn't connect to a real DB.
 *
 * Real integration tests against a live Postgres are run separately —
 * spin up a container locally:
 *
 *   docker run -d --rm --name authai-pg \
 *     -e POSTGRES_PASSWORD=test -p 5432:5432 postgres:16
 *   AUTH_AI_POSTGRES_TEST_URL=postgres://postgres:test@localhost:5432/postgres \
 *     pnpm --filter @authai/relay-store-postgres test
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

  it("AppStore and AuditEventStore are exported", () => {
    const _appStore: AppStore | undefined = undefined;
    const _auditStore: AuditEventStore | undefined = undefined;
    expect(_appStore).toBeUndefined();
    expect(_auditStore).toBeUndefined();
  });
});
