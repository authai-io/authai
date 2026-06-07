import { describe, it, expect } from "vitest";
import {
  derivePerAppIdentitySecret,
  hashApiKey,
  generateApiKey,
  generateVerifyToken,
  normalizeOrigin,
} from "./identity.js";

describe("identity", () => {
  const master = Buffer.alloc(32, 0x42); // 32 bytes of 0x42

  it("derivePerAppIdentitySecret is deterministic for the same input", () => {
    const a = derivePerAppIdentitySecret(master, "app_one");
    const b = derivePerAppIdentitySecret(master, "app_one");
    expect(a.equals(b)).toBe(true);
    expect(a.length).toBe(32);
  });

  it("different appId yields different identitySecret", () => {
    const a = derivePerAppIdentitySecret(master, "app_one");
    const b = derivePerAppIdentitySecret(master, "app_two");
    expect(a.equals(b)).toBe(false);
  });

  it("rejects master secrets shorter than 32 bytes", () => {
    const short = Buffer.alloc(31, 0x42);
    expect(() => derivePerAppIdentitySecret(short, "app_one")).toThrow(
      /at least 32 bytes/,
    );
  });

  it("hashApiKey produces a stable hex digest", () => {
    const k = "authai_v1_some_random_key_value";
    const h1 = hashApiKey(k);
    const h2 = hashApiKey(k);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashApiKey distinguishes different keys", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });

  it("generateApiKey emits the authai_v1_ prefix and 32 bytes of entropy", () => {
    const k = generateApiKey();
    expect(k.startsWith("authai_v1_")).toBe(true);
    // base64url of 32 bytes is 43 chars (no padding)
    const body = k.slice("authai_v1_".length);
    expect(body.length).toBe(43);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generateVerifyToken returns a 32-char hex string", () => {
    const t = generateVerifyToken();
    expect(t).toMatch(/^[0-9a-f]{32}$/);
  });

  it("generateApiKey + generateVerifyToken produce distinct outputs per call", () => {
    expect(generateApiKey()).not.toBe(generateApiKey());
    expect(generateVerifyToken()).not.toBe(generateVerifyToken());
  });
});

describe("normalizeOrigin", () => {
  it("strips trailing slash", () => {
    expect(normalizeOrigin("https://example.com/")).toBe("https://example.com");
  });

  it("preserves origins without trailing slash unchanged", () => {
    expect(normalizeOrigin("https://example.com")).toBe("https://example.com");
  });

  it("lowercases the host", () => {
    expect(normalizeOrigin("HTTPS://Example.COM")).toBe("https://example.com");
  });

  it("elides default ports", () => {
    expect(normalizeOrigin("https://example.com:443/")).toBe("https://example.com");
    expect(normalizeOrigin("http://example.com:80")).toBe("http://example.com");
  });

  it("preserves non-default ports", () => {
    expect(normalizeOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeOrigin("https://api.example.com:8443/")).toBe(
      "https://api.example.com:8443",
    );
  });

  it("rejects URLs with a path beyond /", () => {
    expect(normalizeOrigin("https://example.com/x")).toBe(null);
    expect(normalizeOrigin("https://example.com/path/to/thing")).toBe(null);
  });

  it("rejects URLs with a query or fragment", () => {
    expect(normalizeOrigin("https://example.com/?x=1")).toBe(null);
    expect(normalizeOrigin("https://example.com/#frag")).toBe(null);
  });

  it("rejects non-http(s) schemes", () => {
    expect(normalizeOrigin("ftp://example.com")).toBe(null);
    expect(normalizeOrigin("javascript:alert(1)")).toBe(null);
    expect(normalizeOrigin("file:///etc/passwd")).toBe(null);
  });

  it("rejects malformed input", () => {
    expect(normalizeOrigin("not a url")).toBe(null);
    expect(normalizeOrigin("")).toBe(null);
    expect(normalizeOrigin("//example.com")).toBe(null);
  });

  it("produces the SAME value for a registration string and the browser Origin header", () => {
    // The contract that matters in production: a builder pastes
    // "https://myapp.com/" into the dashboard, the browser's Origin
    // header on subsequent /auth/start is "https://myapp.com", both
    // normalize identically.
    expect(normalizeOrigin("https://myapp.com/")).toBe(normalizeOrigin("https://myapp.com"));
  });
});
