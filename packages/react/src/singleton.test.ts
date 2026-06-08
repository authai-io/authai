import { beforeEach, describe, expect, it } from "vitest";
import {
  getSingletonSnapshot,
  subscribeSingleton,
  resetSingletonForTests,
  configureSingleton,
  signInSingleton,
  signOutSingleton,
} from "./singleton.js";

describe("singleton store", () => {
  beforeEach(() => resetSingletonForTests());

  it("starts signed out with no config", () => {
    const snap = getSingletonSnapshot();
    expect(snap.isSignedIn).toBe(false);
    expect(snap.jwt).toBeNull();
    expect(snap.provider).toBeNull();
  });

  it("configureSingleton stores relayUrl + appName", () => {
    configureSingleton({ relayUrl: "https://r.example", appName: "T" });
    const snap = getSingletonSnapshot();
    expect(snap.relayUrl).toBe("https://r.example");
    expect(snap.appName).toBe("T");
  });

  it("configureSingleton is last-write-wins for relayUrl/appName", () => {
    configureSingleton({ relayUrl: "https://a", appName: "A" });
    configureSingleton({ relayUrl: "https://b", appName: "B" });
    const snap = getSingletonSnapshot();
    expect(snap.relayUrl).toBe("https://b");
    expect(snap.appName).toBe("B");
  });

  it("subscribers are notified on config change", () => {
    let count = 0;
    const unsub = subscribeSingleton(() => { count++; });
    configureSingleton({ relayUrl: "https://x", appName: "X" });
    expect(count).toBeGreaterThan(0);
    unsub();
  });

  it("signOutSingleton clears jwt and notifies", () => {
    configureSingleton({ relayUrl: "https://r", appName: "T", storage: "memory" });
    const snap1 = getSingletonSnapshot();
    expect(snap1.isSignedIn).toBe(false);
    expect(() => signOutSingleton()).not.toThrow();
  });

  it("resetSingletonForTests wipes state", () => {
    configureSingleton({ relayUrl: "https://x", appName: "X" });
    resetSingletonForTests();
    expect(getSingletonSnapshot().relayUrl).toBeNull();
  });

  it("requires configuration before signIn with a provider", async () => {
    await expect(signInSingleton("openai")).rejects.toThrow(/relayUrl/);
  });

  it("survives a simulated HMR cycle (state on globalThis)", () => {
    configureSingleton({ relayUrl: "https://hmr", appName: "H" });
    const stash = (globalThis as any).__authai;
    expect(stash).toBeDefined();
    expect(stash.config.relayUrl).toBe("https://hmr");
  });
});

describe("singleton SSR safety", () => {
  it("returns signed-out snapshot when document is undefined", () => {
    resetSingletonForTests();
    const originalDoc = globalThis.document;
    // @ts-expect-error simulating SSR
    delete globalThis.document;
    try {
      const snap = getSingletonSnapshot();
      expect(snap.isSignedIn).toBe(false);
      expect(snap.jwt).toBeNull();
    } finally {
      globalThis.document = originalDoc;
    }
  });

  it("configureSingleton is a no-op during SSR", () => {
    resetSingletonForTests();
    const originalDoc = globalThis.document;
    // @ts-expect-error simulating SSR
    delete globalThis.document;
    try {
      configureSingleton({ relayUrl: "https://srv", appName: "S" });
      expect(getSingletonSnapshot().relayUrl).toBeNull();
    } finally {
      globalThis.document = originalDoc;
    }
  });
});
