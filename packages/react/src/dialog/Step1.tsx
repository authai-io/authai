import type { ProviderId } from "../auth.js";
import { LockIcon } from "./icons.js";
import { PROVIDER_META } from "./providers.js";

export type Step1Props = {
  appName: string;
  presetProvider: ProviderId | null;
  ready: boolean;
  error: string | null;
  onContinue: () => void;
  onCancel: () => void;
};

export function Step1({
  appName,
  presetProvider,
  ready,
  error,
  onContinue,
  onCancel,
}: Step1Props) {
  const providerName = presetProvider ? PROVIDER_META[presetProvider].displayName : null;
  const title = providerName
    ? <>Use {providerName} to power AI in <span className="authai-strong">{appName}</span></>
    : <>Use your AI subscription to power AI in <span className="authai-strong">{appName}</span></>;
  const body = providerName
    ? `Sign in to ${providerName} once. ${appName} will run AI requests on your ${providerName} subscription — your existing plan limits apply, no charges to ${appName}.`
    : `Sign in once. ${appName} will run AI requests on your existing AI subscription — your plan limits apply, no charges to ${appName}.`;
  const continueLabel = ready ? (presetProvider ? "Continue" : "Choose provider") : "Preparing…";

  return (
    <div className="authai-step">
      <div className="authai-icon-badge"><LockIcon /></div>
      <h2 className="authai-title">{title}</h2>
      <p className="authai-body">{body}</p>
      <p className="authai-muted">
        {appName} never sees your password. You can revoke access anytime in your provider's settings.
      </p>

      <button
        type="button"
        className="authai-button-primary"
        onClick={onContinue}
        disabled={!ready}
      >
        {continueLabel}
      </button>

      {error && <p className="authai-error">{error}</p>}

      <button type="button" className="authai-button-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
