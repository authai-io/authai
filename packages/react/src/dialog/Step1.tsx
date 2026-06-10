import type { ProviderId } from "../auth.js";
import { DialogFooter } from "./Footer.js";
import { CardIcon, DisconnectIcon, KeyIcon } from "./icons.js";
import { PROVIDER_META } from "./providers.js";

export type Step1Props = {
  appName: string;
  provider: ProviderId;
  ready: boolean;
  error: string | null;
  onContinue: () => void;
  onCancel: () => void;
};

/**
 * Consent step. Shown only when the app presets a provider
 * (signIn("openai"), <SignIn provider="...">); with no preset the flow
 * enters at the picker instead. Three scannable trust bullets answer the
 * first-time user's "is this safe?": where they sign in, who pays, how
 * to undo it. Claims must stay in sync with docs/security.md.
 */
export function Step1({ appName, provider, ready, error, onContinue, onCancel }: Step1Props) {
  const meta = PROVIDER_META[provider];

  return (
    <div className="authai-step">
      <h2 className="authai-title">
        Use your {meta.displayName} plan in <span className="authai-strong">{appName}</span>
      </h2>

      <div className="authai-bullets">
        <div className="authai-bullet">
          <span className="authai-bullet-icon"><KeyIcon /></span>
          <p className="authai-bullet-text">
            <strong>You sign in on {meta.companyName}&apos;s site.</strong>{" "}
            {appName} never sees your password.
          </p>
        </div>
        <div className="authai-bullet">
          <span className="authai-bullet-icon"><CardIcon /></span>
          <p className="authai-bullet-text">
            <strong>No new bill.</strong> AI features run on the plan you already pay for.
          </p>
        </div>
        <div className="authai-bullet">
          <span className="authai-bullet-icon"><DisconnectIcon /></span>
          <p className="authai-bullet-text">
            <strong>Disconnect anytime</strong> in your {meta.companyName} settings.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="authai-button-primary"
        onClick={onContinue}
        disabled={!ready}
      >
        {ready ? `Continue to ${meta.displayName}` : "Preparing…"}
      </button>

      {error && <p className="authai-error">{error}</p>}

      <button type="button" className="authai-button-secondary" onClick={onCancel}>
        Cancel
      </button>

      <DialogFooter />
    </div>
  );
}
