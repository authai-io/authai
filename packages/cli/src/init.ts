/**
 * `authai-cloud init` — option B activation flow.
 *
 * Steps:
 *   1. Bind localhost on a random port.
 *   2. Open https://cloud.authai.dev/cli-init?port=PORT&state=STATE in the
 *      user's browser. The webapp handles GitHub OAuth + app creation.
 *   3. The webapp 302s the browser back to http://127.0.0.1:PORT/callback
 *      ?key=AUTH_AI_KEY&state=STATE&app_id=...&verify_token=...
 *   4. Listener accepts the callback, validates state, closes, writes
 *      AUTH_AI_KEY to .env, prints SDK install instructions.
 *
 * No GitHub OAuth code in the CLI. No /admin endpoints on the relay.
 * Just localhost ↔ browser ↔ webapp.
 */

import { promises as fs } from "node:fs";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { platform } from "node:os";

export type InitOptions = {
  webappUrl?: string;
  relayUrl?: string;
  envFile?: string;
  force?: boolean;
};

const DEFAULT_WEBAPP = "https://cloud.authai.dev";
const DEFAULT_RELAY = "https://relay.authai.dev";
const DEFAULT_ENV_FILE = ".env";

export async function runInit(opts: InitOptions): Promise<void> {
  const webappUrl = (opts.webappUrl ?? DEFAULT_WEBAPP).replace(/\/$/, "");
  const relayUrl = (opts.relayUrl ?? DEFAULT_RELAY).replace(/\/$/, "");
  const envFile = opts.envFile ?? DEFAULT_ENV_FILE;

  console.log(`\nAuthAI Cloud setup\n`);
  console.log(`Webapp:  ${webappUrl}`);
  console.log(`Relay:   ${relayUrl}`);
  console.log(`Env:     ${envFile}\n`);

  // Pre-flight: refuse to overwrite an existing AUTH_AI_KEY (unless --force).
  if (await fileExists(envFile)) {
    const current = await fs.readFile(envFile, "utf8");
    if (/^AUTH_AI_KEY=/m.test(current) && !opts.force) {
      throw new Error(
        `${envFile} already has AUTH_AI_KEY — refusing to overwrite. Use --force to replace.`,
      );
    }
  }

  const state = randomBytes(16).toString("hex");
  const result = await waitForBrowserCallback(state, (port) => {
    const target = new URL(`${webappUrl}/cli-init`);
    target.searchParams.set("port", String(port));
    target.searchParams.set("state", state);
    console.log(`\n1/2 Opening your browser to sign in...`);
    console.log(`     ${target.toString()}\n`);
    openInBrowser(target.toString()).catch(() => {
      // Browser auto-open is best-effort. The URL is also printed above so
      // the user can paste it manually.
    });
  });

  console.log(`✓ Received API key from webapp\n`);

  console.log(`2/2 Writing AUTH_AI_KEY to ${envFile}...`);
  await writeEnvKey(envFile, result.key, opts.force ?? false);
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

  if (result.verifyToken) {
    console.log(`──────────────────────────────────────────────────────────`);
    console.log(`Your origin needs DNS verification before the per-day cap`);
    console.log(`lifts. Publish this TXT record:\n`);
    console.log(`  Value: authai-verify=${result.verifyToken}\n`);
    console.log(`Then revisit ${webappUrl}/apps/${result.appId} to check status.`);
  } else {
    console.log(`Origin auto-verified (localhost or *.vercel.app).`);
  }
  console.log(``);
}

// ---------------------------------------------------------------------------
// Browser callback listener
// ---------------------------------------------------------------------------

type CallbackResult = {
  key: string;
  appId?: string;
  verifyToken?: string;
};

async function waitForBrowserCallback(
  expectedState: string,
  onPortBound: (port: number) => void,
): Promise<CallbackResult> {
  return new Promise<CallbackResult>((resolve, reject) => {
    let server: Server;
    const timeoutMs = 5 * 60 * 1000; // 5 min
    const timeout = setTimeout(() => {
      try { server.close(); } catch { /* noop */ }
      reject(new Error("timed out waiting for browser callback"));
    }, timeoutMs);

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!req.url) {
        res.writeHead(400).end("missing url");
        return;
      }
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        res.writeHead(404).end("not found");
        return;
      }
      const state = url.searchParams.get("state") ?? "";
      const key = url.searchParams.get("key") ?? "";
      const appId = url.searchParams.get("app_id") ?? undefined;
      const verifyToken = url.searchParams.get("verify_token") ?? undefined;
      if (state !== expectedState) {
        res.writeHead(400).end("state mismatch — refusing to use this key");
        clearTimeout(timeout);
        try { server.close(); } catch { /* noop */ }
        reject(new Error("state mismatch on browser callback"));
        return;
      }
      if (!key) {
        res.writeHead(400).end("no key in callback");
        clearTimeout(timeout);
        try { server.close(); } catch { /* noop */ }
        reject(new Error("no key in browser callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        `<!doctype html><html><body style="font-family:system-ui;padding:48px;text-align:center">` +
          `<h2>You can close this tab.</h2>` +
          `<p>Return to your terminal — the CLI has your key.</p>` +
          `</body></html>`,
      );
      clearTimeout(timeout);
      // setImmediate so the HTTP response actually flushes before close.
      setImmediate(() => {
        try { server.close(); } catch { /* noop */ }
        resolve({ key, appId, verifyToken });
      });
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    // Bind ephemeral port (port=0). 127.0.0.1 only — never bind to 0.0.0.0
    // because the callback URL leaks the key into local network shoulder-
    // surfing range.
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        reject(new Error("could not bind local port"));
        return;
      }
      onPortBound(addr.port);
    });
  });
}

// ---------------------------------------------------------------------------
// Open URL in default browser
// ---------------------------------------------------------------------------

async function openInBrowser(url: string): Promise<void> {
  const os = platform();
  let cmd: string;
  let args: string[];
  if (os === "darwin") {
    cmd = "open";
    args = [url];
  } else if (os === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.unref();
    child.on("error", reject);
    // Best-effort — once the browser is spawned we're done.
    setImmediate(resolve);
  });
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
