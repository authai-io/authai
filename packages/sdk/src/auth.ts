import type { PollResponse, StartResponse, Tokens } from "./types.js";

export type SignInOptions = {
  relayUrl: string;
  onVerification: (info: {
    verificationUrl: string;
    userCode: string;
    expiresInMs: number;
  }) => void | Promise<void>;
  signal?: AbortSignal;
};

export async function signInWithChatGPT(options: SignInOptions): Promise<Tokens> {
  const start = await postJson<StartResponse>(
    join(options.relayUrl, "/auth/start"),
    undefined,
    options.signal,
  );

  await options.onVerification({
    verificationUrl: start.verificationUrl,
    userCode: start.userCode,
    expiresInMs: start.expiresInMs,
  });

  const deadline = Date.now() + start.expiresInMs;
  const interval = Math.max(1000, start.pollIntervalMs);

  while (Date.now() < deadline) {
    if (options.signal?.aborted) {
      throw new DOMException("aborted", "AbortError");
    }
    await sleep(interval, options.signal);

    const poll = await getJson<PollResponse>(
      join(options.relayUrl, `/auth/poll/${start.sessionId}`),
      options.signal,
    );

    if (poll.status === "complete") return poll.tokens;
    if (poll.status === "error") throw new Error(poll.error || "auth error");
    if (poll.status === "expired") throw new Error("authorization expired");
  }
  throw new Error("authorization timed out");
}

export async function refreshTokens(
  relayUrl: string,
  refresh: string,
  signal?: AbortSignal,
): Promise<Tokens> {
  const res = await postJson<{ tokens: Tokens }>(
    join(relayUrl, "/auth/refresh"),
    { refresh_token: refresh },
    signal,
  );
  return res.tokens;
}

async function postJson<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`relay ${url}: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`relay ${url}: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) {
      const onAbort = () => {
        clearTimeout(t);
        reject(new DOMException("aborted", "AbortError"));
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function join(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}
