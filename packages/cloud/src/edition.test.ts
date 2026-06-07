import { describe, it, expect } from "vitest";
import { resolveEdition } from "./edition.js";

describe("resolveEdition", () => {
  it("defaults to community when undefined", () => {
    expect(resolveEdition(undefined)).toBe("community");
  });

  it("treats empty string as community", () => {
    expect(resolveEdition("")).toBe("community");
  });

  it("treats 'self-hosted' as community", () => {
    expect(resolveEdition("self-hosted")).toBe("community");
  });

  it("recognizes 'cloud'", () => {
    expect(resolveEdition("cloud")).toBe("cloud");
    expect(resolveEdition("CLOUD")).toBe("cloud");
    expect(resolveEdition("  cloud  ")).toBe("cloud");
  });

  it("recognizes 'community'", () => {
    expect(resolveEdition("community")).toBe("community");
  });

  it("throws on unknown values", () => {
    expect(() => resolveEdition("enterprise")).toThrow(/unknown AUTH_AI_EDITION/);
  });
});
