import { refreshTokens as relayRefresh } from "./auth.js";
import type {
  ChatChunk,
  ChatMessage,
  ChatRequest,
  Tokens,
  Transport,
} from "./types.js";

const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses";
const DEFAULT_MODEL = "gpt-5.4";
const REFRESH_THRESHOLD_MS = 60_000;

export type ClientOptions = {
  tokens: Tokens;
  relayUrl: string;
  transport?: Transport;
  onTokensRefreshed?: (tokens: Tokens) => void;
};

export type Client = {
  chat(req: ChatRequest): AsyncIterable<ChatChunk>;
  getTokens(): Tokens;
};

export function createClient(opts: ClientOptions): Client {
  let tokens = opts.tokens;
  let resolvedTransport: "direct" | "relay" | null =
    opts.transport === "direct" || opts.transport === "relay" ? opts.transport : null;

  async function ensureFreshTokens(): Promise<void> {
    if (tokens.expires - Date.now() > REFRESH_THRESHOLD_MS) return;
    if (!tokens.refresh) throw new Error("no refresh token; sign in again");
    tokens = await relayRefresh(opts.relayUrl, tokens.refresh);
    opts.onTokensRefreshed?.(tokens);
  }

  async function chooseTransport(): Promise<"direct" | "relay"> {
    if (resolvedTransport) return resolvedTransport;
    // In Node we always go direct (no CORS).
    if (typeof window === "undefined") {
      resolvedTransport = "direct";
      return resolvedTransport;
    }
    // In the browser, probe once with a tiny request. If it works, use direct.
    // If it CORS-fails, fall through to relay.
    try {
      const probe = await fetch(CODEX_RESPONSES_URL, {
        method: "OPTIONS",
        mode: "cors",
      });
      // OPTIONS may legitimately 404/405 even if POST works; treat network success as "probably direct ok".
      resolvedTransport = probe.ok || probe.status < 500 ? "direct" : "relay";
    } catch {
      resolvedTransport = "relay";
    }
    return resolvedTransport;
  }

  return {
    getTokens: () => tokens,
    async *chat(req) {
      await ensureFreshTokens();
      const transport = await chooseTransport();
      const body = buildResponsesBody(req);

      const url =
        transport === "direct"
          ? CODEX_RESPONSES_URL
          : join(opts.relayUrl, "/chat/completions");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (transport === "direct") {
        headers["Authorization"] = `Bearer ${tokens.access}`;
        if (tokens.accountId) headers["chatgpt-account-id"] = tokens.accountId;
        headers["OpenAI-Beta"] = "responses=experimental";
      } else {
        headers["x-access-token"] = tokens.access;
        if (tokens.accountId) headers["x-account-id"] = tokens.accountId;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(`codex responses: ${res.status} ${text}`);
      }

      yield* parseResponsesSseStream(res.body);
    },
  };
}

function buildResponsesBody(req: ChatRequest): unknown {
  const input = toResponsesInput(req.messages);
  return {
    model: req.model ?? DEFAULT_MODEL,
    store: false,
    stream: true,
    instructions: req.instructions ?? "You are a helpful assistant.",
    input,
  };
}

function toResponsesInput(messages: ChatMessage[]): unknown[] {
  return messages.map((m) => ({
    role: m.role,
    content: [
      {
        type: m.role === "assistant" ? "output_text" : "input_text",
        text: m.content,
      },
    ],
  }));
}

async function* parseResponsesSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = rawEvent
        .split("\n")
        .find((l) => l.startsWith("data:"))
        ?.slice(5)
        .trim();
      if (!dataLine || dataLine === "[DONE]") continue;
      try {
        const event = JSON.parse(dataLine) as { type?: string; delta?: string };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          yield { delta: event.delta, done: false, raw: event };
        } else if (event.type === "response.completed") {
          yield { delta: "", done: true, raw: event };
        }
      } catch {
        /* ignore non-JSON keepalives */
      }
    }
  }
  yield { delta: "", done: true };
}

function join(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}
