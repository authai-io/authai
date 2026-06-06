export type Tokens = {
  access: string;
  refresh: string;
  expires: number;
  accountId: string;
};

export type StartResponse = {
  sessionId: string;
  userCode: string;
  verificationUrl: string;
  expiresInMs: number;
  pollIntervalMs: number;
};

export type PollResponse =
  | { status: "pending" }
  | { status: "complete"; tokens: Tokens }
  | { status: "expired"; error?: string }
  | { status: "error"; error: string };

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatRequest = {
  model?: string;
  messages: ChatMessage[];
  instructions?: string;
  stream?: boolean;
};

export type ChatChunk = {
  delta: string;
  done: boolean;
  raw?: unknown;
};

export type Transport = "direct" | "relay" | "auto";
