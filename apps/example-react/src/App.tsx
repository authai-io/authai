import { useChatGPTAuth } from "chatgpt-connect/react";
import { SignInModal } from "./components/SignInModal.js";
import { Chat } from "./components/Chat.js";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "http://localhost:3000";

export function App() {
  const auth = useChatGPTAuth({ relayUrl: RELAY_URL, storage: "localStorage" });

  return (
    <div className="container">
      <h1>chatgpt-connect demo</h1>
      <p className="muted">Sign in with your ChatGPT subscription. Your tokens, your bill.</p>

      <div className="card" style={{ marginTop: 24 }}>
        {auth.status === "signed-in" && auth.client ? (
          <Chat client={auth.client} onSignOut={auth.signOut} />
        ) : (
          <div className="col" style={{ gap: 12 }}>
            <button onClick={auth.signIn} disabled={auth.status === "starting"}>
              {auth.status === "starting" ? "Starting…" : "Sign in with ChatGPT"}
            </button>
            {auth.status === "error" && (
              <p style={{ color: "#b91c1c", margin: 0 }}>{auth.error}</p>
            )}
            <p className="muted" style={{ margin: 0 }}>
              Relay: <code>{RELAY_URL}</code>
            </p>
          </div>
        )}
      </div>

      {auth.status === "awaiting-user" && auth.verificationUrl && auth.userCode && (
        <SignInModal
          verificationUrl={auth.verificationUrl}
          userCode={auth.userCode}
          onCancel={auth.signOut}
        />
      )}
    </div>
  );
}
