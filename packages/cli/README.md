# authai-cloud

One-command setup for [AuthAI Cloud](https://authai.io). Opens your browser, signs you in with GitHub, registers an app, and writes `AUTH_AI_SECRET=…` to your `.env` — all without leaving the terminal.

## Use

```bash
npx authai-cloud init
```

The flow:

1. The CLI binds `127.0.0.1` on a random port and opens `https://authai.io/cli-init?port=…&state=…`.
2. The webapp handles GitHub OAuth + app creation in the browser. No GitHub OAuth code in the CLI.
3. The result page POSTs the new API key back to the local listener (POST body, never URL — so the secret never appears in browser history, server logs, or shareable URLs).
4. The CLI writes `AUTH_AI_SECRET=…` to `.env` and prints the next steps.

If `.env` already has `AUTH_AI_SECRET=`, the CLI refuses to overwrite unless you pass `--force`.

## Next steps

Once your `.env` has `AUTH_AI_SECRET`, point a backend OpenAI client at the cloud relay:

```ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: jwt, // from your @authai-io/react frontend
  baseURL: "https://relay.authai.io/v1",
  defaultHeaders: { "x-authai-secret": process.env.AUTH_AI_SECRET! },
});
```

For the frontend wiring, see [`@authai-io/react`](https://www.npmjs.com/package/@authai-io/react).

For self-hosting (no `npx authai-cloud init` needed), see [docs/installation.md](https://github.com/authai-io/authai/blob/main/docs/installation.md).
