import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Compare 1h vs 2h trend last 6 hours",
  "Summarize current risk factors & warnings",
  "List support & resistance across timeframes",
  "Explain confidence changes in last 6 snapshots",
  "What would invalidate the current action?",
];

export const ChatPanel = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post("/api/quant-chat", {
        messages: newMessages,
      });
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.data.answer },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Error: " + (e.response?.data?.error || e.message),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="card chat-panel">
      <h3>Ask the Quant</h3>
      <div className="chat-window">
        {messages.length === 0 && (
          <div className="placeholder">
            Ask about trends, confidence shifts, signals, risk, or timeframe
            comparisons.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="role">{m.role === "user" ? "You" : "Quant"}</div>
            <div className="content markdown-body">
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content}
                </ReactMarkdown>
              ) : (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <div className="role">Quant</div>
            <div className="content">Thinking...</div>
          </div>
        )}
      </div>
      <div className="suggestions-bar">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            className="suggestion"
            type="button"
            onClick={() => setInput(s)}
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="e.g. Compare 1h trend evolution last 6 hours"
          rows={2}
        />
        <button onClick={send} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
};
