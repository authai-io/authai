# Lovable

Add AuthAI to a [Lovable](https://lovable.dev) app so end-users sign in with their own ChatGPT / Grok / Copilot subscription and your project calls AI models on their behalf — your project pays nothing for inference.

This guide is Lovable-specific. For the general SDK reference, see [integration.md](./integration.md).

## The shortcut: ask Lovable's AI

AuthAI ships a canonical instruction file at `https://authai.io/llms.txt` that codegen agents (Lovable, v0, Bolt, Cursor) follow verbatim. In most cases you don't need this guide — you can just paste this into Lovable's chat:

> Add AuthAI sign-in. Read `https://authai.io/llms.txt` first, then follow the instructions in that file.

Lovable's agent will fetch `/llms.txt`, branch on whether your project has Supabase connected, generate the right snippet, and then tell you which AuthAI provisioning URL to open in another tab. The rest of this guide is for cases where you want to do it by hand or understand what the agent is doing.

## Two paths

Lovable projects come in two flavors. Pick the one that matches yours.

| Your project has...                    | Use this path           | Why                                                                                                                    |
| -------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Supabase connected**                 | Production (edge-function proxy) | A Supabase Edge Function holds your `AUTH_AI_SECRET`. The browser only sees a short-lived user JWT.            |
| **No Supabase** (pure frontend) | Prototype (publishable-key)      | No backend to hold a secret. The browser calls the relay directly, gated by an origin-pinned publishable key. |

> **Default to the production path.** The prototype path is an explicit escape hatch for sandboxes and quick demos. It exposes the AuthAI session JWT in the browser — XSS in your Lovable app can read it and drive the user's AI subscription until expiry (14 days) or sign-out. Lovable + Supabase is the recommended setup.

## Path A — Lovable + Supabase (production)

### 1. Provision an AuthAI app

Open https://authai.io/apps/new in a new tab. Sign in with GitHub, enter:

- **Origin** — your Lovable preview URL (e.g. `https://your-project.lovable.app`) or your custom domain
- **Name** — anything; appears in the user-facing sign-in dialog
- **Generate edge-function template** — check this; you'll deploy the generated Supabase function as your proxy

You'll get back two things:

- `AUTH_AI_SECRET` (starts with `authai_sk_`) — copy it; you'll set it as a Supabase secret
- A ready-to-paste Supabase Edge Function (TypeScript)

The secret is shown only once. Treat it like a database password.

### 2. Deploy the edge function

In your Lovable project, ask the AI:

> Create a new Supabase Edge Function called `chat`. Paste the code AuthAI gave me.

Then, from the Supabase dashboard for that project, set the secret:

```bash
supabase secrets set AUTH_AI_SECRET=authai_sk_…
```

(Or via the Supabase UI: Settings → Edge Functions → Add new secret.)

### 3. Add the frontend

Ask Lovable to add this to your project:

```tsx
import { configureAuthAI, SignIn, useAuthAI } from "@authai/react";

configureAuthAI({
  relayUrl: "https://relay.authai.io",
  appName: "My Lovable App",
});

function App() {
  const { jwt, isSignedIn, signOut } = useAuthAI();
  if (!isSignedIn) return <SignIn>Sign in with your AI subscription</SignIn>;

  async function ask(prompt: string) {
    const res = await fetch(
      "https://<your-project>.supabase.co/functions/v1/chat",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );
    return res.text();
  }

  // …render UI, call ask() on submit
}
```

The `<SignIn>` component auto-mounts the sign-in dialog via a body portal. No `<AuthAIProvider>` wrapper needed — the singleton path works for client-only React apps.

### 4. Run it

Hit your Lovable preview. Click sign-in, complete the device-code flow with ChatGPT / Grok / Copilot, then make a request. The edge function forwards to the relay; the relay decrypts the user's OAuth tokens and calls the AI provider. Your Supabase project pays nothing for inference.

## Path B — Lovable without Supabase (prototype)

If you haven't connected Supabase yet (or are just kicking the tires), use the publishable-key path. **No edge function**, no secret, no backend — but the user JWT lives in the browser.

### 1. Provision a publishable-key app

Open this URL — replace `<ORIGIN>` with your Lovable preview URL (e.g. `https://your-project.lovable.app`):

```
https://authai.io/apps/new?type=publishable&origin=<ORIGIN>&name=My%20App
```

Sign in with GitHub, type the hostname in the confirmation field, click Create. You'll get back an `appId` that looks like `authai_pk_…`.

If you'll also run locally, add `http://localhost:5173` (or whatever Vite port Lovable uses) as a second origin from the dashboard at `https://authai.io/apps/[id]` after creating.

### 2. Add the frontend

```tsx
import { configureAuthAI, SignIn, useAuthAI } from "@authai/react";
import OpenAI from "openai";
import { useMemo } from "react";

configureAuthAI({
  relayUrl: "https://relay.authai.io",
  appName: "My Lovable App",
  appId: "authai_pk_…", // ← paste your publishable key here
});

function App() {
  const { jwt, appId, isSignedIn } = useAuthAI();
  if (!isSignedIn) return <SignIn>Sign in with your AI subscription</SignIn>;

  const openai = useMemo(() => new OpenAI({
    apiKey: jwt!,
    baseURL: "https://relay.authai.io/v1",
    defaultHeaders: { "x-authai-publishable-key": appId! },
    dangerouslyAllowBrowser: true,
  }), [jwt, appId]);

  async function ask(prompt: string) {
    const res = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [{ role: "user", content: prompt }],
    });
    return res.choices[0]?.message?.content;
  }
}
```

The relay checks the `x-authai-publishable-key` header against the origin of the request. A request from any origin you didn't allow-list gets a 401, so even if your key leaks, an attacker can't use it from their own site.

### 3. Move to production later

When you connect Supabase to your Lovable project, switch to Path A. The same AuthAI account works — just create a new "secret" app (not publishable) at `https://authai.io/apps/new`, deploy the generated edge function, and remove the `appId` from `configureAuthAI()`. Users stay signed in; their sessions don't reset.

## Adding multiple origins

Lovable projects typically run at three URLs:

- `http://localhost:5173` — local dev (if you clone the project)
- `https://<project>.lovable.app` — Lovable preview
- `https://your-custom-domain.com` — production

You only need **one AuthAI app**. Add additional origins from the per-app dashboard at `https://authai.io/apps/[id]` → "Origins" section. Each origin you add gets allow-listed for CORS preflight and tenant resolution.

## Common errors

| Symptom                                                  | Cause                                                                                                  | Fix                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sign-in dialog opens but redirects to a 404              | Your preview origin isn't in the app's allow-list                                                      | Add it from `https://authai.io/apps/[id]` → Origins                                                                                                          |
| Every `/v1/*` call returns `401 unauthorized`            | Missing or mismatched `appId` / publishable-key header                                                 | Re-check the value in `configureAuthAI({ appId: ... })`; rotate from the dashboard if you suspect leak                                                       |
| 401 only from the deployed origin, works locally         | Production origin not added, or you provisioned the app with a `lovable.app` preview URL only          | Add the production origin                                                                                                                                    |
| CORS preflight fails on the edge function                | Edge function's `Access-Control-Allow-Origin` doesn't match your Lovable origin                        | The generated template pins it to the origin you provisioned with. If you change origins, regenerate the template or edit the constant at the top of the function |
| AI says "I made up an `appId`"                           | The codegen tool hallucinated a value                                                                  | Always provision via `https://authai.io/apps/new`. Generated/placeholder values are rejected at the relay.                                                   |

## Security: when to switch from prototype to production

The prototype path is great for kicking the tires, but switch to Path A (Supabase edge function) before you:

- Share the project link with strangers — a malicious user can XSS your app and exfiltrate other users' JWTs
- Connect a custom domain — you're now serving real users
- Add any user-generated content (comments, markdown rendering, image embeds) — these are XSS surfaces

The cost of switching is one edge-function deploy. The benefit is that your `AUTH_AI_SECRET` lives in Supabase secrets, never in the browser bundle, and a compromise of your frontend can't drive user subscriptions.

See [security.md](./security.md) for the full threat model.

## References

- Canonical AI-codegen instructions: https://authai.io/llms.txt
- Provision an app: https://authai.io/apps/new
- Per-app dashboard (origins, keys, rotation): `https://authai.io/apps/[id]`
- Full SDK reference: [integration.md](./integration.md)
- Self-host the relay: [installation.md](./installation.md)
