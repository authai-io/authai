export type AuthAIColors = {
  overlay: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  foreground: string;
  foregroundMuted: string;
  primary: string;
  primaryForeground: string;
  primaryHover: string;
  accent: string;
  danger: string;
};

export type AuthAITheme = {
  mode?: "light" | "dark" | "system";
  fontFamily?: string;
  radius?: string;
  colors?: Partial<AuthAIColors>;
};

export type ResolvedTheme = {
  mode: "light" | "dark";
  fontFamily: string;
  radius: string;
  colors: AuthAIColors;
};

const LIGHT: AuthAIColors = {
  overlay: "rgba(15, 23, 42, 0.55)",
  surface: "#ffffff",
  surfaceMuted: "#f4f4f5",
  border: "#e4e4e7",
  foreground: "#0a0a0a",
  foregroundMuted: "#71717a",
  primary: "#0a0a0a",
  primaryForeground: "#ffffff",
  primaryHover: "#27272a",
  accent: "#2563eb",
  danger: "#b91c1c",
};

const DARK: AuthAIColors = {
  overlay: "rgba(0, 0, 0, 0.7)",
  surface: "#0a0a0a",
  surfaceMuted: "#1c1c1f",
  border: "#27272a",
  foreground: "#fafafa",
  foregroundMuted: "#a1a1aa",
  primary: "#fafafa",
  primaryForeground: "#0a0a0a",
  primaryHover: "#e4e4e7",
  accent: "#60a5fa",
  danger: "#f87171",
};

const DEFAULT_FONT =
  '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export function resolveTheme(
  theme: AuthAITheme | undefined,
  systemPrefersDark: boolean,
): ResolvedTheme {
  const requestedMode = theme?.mode ?? "system";
  const mode: "light" | "dark" =
    requestedMode === "dark" || (requestedMode === "system" && systemPrefersDark)
      ? "dark"
      : "light";
  const base = mode === "dark" ? DARK : LIGHT;
  return {
    mode,
    fontFamily: theme?.fontFamily ?? DEFAULT_FONT,
    radius: theme?.radius ?? "12px",
    colors: { ...base, ...(theme?.colors ?? {}) },
  };
}

export function themeToCssVars(t: ResolvedTheme): Record<string, string> {
  return {
    "--authai-overlay": t.colors.overlay,
    "--authai-surface": t.colors.surface,
    "--authai-surface-muted": t.colors.surfaceMuted,
    "--authai-border": t.colors.border,
    "--authai-foreground": t.colors.foreground,
    "--authai-foreground-muted": t.colors.foregroundMuted,
    "--authai-primary": t.colors.primary,
    "--authai-primary-foreground": t.colors.primaryForeground,
    "--authai-primary-hover": t.colors.primaryHover,
    "--authai-accent": t.colors.accent,
    "--authai-danger": t.colors.danger,
    "--authai-font": t.fontFamily,
    "--authai-radius": t.radius,
  };
}
