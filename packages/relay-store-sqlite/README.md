# @authai-io/relay-store-sqlite

SQLite storage driver for the [AuthAI](https://authai.io) relay. Single-file persistence — good for self-hosted single-instance deploys.

## Use

```ts
import { createRelayApp } from "@authai-io/relay";
import { createSqliteStore } from "@authai-io/relay-store-sqlite";

const store = createSqliteStore("./relay.db");
const app = createRelayApp({ store, /* ... */ });
```

For multi-instance / cloud deploys, use [`@authai-io/relay-store-postgres`](https://www.npmjs.com/package/@authai-io/relay-store-postgres).

See [docs/installation.md](https://github.com/authai-io/authai/blob/main/docs/installation.md) for the full self-hosting walk-through.
