# @authai-io/relay-store-postgres

Postgres storage driver for the [AuthAI](https://authai.io) relay. Multi-instance persistence — used by AuthAI Cloud and any horizontally-scaled self-host.

## Use

```ts
import { createRelayApp } from "@authai-io/relay";
import { createPostgresStore } from "@authai-io/relay-store-postgres";

const store = await createPostgresStore({
  connectionString: process.env.DATABASE_URL!,
});
const app = createRelayApp({ store, /* ... */ });
```

For single-instance deploys, [`@authai-io/relay-store-sqlite`](https://www.npmjs.com/package/@authai-io/relay-store-sqlite) is simpler.

See [docs/installation.md](https://github.com/authai-io/authai/blob/main/docs/installation.md) for the full self-hosting walk-through.
