import { serve } from "@hono/node-server";
import { createRelayApp, startBackgroundSweep } from "@authai/relay";
import { createSqliteStore } from "@authai/relay-store-sqlite";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

const jwtSecretHex = required("AUTH_AI_JWT_SECRET");
const identitySecretHex = required("AUTH_AI_IDENTITY_SECRET");
const originator = required("AUTH_AI_ORIGINATOR");
const driver = process.env.AUTH_AI_DB_DRIVER ?? "sqlite";
const dbUrl = process.env.AUTH_AI_DB_URL ?? "./relay.db";
const port = Number(process.env.AUTH_AI_PORT ?? 3000);

if (driver !== "sqlite") {
  console.error(`Unsupported AUTH_AI_DB_DRIVER: ${driver}. Only "sqlite" is implemented in v2.`);
  process.exit(1);
}

const store = createSqliteStore(dbUrl);
const jwtSecret = new Uint8Array(Buffer.from(jwtSecretHex, "hex"));
const identitySecret = Buffer.from(identitySecretHex, "hex");

let app;
try {
  // createRelayApp does the real validation (length + differ-ness). We catch
  // here to print an env-flavored message instead of a thrown library error.
  app = createRelayApp({ store, jwtSecret, identitySecret, originator });
} catch (err) {
  console.error(
    `[relay-server] invalid config: ${err instanceof Error ? err.message : String(err)}`,
  );
  console.error(
    "Use `openssl rand -hex 32` to generate fresh AUTH_AI_JWT_SECRET / AUTH_AI_IDENTITY_SECRET.",
  );
  process.exit(1);
}
startBackgroundSweep(store);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`AuthAI relay listening on http://localhost:${info.port}`);
  console.log(`  originator=${originator}  driver=${driver}  db=${dbUrl}`);
});
