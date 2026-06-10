import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DialogFooter } from "./Footer.js";

/** Shared assertion: the Secured by AuthAI footer link. */
export function expectSecuredFooter() {
  const link = screen.getByRole("link", { name: "AuthAI" });
  expect(link).toHaveAttribute("href", "https://authai.io/docs/security");
  expect(link).toHaveAttribute("target", "_blank");
}

describe("DialogFooter", () => {
  it("renders the Secured by AuthAI link to the security docs", () => {
    render(<DialogFooter />);
    expectSecuredFooter();
  });
});
