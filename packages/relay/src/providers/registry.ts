import { createGitHubCopilotAdapter } from "./github-copilot/index.js";
import { createOpenAICodexAdapter } from "./openai-codex/index.js";
import { createXaiAdapter } from "./xai/index.js";
import type { ProviderAdapter, ProviderId } from "./types.js";

const adapters: Record<ProviderId, ProviderAdapter | null> = {
  openai: createOpenAICodexAdapter(),
  xai: createXaiAdapter(),
  github: createGitHubCopilotAdapter(),
};

export function getProvider(id: string): ProviderAdapter {
  const adapter = (adapters as Record<string, ProviderAdapter | null>)[id];
  if (!adapter) throw new Error(`Unknown or unsupported provider: ${id}`);
  return adapter;
}

export function listProviders(): ProviderAdapter[] {
  return Object.values(adapters).filter((a): a is ProviderAdapter => a !== null);
}

export function isProviderId(id: string): id is ProviderId {
  return id === "openai" || id === "xai" || id === "github";
}
