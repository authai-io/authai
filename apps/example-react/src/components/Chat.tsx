import { useState } from "react";
import type { Client, ChatMessage } from "chatgpt-connect";

type Props = {
  client: Client;
  onSignOut: () => void;
};

const MODELS = [
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-pro",
  "gpt-5.4-codex",
  "gpt-5.5",
  "gpt-5.5-pro",
];

export function Chat({ client, onSignOut }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setErr(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setStreaming(true);

    const placeholder: ChatMessage = { role: "assistant", content: "" };
    setMessages([...next, placeholder]);

    try {
      let acc = "";
      for await (const chunk of client.chat({ model, messages: next })) {
        if (chunk.delta) {
          acc += chunk.delta;
          setMessages([...next, { role: "assistant", content: acc }]);
        }
        if (chunk.done) break;
      }
    } catch (e) {
      setErr((e as Error).message);
      setMessages(next);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="row" style={{ alignItems: "center", gap: 12 }}>
        <label className="muted" style={{ fontSize: 13 }}>Model:</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{
            font: "inherit",
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #d6d3d1",
            background: "white",
          }}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="col" style={{ gap: 4 }}>
        {messages.length === 0 && (
          <p className="muted" style={{ margin: 0 }}>
            Say something to get started.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <strong style={{ display: "block", fontSize: 12, opacity: 0.6 }}>{m.role}</strong>
            {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
      </div>

      {err && <p style={{ color: "#b91c1c", margin: 0 }}>{err}</p>}

      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} disabled={streaming || !input.trim()}>
          {streaming ? "…" : "Send"}
        </button>
      </div>

      <button className="secondary" onClick={onSignOut} style={{ alignSelf: "flex-start" }}>
        Sign out
      </button>
    </div>
  );
}
