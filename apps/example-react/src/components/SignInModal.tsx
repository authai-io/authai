type Props = {
  verificationUrl: string;
  userCode: string;
  onCancel: () => void;
};

export function SignInModal({ verificationUrl, userCode, onCancel }: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Authorize with ChatGPT</h2>
        <p className="muted">
          1. Open this URL in any browser:
          <br />
          <a href={verificationUrl} target="_blank" rel="noreferrer">
            {verificationUrl}
          </a>
        </p>
        <p className="muted">2. Enter this code:</p>
        <div className="code">{userCode}</div>
        <p className="muted" style={{ marginTop: 16 }}>
          Waiting for you to finish. This dialog will close automatically.
        </p>
        <button className="secondary" onClick={onCancel} style={{ marginTop: 12 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
