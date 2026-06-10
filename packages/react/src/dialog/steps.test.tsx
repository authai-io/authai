import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DialogFooter } from "./Footer.js";
import { Step1 } from "./Step1.js";

const noop = () => {};

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

describe("Step1 consent screen", () => {
  it("renders the per-provider title, bullets, button, and footer (ChatGPT)", () => {
    render(
      <Step1 appName="AuthAI Demo" provider="openai" ready={true} error={null}
        onContinue={noop} onCancel={noop} />,
    );
    expect(
      screen.getByRole("heading", { name: "Use your ChatGPT plan in AuthAI Demo" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/You sign in on OpenAI's site\./)).toBeInTheDocument();
    expect(screen.getByText(/never sees your password/)).toBeInTheDocument();
    expect(screen.getByText(/No new bill\./)).toBeInTheDocument();
    expect(screen.getByText(/Disconnect anytime/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to ChatGPT" })).toBeInTheDocument();
    expectSecuredFooter();
  });

  it("adapts company strings per provider (Copilot signs in on GitHub)", () => {
    render(
      <Step1 appName="AuthAI Demo" provider="github" ready={true} error={null}
        onContinue={noop} onCancel={noop} />,
    );
    expect(screen.getByText(/You sign in on GitHub's site\./)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue to GitHub Copilot" }),
    ).toBeInTheDocument();
  });

  it("disables the button and shows Preparing… while not ready", () => {
    render(
      <Step1 appName="AuthAI Demo" provider="openai" ready={false} error={null}
        onContinue={noop} onCancel={noop} />,
    );
    const btn = screen.getByRole("button", { name: "Preparing…" });
    expect(btn).toBeDisabled();
  });
});
