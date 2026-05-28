"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { useApex, uid } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";

// ─── Starter prompts — specific, founder-relevant ─────────────────────────────

const STARTERS = [
  "What should I eat right now?",
  "Plan my morning",
  "Am I going to hit my goal?",
  "What should I work on first?",
  "Should I work out today?",
  "Where am I slipping?",
];

// ─── Message components ───────────────────────────────────────────────────────

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", justifyContent: "flex-end" }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "11px 16px",
          borderRadius: "18px 18px 4px 18px",
          background: "rgba(255,255,255,0.08)",
          color: "var(--text-primary)",
          fontSize: 15,
          lineHeight: 1.6,
          letterSpacing: "-0.01em",
        }}
      >
        {content}
      </div>
    </motion.div>
  );
}

function ApexMessage({ content, streaming = false }: { content: string; streaming?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.8,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
          maxWidth: "92%",
        }}
        className={streaming && content ? "streaming-cursor" : ""}
      >
        {content || (streaming ? <span style={{ color: "var(--text-muted)" }}>···</span> : null)}
      </div>
    </motion.div>
  );
}

// ─── Core chat content ────────────────────────────────────────────────────────

function AskContent() {
  const { state, dispatch } = useApex();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";

  const [input, setInput] = useState(initialQ);
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);

  const messages = state.messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send chip query exactly once
  useEffect(() => {
    if (initialQ && !hasAutoSent.current && !streaming) {
      hasAutoSent.current = true;
      setTimeout(() => sendMessage(initialQ), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");

    const userMsg = { role: "user" as const, content, id: uid() };
    const assistantId = uid();
    const assistantMsg = { role: "assistant" as const, content: "", id: assistantId };

    const newMessages = [...messages, userMsg, assistantMsg];
    dispatch({ type: "SET_MESSAGES", messages: newMessages });
    setStreamingId(assistantId);
    setStreaming(true);

    try {
      const ctx = buildContext(state);
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context: ctx }),
      });

      if (!res.ok || !res.body) {
        dispatch({
          type: "SET_MESSAGES",
          messages: newMessages.map(m => m.id === assistantId
            ? { ...m, content: "Couldn't reach the server. Try again." }
            : m
          ),
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        dispatch({
          type: "SET_MESSAGES",
          messages: newMessages.map(m => m.id === assistantId
            ? { ...m, content: accumulated }
            : m
          ),
        });
      }
    } catch {
      dispatch({
        type: "SET_MESSAGES",
        messages: newMessages.map(m => m.id === assistantId
          ? { ...m, content: "Network error. Try again." }
          : m
        ),
      });
    }

    setStreaming(false);
    setStreamingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => dispatch({ type: "SET_MESSAGES", messages: [] });

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 512, margin: "0 auto" }}>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 13 }}
        >
          <ArrowLeft size={15} strokeWidth={1.8} />
          Today
        </button>

        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--amber)", opacity: 0.8 }}>
          APEX
        </span>

        {!isEmpty ? (
          <button onClick={clearChat} style={{ color: "var(--text-muted)" }} title="Clear chat">
            <Trash2 size={13} strokeWidth={1.6} />
          </button>
        ) : (
          <div style={{ width: 28 }} />
        )}
      </div>

      {/* Messages */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "24px 20px", scrollbarWidth: "none" }}
      >
        {isEmpty ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: "100%" }}>
            {/* Empty state */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize: 21, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.025em", marginBottom: 6 }}>
                What do you need?
              </p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                I have your context. Ask anything.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {STARTERS.map(starter => (
                <motion.button
                  key={starter}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => sendMessage(starter)}
                  style={{
                    textAlign: "left",
                    padding: "13px 15px",
                    borderRadius: 14,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                    lineHeight: 1.45,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                >
                  {starter}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <AnimatePresence>
              {messages.map(msg =>
                msg.role === "user" ? (
                  <UserMessage key={msg.id} content={msg.content} />
                ) : (
                  <ApexMessage
                    key={msg.id}
                    content={msg.content}
                    streaming={streaming && msg.id === streamingId}
                  />
                )
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          flexShrink: 0,
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="ask-input-ring" style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: "10px 14px" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            disabled={streaming}
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 1.5,
              color: "var(--text-primary)",
              background: "transparent",
              outline: "none",
              border: "none",
              resize: "none",
              fontFamily: "inherit",
              maxHeight: 120,
              overflow: "auto",
              display: "block",
            }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: input.trim() && !streaming ? "var(--amber)" : "rgba(255,255,255,0.05)",
              color: input.trim() && !streaming ? "#000" : "var(--text-muted)",
              border: "none",
              cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
              transition: "background 0.2s, color 0.2s",
            }}
          >
            <Send size={13} />
          </motion.button>
        </div>
      </div>

    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense fallback={null}>
      <AskContent />
    </Suspense>
  );
}
