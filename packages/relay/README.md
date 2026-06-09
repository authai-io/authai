# @authai-io/relay

Core relay library for [AuthAI](https://authai.io). A Hono app that:

1. Runs the OAuth device-code flow against ChatGPT, Grok, or GitHub Copilot.
2. Encrypts each user's OAuth tokens with a per-record AES-256-GCM key (the key lives only in the user's JWT).
3. Issues a session JWT to the client.
4. Speaks OpenAI's wire format on `/v1/chat/completions`, `/v1/responses`, `/v1/models`, proxying to whichever provider the user signed in with.

## Use this directly only if you're building a custom relay host

For self-hosting, use the pre-wired executable in [`apps/relay-server`](https://github.com/authai-io/authai/tree/main/apps/relay-server). For AuthAI Cloud, point your app at `https://relay.authai.io` and skip the install entirely — see https://authai.io.

## Custom host example

```ts
import { createRelayApp, startBackgroundSweep } from "@authai-io/relay";
import { createStore } from "@authai-io/relay-store-sqlite";

const store = await createStore({ url: "./relay.db" });
const app = createRelayApp({
  store,
  jwtSecret: new Uint8Array(Buffer.from(process.env.AUTH_AI_JWT_SECRET!, "hex")),
  identitySecret: Buffer.from(process.env.AUTH_AI_IDENTITY_SECRET!, "hex"),
  originator: "my-app",
});
startBackgroundSweep(store);
```

Pair with a Node runtime (`@hono/node-server`), Bun, or any Hono-compatible host.

See [docs/installation.md](https://github.com/authai-io/authai/blob/main/docs/installation.md) for the prebuilt path and [docs/security.md](https://github.com/authai-io/authai/blob/main/docs/security.md) for the threat model.
