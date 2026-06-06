import type { ProviderId } from "../auth.js";
import { GithubLogo, OpenAILogo, XaiLogo } from "./icons.js";

export type ProviderMeta = {
  id: ProviderId;
  displayName: string;
  subtitle: string;
  Logo: () => JSX.Element;
  available: boolean;
};

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  openai: {
    id: "openai",
    displayName: "ChatGPT",
    subtitle: "Use your ChatGPT subscription",
    Logo: OpenAILogo,
    available: true,
  },
  xai: {
    id: "xai",
    displayName: "Grok",
    subtitle: "Use your xAI subscription",
    Logo: XaiLogo,
    available: true,
  },
  github: {
    id: "github",
    displayName: "GitHub Copilot",
    subtitle: "Use your Copilot subscription",
    Logo: GithubLogo,
    available: true,
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["openai", "xai", "github"];
