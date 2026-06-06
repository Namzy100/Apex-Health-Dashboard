"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApex, uid } from "@/lib/store";
import type { DecisionRecord } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";

// ─── Categorized starters ─────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Tonight",
    starters: [
      { label: "Should I go out?",      prompt: "Should I go out tonight? Give me a direct answer." },
      { label: "What should I eat?",    prompt: "What should I eat tonight? Be specific given where I am with my nutrition today." },
      { label: "Stay in or be social?", prompt: "Should I stay in or be social tonight? Give me your honest take." },
    ],
  },
  {
    label: "Focus",
    starters: [
      { label: "What should I prioritize?", prompt: "What should I prioritize for the rest of today? Give me a clear recommendation." },
      { label: "What should I cut?",         prompt: "What should I cut from today's schedule? What's the lowest-leverage thing on my plate?" },
      { label: "Get back on track",           prompt: "I feel off track. What should I do right now to get back on track?" },
    ],
  },
  {
    label: "Money",
    starters: [
      { label: "Should I spend this?",   prompt: "Should I spend money on this? Help me decide. I'll tell you what it is." },
      { label: "Is this worth it?",       prompt: "Is this worth it given my current goals and situation?" },
      { label: "Save or enjoy this?",     prompt: "Should I save this money or enjoy it? Give me your honest recommendation." },
    ],
  },
  {
    label: "Opportunity",
    starters: [
      { label: "Should I say yes?",         prompt: "Should I say yes to an opportunity in front of me? Help me decide." },
      { label: "Which project first?",       prompt: "Which project or initiative should I prioritize right now? What's the highest leverage?" },
      { label: "Is this worth my time?",     prompt: "Is this worth my time? Give me a direct yes or no and why." },
    ],
  },
  {
    label: "Reset",
    starters: [
      { label: "I feel off — help",        prompt: "I feel off today. What should I do right now?" },
      { label: "Wasted the day",            prompt: "I wasted most of the day. How do I recover and make tonight count?" },
      { label: "Plan tonight for me",       prompt: "Plan my evening. What should I do between now and bed?" },
    ],
  },
];

// ─── Message types ────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "apex_command_messages_v2";
const MAX_MESSAGES = 30;

// ─── Response renderer — new chief-of-staff format ───────────────────────────
// Renders: MY TAKE / WHY / WHAT YOU'RE TRADING / WHAT YOU'LL GAIN / CONFIDENCE / GOAL ALIGNMENT

const SECTION_DEFS = [
  { key: "MY TAKE",            color: "#e3e2e7",           size: 17, weight: 600 },
  { key: "WHY",                color: "rgba(216,195,173,0.82)", size: 15, weight: 400 },
  { key: "WHAT YOU'RE TRADING", color: "rgba(216,195,173,0.7)", size: 14, weight: 400 },
  { key: "WHAT YOU'LL GAIN",   color: "rgba(216,195,173,0.7)", size: 14, weight: 400 },
  { key: "CONFIDENCE:",        color: "rgba(216,195,173,0.5)", size: 13, weight: 400 },
  { key: "GOAL ALIGNMENT",     color: "rgba(216,195,173,0.6)", size: 14, weight: 400 },
];

function parseStructured(content: string): { label: string; text: string; color: string; size: number; weight: number }[] {
  const sections: { label: string; text: string; color: string; size: number; weight: number }[] = [];

  let remaining = content;
  for (let i = 0; i < SECTION_DEFS.length; i++) {
    const { key, color, size, weight } = SECTION_DEFS[i];
    const startIdx = remaining.indexOf(key);
    if (startIdx === -1) continue;

    const afterKey = remaining.slice(startIdx + key.length).replace(/^\n+/, "");
    const nextKeys = SECTION_DEFS.slice(i + 1).map(s => s.key);
    let endIdx = afterKey.length;
    for (const nk of nextKeys) {
      const ni = afterKey.indexOf("\n" + nk);
      if (ni !== -1 && ni < endIdx) endIdx = ni;
    }

    const text = afterKey.slice(0, endIdx).trim();
    if (text) sections.push({ label: key.replace(":", ""), text, color, size, weight });
    remaining = afterKey.slice(endIdx);
  }

  return sections;
}

function ResponseRenderer({ content, streaming }: { content: string; streaming?: boolean }) {
  const isStructured = content.includes("MY TAKE") || content.includes("WHAT YOU'RE TRADING");

  if (!content && streaming) {
    return <span style={{ color: "rgba(216,195,173,0.4)" }}>···</span>;
  }

  if (!isStructured) {
    return (
      <p
        className={`font-body${streaming ? " streaming-cursor" : ""}`}
        style={{ fontSize: 16, lineHeight: 1.8, color: "#e3e2e7", letterSpacing: "-0.01em" }}
      >
        {content}
      </p>
    );
  }

  const sections = parseStructured(content);

  if (sections.length === 0) {
    return <p className="font-body" style={{ fontSize: 16, lineHeight: 1.8, color: "#e3e2e7" }}>{content}</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sections.map((s, i) => (
        <div key={i}>
          <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(245,158,11,0.55)", marginBottom: 5 }}>
            {s.label}
          </p>
          <p
            className="font-body"
            style={{ fontSize: s.size, fontWeight: s.weight, lineHeight: 1.65, color: s.color }}
          >
            {s.text}
          </p>
        </div>
      ))}
      {streaming && <div className="streaming-cursor" style={{ fontSize: 14, color: "#f59e0b" }} />}
    </div>
  );
}

// ─── Category tab ─────────────────────────────────────────────────────────────

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 999,
        border: active ? "1px solid rgba(245,158,11,0.35)" : "1px solid rgba(255,255,255,0.08)",
        background: active ? "rgba(245,158,11,0.08)" : "transparent",
        color: active ? "#ffc174" : "rgba(216,195,173,0.45)",
        fontSize: 12,
        fontFamily: "var(--font-body, sans-serif)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function ApexInner() {
  const { state, dispatch } = useApex();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Message[];
    } catch { /* ignore */ }
    return [];
  });

  const [input, setInput] = useState(initialQ);
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activePromptLabel, setActivePromptLabel] = useState<string | null>(null);
  const [savedDecision, setSavedDecision] = useState(false);
  const lastUserPromptRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); }
    catch { /* ignore */ }
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

  const sendMessage = async (text: string, label?: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    setInput("");
    if (label) setActivePromptLabel(label);
    lastUserPromptRef.current = content;
    setSavedDecision(false);

    const userMsg: Message = { id: uid(), role: "user", content };
    const assistantId = uid();
    const next = [...messages, userMsg, { id: assistantId, role: "assistant" as const, content: "" }];
    setMessages(next);
    setStreamingId(assistantId);
    setStreaming(true);

    try {
      const ctx = buildContext(state);
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          context: ctx,
        }),
      });

      if (!res.ok || !res.body) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Couldn't reach Apex. Try again." } : m));
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
        const acc = accumulated;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Network error. Try again." } : m));
    }

    setStreaming(false);
    setStreamingId(null);
  };

  const clearSession = () => {
    setMessages([]);
    setActivePromptLabel(null);
    setSavedDecision(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const saveDecision = () => {
    if (!lastAssistant?.content || savedDecision) return;
    // Extract MY TAKE section from structured response
    const myTakeMatch = lastAssistant.content.match(/MY TAKE\n([\s\S]*?)(?=\n\nWHY|\n\nWHAT|$)/);
    const recommendation = myTakeMatch?.[1]?.trim() || lastAssistant.content.slice(0, 100);
    const confidenceMatch = lastAssistant.content.match(/CONFIDENCE:\s*(\d+)/);

    // Detect decision category from the prompt
    const q = lastUserPromptRef.current.toLowerCase();
    let category = "general";
    if (q.includes("go out") || q.includes("tonight") || q.includes("social")) category = "social";
    else if (q.includes("spend") || q.includes("buy") || q.includes("money")) category = "money";
    else if (q.includes("prioritize") || q.includes("focus")) category = "focus";
    else if (q.includes("yes") || q.includes("opportunity")) category = "opportunity";
    else if (q.includes("workout") || q.includes("gym")) category = "fitness";

    const record: DecisionRecord = {
      id: uid(),
      question: lastUserPromptRef.current.slice(0, 120),
      recommendation: recommendation.slice(0, 200),
      confidence: confidenceMatch?.[1] ? `${confidenceMatch[1]}/10` : undefined,
      category,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: "ADD_DECISION_RECORD", record });
    setSavedDecision(true);
  };

  const lastAssistant = messages.filter(m => m.role === "assistant").slice(-1)[0];
  const hasConversation = messages.length > 0;

  return (
    <div className="font-body" style={{ background: "#060606", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 20px 160px", display: "flex", flexDirection: "column" }}>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: hasConversation ? "#2ecc71" : "#f59e0b",
              boxShadow: hasConversation ? "0 0 8px rgba(46,204,113,0.5)" : "0 0 8px rgba(245,158,11,0.4)",
            }} />
            <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.12em", color: "#f59e0b" }}>
              {hasConversation ? "SESSION ACTIVE" : "READY"}
            </p>
          </div>
          <h2 className="font-display" style={{ fontSize: "clamp(30px, 8vw, 44px)", fontWeight: 800, letterSpacing: "-0.04em", color: "#e3e2e7", lineHeight: 1.05, marginBottom: 5 }}>
            Apex
          </h2>
          <p className="font-body" style={{ fontSize: 13, color: "rgba(216,195,173,0.4)" }}>
            Ask a question. Get a clear answer with reasoning.
          </p>
        </motion.div>

        {/* ── Category tabs ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden", marginBottom: 0 }}
              transition={{ duration: 0.3 }}
              style={{ marginBottom: 24 }}
            >
              {/* Category pills */}
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                {CATEGORIES.map((cat, i) => (
                  <CategoryTab
                    key={cat.label}
                    label={cat.label}
                    active={activeCategory === i}
                    onClick={() => setActiveCategory(i)}
                  />
                ))}
              </div>

              {/* Starters for active category */}
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}
              >
                {CATEGORIES[activeCategory].starters.map((starter) => (
                  <motion.button
                    key={starter.label}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(starter.prompt, starter.label)}
                    disabled={streaming}
                    className="glass-card"
                    style={{
                      padding: "13px 16px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      opacity: streaming ? 0.5 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span className="font-body" style={{ fontSize: 14, color: "#e3e2e7", lineHeight: 1.3 }}>
                      {starter.label}
                    </span>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(245,158,11,0.4)", flexShrink: 0 }}>
                      chevron_right
                    </span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active response ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 20 }}
            >
              {/* Prompt label */}
              {activePromptLabel && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: "rgba(245,158,11,0.4)" }}>psychology</span>
                  <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.05em", color: "rgba(216,195,173,0.3)" }}>
                    {activePromptLabel}
                  </p>
                </div>
              )}

              {/* Current response */}
              {lastAssistant && (
                <div className="glass-card" style={{ borderRadius: 14, padding: "20px", borderColor: "rgba(245,158,11,0.1)" }}>
                  <ResponseRenderer
                    content={lastAssistant.content}
                    streaming={streaming && lastAssistant.id === streamingId}
                  />
                </div>
              )}

              {/* Collapsed history */}
              {messages.length > 2 && (
                <div style={{ marginTop: 16 }}>
                  {messages.slice(0, -2).map(msg =>
                    msg.role === "user" ? (
                      <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                        <div style={{
                          maxWidth: "75%",
                          padding: "8px 14px",
                          borderRadius: "14px 14px 4px 14px",
                          background: "rgba(245,158,11,0.07)",
                          border: "1px solid rgba(245,158,11,0.12)",
                          fontSize: 13,
                          color: "rgba(216,195,173,0.6)",
                          lineHeight: 1.5,
                        }}>
                          {msg.content.slice(0, 100)}{msg.content.length > 100 ? "…" : ""}
                        </div>
                      </div>
                    ) : (
                      <div key={msg.id} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", marginBottom: 8 }}>
                        <p className="font-body" style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(216,195,173,0.4)" }}>
                          {msg.content.slice(0, 120)}{msg.content.length > 120 ? "…" : ""}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Controls after response */}
              {!streaming && (
                <div style={{ marginTop: 16 }}>
                  {/* Save Decision CTA — only for structured responses */}
                  {lastAssistant?.content.includes("MY TAKE") && (
                    <motion.button
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={saveDecision}
                      style={{
                        width: "100%",
                        padding: "11px 16px",
                        borderRadius: 10,
                        border: savedDecision
                          ? "1px solid rgba(46,204,113,0.25)"
                          : "1px solid rgba(245,158,11,0.2)",
                        background: savedDecision
                          ? "rgba(46,204,113,0.06)"
                          : "rgba(245,158,11,0.05)",
                        color: savedDecision ? "#2ecc71" : "rgba(245,158,11,0.8)",
                        fontSize: 12,
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.06em",
                        cursor: savedDecision ? "default" : "pointer",
                        marginBottom: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        {savedDecision ? "check_circle" : "bookmark"}
                      </span>
                      {savedDecision ? "SAVED TO MEMORY" : "SAVE THIS DECISION"}
                    </motion.button>
                  )}

                  {/* Quick follow-up + clear */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
                    {CATEGORIES.slice(0, 2).flatMap(cat => cat.starters.slice(0, 1)).map(s => (
                      <button
                        key={s.label}
                        onClick={() => sendMessage(s.prompt, s.label)}
                        style={{
                          padding: "5px 11px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.08)",
                          background: "transparent",
                          color: "rgba(216,195,173,0.45)",
                          fontSize: 11,
                          fontFamily: "var(--font-mono, monospace)",
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      onClick={clearSession}
                      style={{
                        padding: "5px 11px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,92,92,0.12)",
                        background: "transparent",
                        color: "rgba(255,92,92,0.35)",
                        fontSize: 11,
                        fontFamily: "var(--font-mono, monospace)",
                        letterSpacing: "0.04em",
                        cursor: "pointer",
                        marginLeft: "auto",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Fixed input ───────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          left: 0, right: 0, zIndex: 40,
          padding: "10px 16px",
          background: "rgba(18,19,23,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 600, margin: "0 auto",
            display: "flex", alignItems: "flex-end", gap: 10,
            padding: "10px 14px",
            borderRadius: 14, border: "1px solid rgba(255,255,255,0.09)",
            background: "#1a1a1a",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: "rgba(245,158,11,0.4)", flexShrink: 0, marginBottom: 2 }}>
            psychology
          </span>
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask Apex anything…"
            rows={1}
            disabled={streaming}
            style={{
              flex: 1, fontSize: 15, lineHeight: 1.5, color: "#e3e2e7",
              background: "transparent", outline: "none", border: "none",
              resize: "none", fontFamily: "var(--font-body, inherit)",
              maxHeight: 120, overflow: "auto",
            }}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: input.trim() && !streaming ? "#f59e0b" : "rgba(255,255,255,0.04)",
              border: "none",
              cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: input.trim() && !streaming ? "#1a0e00" : "rgba(216,195,173,0.25)" }}>
              send
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default function ApexPage() {
  return (
    <Suspense fallback={null}>
      <ApexInner />
    </Suspense>
  );
}
