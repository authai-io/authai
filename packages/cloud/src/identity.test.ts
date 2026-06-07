import { describe, it, expect } from "vitest";
import {
  derivePerAppIdentitySecret,
  hashApiKey,
  generateApiKey,
  generateVerifyToken,
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
