import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signInWithChatGPT } from "./auth.js";
import { createClient, type Client } from "./client.js";
import { resolveStorage, type TokenStorage } from "./storage.js";
import type { Tokens } from "./types.js";

export type UseChatGPTAuthOptions = {
  relayUrl: string;
  storage?: "localStorage" | "memory" | TokenStorage;
  transport?: "direct" | "relay" | "auto";
};

export type AuthStatus =
  | "signed-out"
  | "starting"
  | "awaiting-user"
  | "signed-in"
  | "error";

export type UseChatGPTAuth = {
  status: AuthStatus;
  verificationUrl: string | null;
  userCode: string | null;
  error: string | null;
  client: Client | null;
  tokens: Tokens | null;
  signIn: () => Promise<void>;
  signOut: () => void;
};

export function useChatGPTAuth(opts: UseChatGPTAuthOptions): UseChatGPTAuth {
  const storage = useMemo(() => resolveStorage(opts.storage), [opts.storage]);
  const [tokens, setTokens] = useState<Tokens | null>(() => storage.get());
  const [status, setStatus] = useState<AuthStatus>(() =>
    storage.get() ? "signed-in" : "signed-out",
  );
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const client = useMemo<Client | null>(() => {
    if (!tokens) return null;
    return createClient({
      tokens,
      relayUrl: opts.relayUrl,
      transport: opts.transport ?? "auto",
      onTokensRefreshed: (next) => {
        storage.set(next);
        setTokens(next);
      },
    });
  }, [tokens, opts.relayUrl, opts.transport, storage]);

  const signIn = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setVerificationUrl(null);
    setUserCode(null);
    setStatus("starting");
    try {
      const fresh = await signInWithChatGPT({
        relayUrl: opts.relayUrl,
        signal: ctrl.signal,
        onVerification: ({ verificationUrl, userCode }) => {
          setVerificationUrl(verificationUrl);
          setUserCode(userCode);
          setStatus("awaiting-user");
        },
      });
      storage.set(fresh);
      setTokens(fresh);
      setStatus("signed-in");
      setVerificationUrl(null);
      setUserCode(null);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setStatus("error");
    }
  }, [opts.relayUrl, storage]);

  const signOut = useCallback(() => {
    abortRef.current?.abort();
    storage.clear();
    setTokens(null);
    setStatus("signed-out");
    setVerificationUrl(null);
    setUserCode(null);
    setError(null);
  }, [storage]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return {
    status,
    verificationUrl,
    userCode,
    error,
    client,
    tokens,
    signIn,
    signOut,
  };
}
