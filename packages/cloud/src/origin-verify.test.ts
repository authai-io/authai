import { describe, it, expect } from "vitest";
import {
  isAutoAllowedOrigin,
  createOriginVerifier,
} from "./origin-verify.js";

describe("isAutoAllowedOrigin", () => {
  it("allows localhost", () => {
    expect(isAutoAllowedOrigin("http://localhost:3000")).toBe(true);
    expect(isAutoAllowedOrigin("http://localhost")).toBe(true);
  });

  it("allows 127.0.0.1", () => {
    expect(isAutoAllowedOrigin("http://127.0.0.1:5173")).toBe(true);
  });

  it("allows any *.vercel.app preview", () => {
    expect(isAutoAllowedOrigin("https://my-app.vercel.app")).toBe(true);
    expect(isAutoAllowedOrigin("https://abc-def-123.vercel.app")).toBe(true);
  });

  it("rejects production-shaped origins", () => {
    expect(isAutoAllowedOrigin("https://example.com")).toBe(false);
    expect(isAutoAllowedOrigin("https://api.bank.com")).toBe(false);
  });

  it("rejects garbage", () => {
    expect(isAutoAllowedOrigin("not a url")).toBe(false);
    expect(isAutoAllowedOrigin("")).toBe(false);
  });
});

describe("createOriginVerifier", () => {
  it("verifies when the TXT record matches authai-verify=<token>", async () => {
    const verifier = createOriginVerifier({
      resolver: async (host) => {
        if (host === "example.com") {
          return [["authai-verify=abc123"]];
        }
        return [];
      },
    });
    const result = await verifier.verify("https://example.com", "abc123");
    expect(result.verified).toBe(true);
  });

  it("rejects when the token doesn't match", async () => {
    const verifier = createOriginVerifier({
      resolver: async () => [["authai-verify=wrong-token"]],
    });
    const result = await verifier.verify("https://example.com", "abc123");
    expect(result.verified).toBe(false);
    expect(result.reason).toContain("not found");
  });

  it("returns false on DNS errors (origin remains unverified)", async () => {
    const verifier = createOriginVerifier({
      resolver: async () => {
        throw new Error("ENOTFOUND");
      },
    });
    const result = await verifier.verify("https://example.com", "abc123");
    expect(result.verified).toBe(false);
    expect(result.reason).toContain("dns error");
  });

  it("caches positive verifications", async () => {
    let calls = 0;
    const verifier = createOriginVerifier({
      resolver: async () => {
        calls++;
        return [["authai-verify=tok"]];
      },
    });
    await verifier.verify("https://example.com", "tok");
    await verifier.verify("https://example.com", "tok");
    expect(calls).toBe(1);
  });

  it("handles invalid origins gracefully", async () => {
    const verifier = createOriginVerifier({
      resolver: async () => [],
    });
    const result = await verifier.verify("not a url", "anything");
    expect(result.verified).toBe(false);
    expect(result.reason).toBe("invalid origin");
  });
});
