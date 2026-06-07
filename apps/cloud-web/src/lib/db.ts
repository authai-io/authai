/**
 * Lazily-constructed Postgres store, shared across server actions and API
 * routes. Vercel will keep warm-function pools alive for the connection's
 * useful lifetime; cold starts re-construct cheaply.
 */

import { createPostgresStore, type PostgresStore } from "@authai/relay-store-postgres";
import { required } from "./env";

let cached: PostgresStore | null = null;

export async function getStore(): Promise<PostgresStore> {
  if (cached) return cached;
  const url = required("AUTH_AI_DATABASE_URL");
  cached = await createPostgresStore({ connectionString: url });
  return cached;
}
