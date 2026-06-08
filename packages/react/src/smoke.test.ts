import { describe, it, expect } from "vitest";

describe("vitest infrastructure", () => {
  it("can run a passing test", () => {
    expect(1 + 1).toBe(2);
  });

  it("has a jsdom document", () => {
    expect(typeof document).toBe("object");
    expect(document.body).toBeInstanceOf(HTMLBodyElement);
  });
});
