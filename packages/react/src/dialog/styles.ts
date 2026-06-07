const STYLE_ID = "authai-styles";

const CSS = `
.authai-overlay {
  position: fixed;
  inset: 0;
  background: var(--authai-overlay);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  font-family: var(--authai-font);
  color: var(--authai-foreground);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.authai-overlay[data-state="open"] { animation: authai-fade-in 220ms ease forwards; }
.authai-overlay[data-state="closed"] { animation: authai-fade-out 180ms ease forwards; }

.authai-card {
  position: relative;
  background: var(--authai-surface);
  color: var(--authai-foreground);
  border: 1px solid var(--authai-border);
  border-radius: var(--authai-radius);
  padding: 32px;
  width: 100%;
  max-width: 440px;
  margin: 16px;
  box-shadow:
    0 24px 48px -12px rgba(0, 0, 0, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset;
}
.authai-overlay[data-state="open"] .authai-card { animation: authai-scale-in 260ms cubic-bezier(.16,1,.3,1) forwards; }
.authai-overlay[data-state="closed"] .authai-card { animation: authai-scale-out 180ms ease forwards; }

.authai-step {
  display: flex;
  flex-direction: column;
  gap: 18px;
  animation: authai-step-in 180ms cubic-bezier(.16,1,.3,1);
}

.authai-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--authai-surface-muted);
  color: var(--authai-foreground);
  margin: 0 auto 4px;
}
.authai-icon-badge-error {
  background: color-mix(in srgb, var(--authai-danger) 14%, var(--authai-surface));
  color: var(--authai-danger);
}

.authai-title {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 0;
  text-align: center;
  color: var(--authai-foreground);
}
.authai-body {
  font-size: 14px;
  line-height: 1.55;
  color: var(--authai-foreground);
  margin: 0;
  text-align: center;
}
.authai-muted {
  color: var(--authai-foreground-muted);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
  text-align: center;
}
.authai-strong { font-weight: 600; }

.authai-button-primary {
  background: var(--authai-primary);
  color: var(--authai-primary-foreground);
  border: 0;
  padding: 12px 16px;
  border-radius: calc(var(--authai-radius) - 2px);
  font-family: inherit;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 150ms ease, transform 120ms ease;
}
.authai-button-primary:hover:not(:disabled) { background: var(--authai-primary-hover); }
.authai-button-primary:active:not(:disabled) { transform: scale(0.98); }
.authai-button-primary:disabled { opacity: 0.55; cursor: default; }
.authai-button-primary:focus-visible { outline: 2px solid var(--authai-accent); outline-offset: 2px; }

.authai-button-secondary {
  background: transparent;
  color: var(--authai-foreground-muted);
  border: 0;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  align-self: center;
  border-radius: 6px;
  transition: color 150ms;
}
.authai-button-secondary:hover { color: var(--authai-foreground); }
.authai-button-secondary:focus-visible { outline: 2px solid var(--authai-accent); outline-offset: 2px; }

.authai-code-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.authai-code-block {
  flex: 1;
  background: var(--authai-surface-muted);
  border: 1px solid var(--authai-border);
  border-radius: calc(var(--authai-radius) - 2px);
  padding: 18px 20px;
  font-family: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 4px;
  text-align: center;
  user-select: all;
  color: var(--authai-foreground);
}
.authai-copy-button {
  background: var(--authai-surface-muted);
  border: 1px solid var(--authai-border);
  border-radius: calc(var(--authai-radius) - 2px);
  padding: 0 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--authai-foreground-muted);
  transition: color 150ms, background 150ms;
  flex-shrink: 0;
  width: 44px;
}
.authai-copy-button:hover { color: var(--authai-foreground); background: var(--authai-border); }
.authai-copy-button:focus-visible { outline: 2px solid var(--authai-accent); outline-offset: 2px; }

.authai-code-label {
  font-size: 12px;
  color: var(--authai-foreground-muted);
  text-align: center;
  margin-top: -10px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.authai-status {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  color: var(--authai-foreground-muted);
  font-size: 13px;
  padding: 4px 0;
}
.authai-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--authai-border);
  border-top-color: var(--authai-foreground);
  animation: authai-spin 900ms linear infinite;
}

.authai-error {
  color: var(--authai-danger);
  font-size: 13px;
  text-align: center;
  margin: 0;
}

.authai-toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--authai-foreground);
  color: var(--authai-surface);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,.4);
  animation: authai-toast-in 200ms cubic-bezier(.16,1,.3,1);
}

@keyframes authai-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes authai-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes authai-scale-in {
  from { opacity: 0; transform: scale(.96) translateY(4px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes authai-scale-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(.97); }
}
@keyframes authai-step-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes authai-spin { to { transform: rotate(360deg); } }
@keyframes authai-toast-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.authai-provider-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.authai-provider-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: var(--authai-surface);
  border: 1px solid var(--authai-border);
  border-radius: calc(var(--authai-radius) - 2px);
  font-family: inherit;
  font-size: 14px;
  color: var(--authai-foreground);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 150ms, background 150ms, transform 100ms;
}
.authai-provider-card:hover:not(:disabled) {
  border-color: var(--authai-foreground-muted);
  background: var(--authai-surface-muted);
}
.authai-provider-card:active:not(:disabled) { transform: scale(0.99); }
.authai-provider-card:disabled { opacity: 0.4; cursor: default; }
.authai-provider-card:focus-visible {
  outline: 2px solid var(--authai-accent);
  outline-offset: 2px;
}
.authai-provider-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: var(--authai-surface-muted);
  color: var(--authai-foreground);
  flex-shrink: 0;
}
.authai-provider-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
  min-width: 0;
}
.authai-provider-name {
  font-weight: 600;
  font-size: 14px;
}
.authai-provider-subtitle {
  font-size: 12px;
  color: var(--authai-foreground-muted);
}
.authai-provider-chevron {
  color: var(--authai-foreground-muted);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

@media (max-width: 480px) {
  .authai-card { padding: 24px; }
  .authai-code-block { font-size: 22px; letter-spacing: 3px; padding: 16px; }
  .authai-title { font-size: 18px; }
}
`;

export function ensureStylesInjected(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const tag = document.createElement("style");
  tag.id = STYLE_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}
