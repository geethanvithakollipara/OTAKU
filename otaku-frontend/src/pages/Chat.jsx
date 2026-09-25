import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const scrollRef = useRef(null);

  const loadConversations = () =>
    api
      .get("/chat/conversations")
      .then((data) => {
        setConversations(data);
        if (!activeId && data.length) setActiveId(data[0]._id);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    api
      .get(`/chat/conversations/${activeId}/messages`)
      .then(setMessages)
      .catch((err) => setError(err.message));
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = await api.post(`/chat/conversations/${activeId}/messages`, { text });
    setMessages((prev) => [...prev, { ...msg, sender: { _id: user._id, username: user.username } }]);
    setText("");
  };

  // Simplified: starts a direct conversation by another user's id, since
  // this demo UI doesn't include a user search endpoint. Wire this up to a
  // real "find friends" flow once the backend exposes one.
  const startConversation = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const conv = await api.post("/chat/conversations", {
        type: "direct",
        participantIds: [newUsername],
      });
      setNewUsername("");
      await loadConversations();
      setActiveId(conv._id);
    } catch (err) {
      setError(err.message);
    }
  };

  const active = conversations.find((c) => c._id === activeId);

  return (
    <div className="container">
      <h1>Chat</h1>
      <p className="muted">1:1 and group conversations to discuss chapters and share picks.</p>
      {error && <div className="error-banner">{error}</div>}

      <div className="chat-layout">
        <div>
          <form onSubmit={startConversation} style={{ marginBottom: 10 }}>
            <div className="field">
              <label htmlFor="newconv">Start a chat (user ID)</label>
              <input
                id="newconv"
                placeholder="Paste a user's _id"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
              />
            </div>
            <button className="btn" type="submit">
              Start
            </button>
          </form>

          <div className="conversation-list">
            {conversations.map((c) => (
              <div
                key={c._id}
                className={`conversation-item ${c._id === activeId ? "active" : ""}`}
                onClick={() => setActiveId(c._id)}
                style={{ cursor: "pointer" }}
              >
                {c.type === "group"
                  ? c.name || "Group chat"
                  : c.participants.find((p) => p._id !== user._id)?.username || "Direct chat"}
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="empty-state">No conversations yet.</div>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: 0 }}>
          {active ? (
            <>
              <div ref={scrollRef} className="message-list">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`message-bubble ${m.sender?._id === user._id ? "mine" : ""}`}
                  >
                    <div className="message-sender">{m.sender?.username}</div>
                    {m.text}
                  </div>
                ))}
              </div>
              <form className="message-form" onSubmit={send}>
                <input
                  placeholder="Message…"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">Pick a conversation to start chatting.</div>
          )}
        </div>
      </div>
    </div>
  );
}
