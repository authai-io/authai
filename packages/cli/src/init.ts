/**
 * `authai-cloud init` — the activation flow.
 *
 * Steps:
 *   1. Prompt for app name + origin (unless provided as flags)
 *   2. GitHub device-code OAuth (no browser redirect URL needed)
 *   3. POST /admin/login → admin session JWT
 *   4. POST /admin/apps → create the app, receive AUTH_AI_KEY + verify token
 *   5. Write AUTH_AI_KEY to .env (refuse-on-existing without --force)
 *   6. Print SDK install snippet
 *
 * Errors are surfaced to stderr with a clear message; the bin script
 * sets exit 1.
 */

import { promises as fs } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

export type InitOptions = {
  name?: string;
  origin?: string;
  relayUrl?: string;
  envFile?: string;
  force?: boolean;
};

const DEFAULT_RELAY = "https://cloud.authai.dev";
const DEFAULT_ENV_FILE = ".env";

// AuthAI Cloud's public GitHub OAuth client_id. Device-code flow does not
// require a client secret — the client_id alone is the identifier on the
// GitHub side. Operators forking AuthAI Cloud register their own.
const GITHUB_OAUTH_CLIENT_ID =
  process.env.AUTH_AI_CLOUD_GITHUB_CLIENT_ID ?? "PLACEHOLDER_CLIENT_ID";

export async function runInit(opts: InitOptions): Promise<void> {
  const relayUrl = (opts.relayUrl ?? DEFAULT_RELAY).replace(/\/$/, "");
  const envFile = opts.envFile ?? DEFAULT_ENV_FILE;

  console.log(`\nAuthAI Cloud setup\n`);
  console.log(`Relay: ${relayUrl}`);
  console.log(`Env file: ${envFile}\n`);

  const rl = createInterface({ input: stdin, output: stdout });
  let appName = opts.name;
  let origin = opts.origin;
  try {
    if (!appName) appName = (await rl.question("App name (shown on consent screen): ")).trim();
    if (!origin) {
      origin = (
        await rl.question("App origin (e.g. https://myapp.com or http://localhost:3000): ")
      ).trim();
    }
  } finally {
    rl.close();
  }

  if (!appName || !origin) {
    throw new Error("name and origin are required");
  }
  if (!isValidOrigin(origin)) {
    throw new Error(`invalid origin: ${origin} (must be a full URL with scheme + host)`);
  }

  // Check env file BEFORE we burn a GitHub OAuth round-trip. If it already
  // contains AUTH_AI_KEY and --force isn't set, fail fast.
  const envExists = await fileExists(envFile);
  if (envExists) {
    const current = await fs.readFile(envFile, "utf8");
    if (/^AUTH_AI_KEY=/m.test(current) && !opts.force) {
      throw new Error(
        `${envFile} already has AUTH_AI_KEY — refusing to overwrite. Use --force to replace.`,
      );
    }
  }

  console.log(`\n1/4 Authenticating with GitHub (device code)...`);
  const githubToken = await githubDeviceCodeFlow();
  console.log(`✓ GitHub authentication complete\n`);

  console.log(`2/4 Exchanging GitHub token for AuthAI admin session...`);
  const adminLoginRes = await fetch(`${relayUrl}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ github_access_token: githubToken }),
  });
  if (!adminLoginRes.ok) {
    throw new Error(`admin login failed: ${adminLoginRes.status} ${await adminLoginRes.text()}`);
  }
  const adminLogin = (await adminLoginRes.json()) as {
    admin_jwt: string;
    user: { id: string; login: string; email?: string };
  };
  console.log(`✓ Signed in as @${adminLogin.user.login}\n`);

  console.log(`3/4 Creating app "${appName}" with origin ${origin}...`);
  const createRes = await fetch(`${relayUrl}/admin/apps`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminLogin.admin_jwt}`,
    },
    body: JSON.stringify({ name: appName, origin }),
  });
  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`create app failed: ${createRes.status} ${text}`);
  }
  const created = (await createRes.json()) as {
    app: { id: string; name: string; origin: string; origin_verified: boolean };
    api_key: string;
    verify_dns_txt: string | null;
  };
  console.log(`✓ App created: ${created.app.id}\n`);

  console.log(`4/4 Writing AUTH_AI_KEY to ${envFile}...`);
  await writeEnvKey(envFile, created.api_key, opts.force ?? false);
  console.log(`✓ ${envFile} updated\n`);

  console.log(`──────────────────────────────────────────────────────────`);
  console.log(`Done. Your app can now use Sign-in-with-ChatGPT.\n`);
  console.log(`Next steps:`);
  console.log(`  1. Install the SDK:`);
  console.log(`       npm install @authai/react`);
  console.log(`  2. Wrap your app:`);
  console.log(`       <AuthAIProvider relayUrl="${relayUrl}">`);
  console.log(`         <YourApp />`);
  console.log(`       </AuthAIProvider>`);
  console.log(`  3. Add the sign-in button:`);
  console.log(`       <SignInWithChatGPT />`);
  console.log(``);

  if (created.verify_dns_txt) {
    console.log(`──────────────────────────────────────────────────────────`);
    console.log(`Your origin needs DNS verification before lifting the`);
    console.log(`ephemeral-bucket rate limit. Add this TXT record:\n`);
    console.log(`  Host:  ${new URL(origin).hostname}`);
    console.log(`  Type:  TXT`);
    console.log(`  Value: ${created.verify_dns_txt}\n`);
    console.log(`The relay re-checks DNS every 60 seconds.`);
  } else {
    console.log(`Origin auto-verified (localhost or *.vercel.app).`);
  }
  console.log(``);
}

// ---------------------------------------------------------------------------
// GitHub device-code OAuth
// ---------------------------------------------------------------------------

async function githubDeviceCodeFlow(): Promise<string> {
  const start = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CLIENT_ID,
      scope: "read:user user:email",
    }),
  });
  if (!start.ok) {
    throw new Error(`github device-code start failed: ${start.status}`);
  }
  const device = (await start.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  };

  console.log(`\n   Open this URL in your browser:  ${device.verification_uri}`);
  console.log(`   Enter this code:                ${device.user_code}\n`);

  const deadline = Date.now() + device.expires_in * 1000;
  // Github recommends sleeping >= the suggested interval; we bump it 1s to
  // avoid race-induced slow_down responses.
  let interval = (device.interval + 1) * 1000;

  while (Date.now() < deadline) {
    await sleep(interval);
    const poll = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_OAUTH_CLIENT_ID,
        device_code: device.device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });
    if (!poll.ok) {
      throw new Error(`github poll failed: ${poll.status}`);
    }
    const data = (await poll.json()) as {
      access_token?: string;
      error?: string;
      interval?: number;
    };
    if (data.access_token) return data.access_token;
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      interval = (data.interval ?? device.interval + 5) * 1000;
      continue;
    }
    if (data.error === "expired_token") {
      throw new Error("github authorization expired — please re-run");
    }
    if (data.error === "access_denied") {
      throw new Error("github authorization was denied");
    }
    throw new Error(`github poll returned error: ${data.error ?? "unknown"}`);
  }
  throw new Error("github authorization timed out");
}

// ---------------------------------------------------------------------------
// Env file write
// ---------------------------------------------------------------------------

async function writeEnvKey(path: string, key: string, force: boolean): Promise<void> {
  let current = "";
  if (await fileExists(path)) {
    current = await fs.readFile(path, "utf8");
  }

  const line = `AUTH_AI_KEY=${key}`;
  if (/^AUTH_AI_KEY=/m.test(current)) {
    if (!force) {
      throw new Error(
        `${path} already has AUTH_AI_KEY — refusing to overwrite. Use --force to replace.`,
      );
    }
    const replaced = current.replace(/^AUTH_AI_KEY=.*$/m, line);
    await fs.writeFile(path, replaced);
    return;
  }
  const sep = current.length === 0 || current.endsWith("\n") ? "" : "\n";
  await fs.writeFile(path, `${current}${sep}${line}\n`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function isValidOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return url.pathname === "/" && url.search === "" && url.hash === "";
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
