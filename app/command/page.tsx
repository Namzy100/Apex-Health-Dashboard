"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApex, uid } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";

// ─── Starter commands ─────────────────────────────────────────────────────────

const STARTER_COMMANDS = [
  { label: "Plan Today",       icon: "event_upcoming",      prompt: "Plan my day. What should I prioritize, when should I eat, and when should I train?" },
  { label: "Review Week",      icon: "calendar_view_week",  prompt: "Review my week. What patterns are emerging and what needs to change?" },
  { label: "Find Bottleneck",  icon: "analytics",           prompt: "What is my main bottleneck right now? Where am I losing the most performance?" },
  { label: "Optimize Tomorrow",icon: "bolt",                prompt: "How should I set up tomorrow for maximum output? What do I need to do today to make that happen?" },
  { label: "What Should I Eat",icon: "restaurant",          prompt: "What should I eat right now? Be specific." },
  { label: "Am I Drifting?",   icon: "trending_down",       prompt: "Am I drifting from my goals? Be honest and specific about where things are slipping." },
];

// ─── Message types ────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ─── Persistence ─────────────────────────────────────────────────────────────
const COMMAND_STORAGE_KEY = "apex_command_v1";
const MAX_MESSAGES = 30;

function loadPersistedMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMMAND_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Message[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_MESSAGES) : [];
  } catch { return []; }
}

function persistMessages(msgs: Message[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COMMAND_STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_MESSAGES)));
  } catch { /* ignore */ }
}

// ─── Command inner (needs Suspense for useSearchParams) ───────────────────────

function CommandInner() {
  const { state } = useApex();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages());
  const [input, setInput] = useState(initialQ);
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [activeCommand, setActiveCommand] = useState<string | null>(() => {
    const loaded = loadPersistedMessages();
    const lastUser = loaded.filter(m => m.role === "user").slice(-1)[0];
    return lastUser ? lastUser.content.slice(0, 60) : null;
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);

  // Persist messages whenever they change
  useEffect(() => {
    if (messages.length > 0) persistMessages(messages);
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialQ && !hasAutoSent.current && !streaming) {
      hasAutoSent.current = true;
      setTimeout(() => sendMessage(initialQ), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearSession = () => {
    setMessages([]);
    setActiveCommand(null);
    localStorage.removeItem(COMMAND_STORAGE_KEY);
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    setActiveCommand(content.slice(0, 60));

    const userMsg: Message = { id: uid(), role: "user", content };
    const assistantId = uid();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    const next = [...messages, userMsg, assistantMsg];
    setMessages(next);
    setStreamingId(assistantId);
    setStreaming(true);

    try {
      const ctx = buildContext(state);
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context: ctx }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Couldn't reach the server. Try again." }
              : m
          )
        );
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
        const accCopy = accumulated;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accCopy } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Network error. Try again." }
            : m
        )
      );
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

  const lastAssistant = messages.filter((m) => m.role === "assistant").slice(-1)[0];
  const hasConversation = messages.length > 0;

  return (
    <div
      className="font-body"
      style={{ background: "#060606", minHeight: "100dvh" }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "72px 20px 140px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36 }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: hasConversation ? "#2ecc71" : "#f59e0b",
                  boxShadow: hasConversation
                    ? "0 0 8px rgba(46,204,113,0.5)"
                    : "0 0 8px rgba(245,158,11,0.4)",
                }}
              />
              <p
                className="font-label"
                style={{ fontSize: 10, letterSpacing: "0.12em", color: "#f59e0b" }}
              >
                {hasConversation ? "ACTIVE SESSION" : "SYSTEM STATUS: READY"}
              </p>
            </div>
            {/* Settings access */}
            <a
              href="/settings"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: "rgba(216,195,173,0.35)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
            </a>
          </div>
          <h2
            className="font-display"
            style={{
              fontSize: "clamp(36px, 9vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#e3e2e7",
              lineHeight: 1.05,
              marginBottom: 8,
            }}
          >
            Command Apex
          </h2>
          <p
            className="font-body"
            style={{ fontSize: 14, color: "rgba(216,195,173,0.5)", lineHeight: 1.5 }}
          >
            Direct decision support. No fluff.
          </p>
        </motion.section>

        {/* ── Starter command grid ──────────────────────────────────────────── */}
        <AnimatePresence>
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 32,
              }}
            >
              {STARTER_COMMANDS.map((cmd, i) => (
                <motion.button
                  key={cmd.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04, duration: 0.35 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => sendMessage(cmd.prompt)}
                  disabled={streaming}
                  className="glass-card"
                  style={{
                    padding: "16px 14px",
                    borderRadius: 14,
                    cursor: streaming ? "not-allowed" : "pointer",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transition: "all 0.15s ease",
                    opacity: streaming ? 0.5 : 1,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 20, color: "#f59e0b" }}
                  >
                    {cmd.icon}
                  </span>
                  <span
                    className="font-label"
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.04em",
                      color: "#e3e2e7",
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {cmd.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active response panel ─────────────────────────────────────────── */}
        <AnimatePresence>
          {hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 24 }}
            >
              {/* Active command label */}
              {activeCommand && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 14, color: "rgba(245,158,11,0.6)" }}
                  >
                    terminal
                  </span>
                  <p
                    className="font-label"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.06em",
                      color: "rgba(216,195,173,0.4)",
                    }}
                  >
                    {activeCommand.length > 55 ? activeCommand.slice(0, 55) + "…" : activeCommand}
                  </p>
                </div>
              )}

              {/* Response */}
              {lastAssistant && (
                <div
                  className="glass-card"
                  style={{
                    borderRadius: 16,
                    padding: "22px 22px",
                    borderColor: "rgba(245,158,11,0.12)",
                  }}
                >
                  <p
                    className={`font-body${streaming && lastAssistant.id === streamingId ? " streaming-cursor" : ""}`}
                    style={{
                      fontSize: 16,
                      lineHeight: 1.8,
                      color: "#e3e2e7",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {lastAssistant.content ||
                      (streaming ? (
                        <span style={{ color: "rgba(216,195,173,0.4)" }}>···</span>
                      ) : null)}
                  </p>
                </div>
              )}

              {/* History thread (collapsed, earlier messages) */}
              {messages.length > 2 && (
                <div style={{ marginTop: 20 }}>
                  {messages.slice(0, -2).map((msg) =>
                    msg.role === "user" ? (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "75%",
                            padding: "8px 14px",
                            borderRadius: "14px 14px 4px 14px",
                            background: "rgba(245,158,11,0.1)",
                            border: "1px solid rgba(245,158,11,0.15)",
                            fontSize: 13,
                            color: "rgba(216,195,173,0.7)",
                            lineHeight: 1.5,
                          }}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={msg.id}
                        style={{
                          padding: "12px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          marginBottom: 8,
                        }}
                      >
                        <p
                          className="font-body"
                          style={{
                            fontSize: 14,
                            lineHeight: 1.7,
                            color: "rgba(216,195,173,0.55)",
                          }}
                        >
                          {msg.content}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Quick command shortcuts after first response */}
              {!streaming && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  {STARTER_COMMANDS.slice(0, 3).map((cmd) => (
                    <button
                      key={cmd.label}
                      onClick={() => sendMessage(cmd.prompt)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.08)",
                        background: "transparent",
                        color: "rgba(216,195,173,0.55)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.04em",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {cmd.label}
                    </button>
                  ))}
                  <button
                    onClick={clearSession}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,92,92,0.15)",
                      background: "transparent",
                      color: "rgba(255,92,92,0.4)",
                      fontSize: 12,
                      fontFamily: "var(--font-mono, monospace)",
                      letterSpacing: "0.04em",
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          zIndex: 40,
          padding: "10px 16px",
          background: "rgba(18,19,23,0.9)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "#1a1a1a",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: "rgba(245,158,11,0.5)",
              flexShrink: 0,
              marginBottom: 2,
            }}
          >
            terminal
          </span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything or type a command…"
            rows={1}
            disabled={streaming}
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 1.5,
              color: "#e3e2e7",
              background: "transparent",
              outline: "none",
              border: "none",
              resize: "none",
              fontFamily: "var(--font-body, inherit)",
              maxHeight: 120,
              overflow: "auto",
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
              background:
                input.trim() && !streaming
                  ? "#f59e0b"
                  : "rgba(255,255,255,0.05)",
              border: "none",
              cursor:
                input.trim() && !streaming ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 15,
                color: input.trim() && !streaming ? "#1a0e00" : "rgba(216,195,173,0.3)",
              }}
            >
              send
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ─── Suspense wrapper ─────────────────────────────────────────────────────────

export default function CommandPage() {
  return (
    <Suspense fallback={null}>
      <CommandInner />
    </Suspense>
  );
}
