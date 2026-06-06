import { AuthAIProvider, SignIn, useAuthAI } from "@authai/react";
import { Chat } from "./components/Chat.js";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "http://localhost:3000";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

export function App() {
  return (
    <AuthAIProvider
      relayUrl={RELAY_URL}
      appName="AuthAI Demo"
      storage="localStorage"
      theme={{
        mode: "light",
        radius: "14px",
        fontFamily:
          '"Geist", ui-sans-serif, system-ui, -apple-system, sans-serif',
        colors: {
          surface: "#ffffff",
          surfaceMuted: "#fafafa",
          border: "#e5e5e5",
          foreground: "#171717",
          foregroundMuted: "#737373",
          primary: "#0a0a0a",
          primaryForeground: "#ffffff",
          primaryHover: "#262626",
          accent: "#1d4dff",
          danger: "#b91c1c",
          overlay: "rgba(23, 23, 23, 0.45)",
        },
      }}
    >
      <Shell />
    </AuthAIProvider>
  );
}

function Shell() {
  const auth = useAuthAI();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">AuthAI</div>
        <div className="topbar-meta">
          {auth.isSignedIn ? <>Demo · <strong>example-backend</strong></> : "Sign-in demo"}
        </div>
      </header>

      <div className="container">
        {auth.isSignedIn ? (
          <Chat
            jwt={auth.jwt!}
            provider={auth.provider}
            backendUrl={BACKEND_URL}
            onSignOut={auth.signOut}
          />
        ) : (
          <div className="signed-out-pitch">
            <h1>Use any AI subscription you already pay for.</h1>
            <p>
              Sign in once. This app calls models on your subscription —
              no card on file, no API key to manage.
            </p>
            <div className="signed-out-actions">
              <SignIn className="btn-primary">Sign in</SignIn>
              <div className="preset-row">
                <SignIn provider="openai" className="btn-light">ChatGPT</SignIn>
                <SignIn provider="xai" className="btn-light">Grok</SignIn>
                <SignIn provider="github" className="btn-light">Copilot</SignIn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
