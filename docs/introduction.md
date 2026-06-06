# Introduction

AuthAI is an open-source authentication layer that lets your users pay for AI through subscriptions they already have, so you don't pay per token.

## Why this exists

Building consumer AI products is expensive in a specific, painful way: every interaction your users have costs you money in OpenAI / Anthropic / xAI tokens. That makes it hard to:

- ship a free side project without setting a credit card on fire
- build a hackathon demo that survives launch day
- give away an educational tool
- charge a flat fee for a product whose marginal cost is variable
- experiment with prompts at the scale they actually need to be tuned

Meanwhile, **your users are already paying ChatGPT Plus, Copilot Pro, or xAI Premium** — typically $20 a month — for a subscription whose capacity sits idle when they're not in the official chat UI. That capacity has an API surface; it just isn't documented for third-party use.

AuthAI flips the cost direction. End users sign in with the subscription they already have. Your app calls models on their plan. The bill lands on their existing card, not yours.

## What it is, exactly

A self-hostable HTTP relay plus two TypeScript SDKs:

1. **The relay** runs the OAuth device-code flow against ChatGPT, Grok, or GitHub Copilot. It receives the user's OAuth tokens, encrypts them, stores the ciphertext, and hands the user's browser a session JWT. From then on, every model call the app makes goes through the relay, which decrypts the tokens just-in-time and forwards to the actual provider in OpenAI's wire format.
2. **`@authai/react`** gives you `<AuthAIProvider>`, `<SignIn>`, and `useAuthAI()`. Three components total. Drop them in, get a JWT.
3. **`@authai/server`** gives you `authai.session({ jwt, relayUrl })` → `{ user, apiKey, baseURL, openai }`. One call, you have an authenticated user and a pre-configured OpenAI client.

You connect them with a JWT that the frontend sends to your backend on every AI request, exactly the way you'd send any session token.

## What it's good for

- **Free consumer AI products.** Ship a translator, a summarizer, a code reviewer, a chatbot. Don't pay per use.
- **Side projects and prototypes.** Test AI ideas without budgeting for tokens you might not use.
- **Educational and demo tools.** Free for students, free for you.
- **Apps with unpredictable usage patterns.** Your bill stops moving with your DAU.
- **Multi-tenant AI features.** Each user brings their own AI; you ship the product on top.

## What it isn't

- **Not a bypass.** Calls still count against the user's plan limits. If they hit the ChatGPT Plus limit, that's the limit.
- **Not a SaaS we run.** AuthAI is the software. You host the relay yourself, or use someone else's.
- **Not affiliated** with OpenAI, GitHub, or xAI. The OAuth flows piggyback on the same public client IDs their official CLIs use.
- **Not a substitute for billing logic.** Use it where users genuinely have or want to bring a subscription. For freemium and metered SaaS, you still want a regular API key.

## The components

### The relay (`packages/relay`)

A Hono HTTP server, ~2 KLOC. Stateless apart from an encrypted token store. Owns:

- The OAuth device-code dance for each provider
- AES-256-GCM encryption of OAuth tokens (per-record key, key only in the user's JWT)
- HS256 JWT issuance and verification
- HMAC-SHA256 user identity hashing (with a separate secret)
- OpenAI-compatible routing: `/v1/chat/completions`, `/v1/responses`, `/v1/models`
- Translation between Chat Completions and Codex Responses when needed (ChatGPT only)
- Server-side token refresh, transparent to the client

You host it. See [installation.md](./installation.md).

### `@authai/react`

The frontend SDK. Three things:

- `<AuthAIProvider relayUrl appName theme storage>` — wraps your app once, mounts the sign-in dialog
- `<SignIn provider?>` — the button. Without `provider`, the user picks. With it, you skip the picker.
- `useAuthAI()` — returns `{ jwt, provider, isSignedIn, signIn, signOut }`

The dialog is a polished modal: explanation → provider picker → device-code display → success / error. Themed via the `theme` prop, ~6 KB compressed, no Tailwind dependency.

### `@authai/server`

The backend SDK. One thing:

```ts
const { user, apiKey, baseURL, openai } = await authai.session({
  jwt: req.headers.get("authorization")?.slice("Bearer ".length),
  relayUrl: "https://relay.authai.dev",
});
```

- `user.id` — opaque, stable, namespaced per provider (HMAC-SHA256)
- `user.provider` — `"openai" | "xai" | "github"`
- `apiKey` + `baseURL` — wire LangChain, Vercel AI SDK, custom fetch, or any OpenAI-compatible client
- `openai` — pre-configured `openai` SDK instance, available when `openai` is installed as a peer dependency
- `AuthAIUnauthorized` on missing/invalid/revoked sessions
- 60 s identity cache by default, configurable, pluggable for serverless

### Storage drivers

- `@authai/relay-store-sqlite` — single-file, zero infra. Good for self-hosted single-instance.
- Postgres driver planned, with the same `AuthRecordStore` interface.

### Provider adapters

Each lives under `packages/relay/src/providers/<id>/`. The contract is small: `requestDeviceCode`, `pollDeviceCode`, `refreshTokens`, `listModels`, `proxyChatCompletions`, optional `proxyResponses`.

| Provider             | OAuth                                | Models surface                                   |
| -------------------- | ------------------------------------ | ------------------------------------------------ |
| **ChatGPT**          | Codex CLI device code                | Chat Completions ↔ Codex Responses translation   |
| **Grok (xAI)**       | xAI device code                      | Pass-through to `api.x.ai/v1`                    |
| **GitHub Copilot**   | GitHub device code → Copilot token   | Pass-through to `api.individual.githubcopilot.com` |

Adding a new provider is mostly writing the adapter. The crypto, identity, and JWT layers are provider-agnostic.

## How it flows

```
end-user browser              builder's backend             AuthAI relay          provider
       │                              │                            │                  │
       │  ① Sign in via @authai/react │                            │                  │
       │ ──────────────────────────────────────────────────────────►                  │
       │ ◄────────────────────────────────────────────────────────  │                  │
       │  ② Session JWT                                             │                  │
       │                              │                            │                  │
       │  ③ Send JWT with request     │                            │                  │
       │ ────────────────────────────►│                            │                  │
       │                              │  ④ authai.session({ jwt }) │                  │
       │                              │ ─────────────────────────► │                  │
       │                              │ ◄─────────────────────────  │                  │
       │                              │  ⑤ { user, openai, … }     │                  │
       │                              │                            │                  │
       │                              │  ⑥ openai.chat.completions │                  │
       │                              │ ─────────────────────────► │                  │
       │                              │                            │  ⑦ Decrypt &     │
       │                              │                            │     forward      │
       │                              │                            │ ────────────────►│
       │                              │ ◄─────────────────────────  │ ◄────────────── │
       │ ◄────────────────────────────│  ⑧ Streamed response       │                  │
```

Steps ①–② happen once per user session. Steps ③–⑧ happen on every AI request. The bill lands on the end-user's plan.

## What's next

- **[Installation](./installation.md)** — self-host the relay in 5 minutes
- **[Integration](./integration.md)** — wire `@authai/react` and `@authai/server` into your app
- **[Security](./security.md)** — cryptographic primitives, storage model, full threat model
