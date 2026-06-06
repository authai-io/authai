import type { Tokens } from "./types.js";

export type TokenStorage = {
  get(): Tokens | null;
  set(tokens: Tokens): void;
  clear(): void;
};

const KEY = "chatgpt-connect:tokens";

export function localStorageAdapter(): TokenStorage {
  if (typeof globalThis.localStorage === "undefined") {
    return memoryAdapter();
  }
  return {
    get() {
      try {
        const raw = globalThis.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Tokens) : null;
      } catch {
        return null;
      }
    },
    set(tokens) {
      try {
        globalThis.localStorage.setItem(KEY, JSON.stringify(tokens));
      } catch {
        /* swallow quota errors */
      }
    },
    clear() {
      try {
        globalThis.localStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

export function memoryAdapter(): TokenStorage {
  let value: Tokens | null = null;
  return {
    get: () => value,
    set: (t) => {
      value = t;
    },
    clear: () => {
      value = null;
    },
  };
}

export function resolveStorage(
  spec: "localStorage" | "memory" | TokenStorage | undefined,
): TokenStorage {
  if (!spec || spec === "localStorage") return localStorageAdapter();
  if (spec === "memory") return memoryAdapter();
  return spec;
}
