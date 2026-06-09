# @authai-io/server

Backend SDK for [AuthAI](https://authai.io) — verify AuthAI session JWTs and turn them into an OpenAI-compatible client.

## Quick start

```ts
import { authai, AuthAIUnauthorized } from "@authai-io/server";

const { user, openai } = await authai.session({
  jwt: req.headers.get("authorization")?.slice("Bearer ".length),
  relayUrl: "https://relay.authai.io",
  // For AuthAI Cloud apps:
  secret: process.env.AUTH_AI_SECRET,
});

const stream = await openai.chat.completions.create({
  model: "gpt-5.4",
  messages: [{ role: "user", content: "hi" }],
  stream: true,
});
```

`openai` is present when the optional `openai` peer dep is installed. Otherwise use the returned `{ apiKey, baseURL }` with any OpenAI-compatible client (LangChain, Vercel AI SDK, custom fetch).

## API surface

- `authai.session({ jwt, relayUrl, secret? })` → `{ user, apiKey, baseURL, openai? }`
- `decodeAuthAIToken(jwt)` — local JWT decode (no signature verification)
- `AuthAIUnauthorized` — thrown on missing / invalid / revoked sessions

See [docs/integration.md](https://github.com/authai-io/authai/blob/main/docs/integration.md) for the full walk-through.
