import { ShieldIcon } from "./icons.js";

const SECURITY_URL = "https://authai.io/docs/security";

/**
 * "Secured by AuthAI" trust footer, shared by every dialog step. The link
 * gives the end user a named, inspectable thing that handles the OAuth
 * handshake (the Plaid Link / Stripe pattern).
 */
export function DialogFooter() {
  return (
    <div className="authai-footer">
      <ShieldIcon />
      <span>
        Secured by{" "}
        <a className="authai-footer-link" href={SECURITY_URL} target="_blank" rel="noreferrer">
          AuthAI
        </a>
      </span>
    </div>
  );
}
