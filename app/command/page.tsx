"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useApex, uid } from "@/lib/store";
import type { DecisionRecord } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";
import { computeDecisionStats } from "@/lib/apex/learning-engine";

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Tonight",
    starters: [
      { label: "Should I go out?",          prompt: "Should I go out tonight? Give me a direct answer." },
      { label: "Stay in or be social?",     prompt: "Should I stay in or go out and be social tonight?" },
      { label: "What should I eat?",        prompt: "What should I eat tonight given where I am nutritionally today?" },
    ],
  },
  {
    label: "Focus",
    starters: [
      { label: "What should I prioritize?",    prompt: "What should I prioritize for the rest of today? Give me a clear recommendation." },
      { label: "What should I cut?",            prompt: "What should I remove from today's schedule? What's low leverage?" },
      { label: "How do I get back on track?",   prompt: "I feel off track. What should I do right now?" },
    ],
  },
  {
    label: "Money",
    starters: [
      { label: "Should I spend this?",    prompt: "Should I spend money on this? Help me decide." },
      { label: "Is this worth it?",        prompt: "Is this worth spending on given my current goals?" },
    ],
  },
  {
    label: "Opportunity",
    starters: [
      { label: "Should I say yes?",           prompt: "Should I say yes to an opportunity in front of me?" },
      { label: "Which project matters most?",  prompt: "Which project or initiative should I prioritize right now?" },
    ],
  },
  {
    label: "Reset",
    starters: [
      { label: "I feel off — what do I do?",   prompt: "I feel off today. What's the move?" },
      { label: "I wasted the day. Recovery?",  prompt: "I wasted most of the day. How do I recover and make tonight count?" },
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

// ─── Editorial response renderer — pure typography ────────────────────────────

const SECTION_DEFS = [
  { key: "MY TAKE",              color: "#e3e2e7",               size: 22, weight: 700, isHero: true  },
  { key: "WHY",                  color: "rgba(216,195,173,0.8)", size: 15, weight: 400, isHero: false },
  { key: "WHAT YOU'RE TRADING",  color: "rgba(216,195,173,0.62)", size: 14, weight: 400, isHero: false },
  { key: "WHAT YOU'LL GAIN",     color: "rgba(216,195,173,0.62)", size: 14, weight: 400, isHero: false },
  { key: "CONFIDENCE:",          color: "rgba(216,195,173,0.4)", size: 13, weight: 400, isHero: false },
  { key: "GOAL ALIGNMENT",       color: "rgba(216,195,173,0.52)", size: 13, weight: 400, isHero: false },
];

function parseStructured(content: string) {
  const sections: { label: string; text: string; color: string; size: number; weight: number; isHero: boolean }[] = [];
  let remaining = content;
  for (let i = 0; i < SECTION_DEFS.length; i++) {
    const def = SECTION_DEFS[i];
    const startIdx = remaining.indexOf(def.key);
    if (startIdx === -1) continue;
    const afterKey = remaining.slice(startIdx + def.key.length).replace(/^\n+/, "");
    const nextKeys = SECTION_DEFS.slice(i + 1).map(s => s.key);
    let endIdx = afterKey.length;
    for (const nk of nextKeys) {
      const ni = afterKey.indexOf("\n" + nk);
      if (ni !== -1 && ni < endIdx) endIdx = ni;
    }
    const text = afterKey.slice(0, endIdx).trim();
    if (text) sections.push({ label: def.key.replace(":", ""), text, color: def.color, size: def.size, weight: def.weight, isHero: def.isHero });
    remaining = afterKey.slice(endIdx);
  }
  return sections;
}

function ResponseRenderer({ content, streaming }: { content: string; streaming?: boolean }) {
  const isStructured = content.includes("MY TAKE") || content.includes("WHAT YOU'RE TRADING");

  if (!content && streaming) {
    return <span style={{ color: "rgba(216,195,173,0.3)", fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}>···</span>;
  }

  if (!isStructured) {
    return (
      <p
        className={`font-body${streaming ? " streaming-cursor" : ""}`}
        style={{ fontSize: 16, lineHeight: 1.85, color: "#e3e2e7", letterSpacing: "-0.01em" }}
      >
        {content}
      </p>
    );
  }

  const sections = parseStructured(content);
  if (sections.length === 0) return <p className="font-body" style={{ fontSize: 16, lineHeight: 1.85, color: "#e3e2e7" }}>{content}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {sections.map((s, i) => (
        <div key={i}>
          <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(245,158,11,0.4)", marginBottom: 8 }}>
            {s.label}
          </p>
          <p
            className={s.isHero ? "font-display" : "font-body"}
            style={{
              fontSize: s.size,
              fontWeight: s.weight,
              lineHeight: s.isHero ? 1.25 : 1.7,
              color: s.color,
              letterSpacing: s.isHero ? "-0.025em" : "-0.005em",
            }}
          >
            {s.text}
          </p>
        </div>
      ))}
      {streaming && <span className="streaming-cursor" style={{ fontSize: 14, color: "#f59e0b" }} />}
    </div>
  );
}

// ─── Inner ────────────────────────────────────────────────────────────────────

function ApexInner() {
  const { state, dispatch } = useApex();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [messages, setMessages] = useState<Message[]>(() => {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) as Message[]; }
    catch { /* ignore */ }
    return [];
  });

  const [input, setInput] = useState(initialQ);
  const [streaming, setStreaming] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [savedDecision, setSavedDecision] = useState(false);
  const [activePromptLabel, setActivePromptLabel] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastUserPromptRef = useRef<string>("");
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
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Couldn't reach Apex." } : m));
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
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "Network error." } : m));
    }
    setStreaming(false);
    setStreamingId(null);
  };

  const saveDecision = () => {
    if (!lastAssistant?.content || savedDecision) return;
    const myTakeMatch = lastAssistant.content.match(/MY TAKE\n([\s\S]*?)(?=\n\nWHY|\n\nWHAT|$)/);
    const recommendation = myTakeMatch?.[1]?.trim() || lastAssistant.content.slice(0, 100);
    const confidenceMatch = lastAssistant.content.match(/CONFIDENCE:\s*(\d+)/);
    const q = lastUserPromptRef.current.toLowerCase();
    let category = "general";
    if (q.includes("go out") || q.includes("tonight") || q.includes("social")) category = "social";
    else if (q.includes("spend") || q.includes("buy") || q.includes("money")) category = "money";
    else if (q.includes("prioritize") || q.includes("focus")) category = "focus";
    else if (q.includes("yes") || q.includes("opportunity")) category = "opportunity";
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

  const clearSession = () => {
    setMessages([]);
    setActivePromptLabel(null);
    setSavedDecision(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  const lastAssistant = messages.filter(m => m.role === "assistant").slice(-1)[0];
  const hasConversation = messages.length > 0;

  const decisions = state.recentDecisions || [];
  const stats = computeDecisionStats(decisions);
  const confirmedInsights = state.profile.learnedInsights || [];

  // Narrative intelligence status
  const intelligenceNarrative = (() => {
    if (stats.total === 0 && confirmedInsights.length === 0) return null;
    const parts: string[] = [];
    if (stats.resolved >= 3) {
      const worked = stats.worked;
      const total = stats.resolved;
      parts.push(`Of ${total} reviewed decision${total !== 1 ? "s" : ""}, ${worked} worked well.`);
      if (stats.successRate >= 70) parts.push("The trend is positive.");
      else if (stats.successRate < 50) parts.push("Mixed results so far.");
    } else if (stats.total > 0) {
      parts.push(`${stats.total} decision${stats.total !== 1 ? "s" : ""} saved, not yet reviewed.`);
    }
    if (confirmedInsights.length > 0) {
      parts.push(`${confirmedInsights.length} behavioral pattern${confirmedInsights.length !== 1 ? "s" : ""} confirmed.`);
    }
    return parts.join(" ");
  })();

  return (
    <div className="font-body" style={{ background: "#060606", minHeight: "100dvh", overflow: "hidden", position: "relative" }}>

      {/* ── Background identity word ─────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="font-display"
        style={{
          position: "absolute",
          top: "4%",
          right: "-8%",
          fontSize: "clamp(120px, 42vw, 280px)",
          fontWeight: 800,
          letterSpacing: "-0.05em",
          color: "rgba(255,255,255,0.022)",
          pointerEvents: "none",
          userSelect: "none",
          lineHeight: 1,
          zIndex: 0,
          whiteSpace: "nowrap",
        }}
      >
        DECIDE
      </div>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "56px 24px 180px" }}>

        {/* Hero — always visible */}
        <AnimatePresence>
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: 64 }}
            >
              {/* Wordmark */}
              <span className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", opacity: 0.55, display: "block", marginBottom: 44 }}>
                APEX
              </span>

              {/* Hero statement */}
              <h2
                className="font-display"
                style={{
                  fontSize: "clamp(40px, 11vw, 60px)",
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                  color: "#e3e2e7",
                  lineHeight: 1.05,
                  marginBottom: 16,
                }}
              >
                The next move<br />matters.
              </h2>
              <p className="font-body" style={{ fontSize: 15, color: "rgba(216,195,173,0.38)", lineHeight: 1.6 }}>
                Direct answers. Real reasoning. Based on what Apex knows about you.
              </p>

              {/* Intelligence — narrative, not metrics */}
              {intelligenceNarrative && (
                <p
                  className="font-body"
                  style={{
                    marginTop: 28,
                    paddingTop: 20,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    fontSize: 13,
                    color: "rgba(216,195,173,0.42)",
                    lineHeight: 1.7,
                    fontStyle: "italic",
                  }}
                >
                  {intelligenceNarrative}
                </p>
              )}

              {/* Memory snippets */}
              {confirmedInsights.length > 0 && (
                <div style={{ marginTop: 28 }}>
                  <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.14em", color: "rgba(216,195,173,0.22)", marginBottom: 16 }}>
                    WHAT APEX KNOWS
                  </p>
                  {confirmedInsights.slice(0, 3).map((insight, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: 14,
                        paddingLeft: 14,
                        borderLeft: "1px solid rgba(245,158,11,0.18)",
                      }}
                    >
                      <p className="font-body" style={{ fontSize: 14, color: "rgba(216,195,173,0.5)", lineHeight: 1.6 }}>
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories — vertical editorial destinations */}
        <AnimatePresence>
          {!hasConversation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.2 }}
            >
              {CATEGORIES.map((cat, ci) => (
                <div
                  key={cat.label}
                  style={{
                    marginBottom: 32,
                    paddingBottom: 32,
                    borderBottom: ci < CATEGORIES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  <p className="font-label" style={{ fontSize: 9, letterSpacing: "0.16em", color: "rgba(245,158,11,0.45)", marginBottom: 14 }}>
                    {cat.label.toUpperCase()}
                  </p>
                  {cat.starters.map(s => (
                    <motion.button
                      key={s.label}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => sendMessage(s.prompt, s.label)}
                      disabled={streaming}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "11px 0",
                        background: "none",
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        cursor: "pointer",
                        textAlign: "left",
                        opacity: streaming ? 0.35 : 1,
                      }}
                    >
                      <span className="font-body" style={{ fontSize: 16, color: "#e3e2e7", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                        {s.label}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: "rgba(245,158,11,0.3)", flexShrink: 0, marginLeft: 12 }}>
                        arrow_forward
                      </span>
                    </motion.button>
                  ))}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active session */}
        <AnimatePresence>
          {hasConversation && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Wordmark */}
              <span className="font-label" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", opacity: 0.55, display: "block", marginBottom: 36 }}>
                APEX
              </span>

              {/* Prompt label */}
              {activePromptLabel && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 32 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, color: "rgba(245,158,11,0.35)" }}>psychology</span>
                  <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(216,195,173,0.28)" }}>
                    {activePromptLabel}
                  </p>
                </div>
              )}

              {/* Response — editorial typography, no wrapper */}
              {lastAssistant && (
                <div style={{ marginBottom: 36 }}>
                  <ResponseRenderer
                    content={lastAssistant.content}
                    streaming={streaming && lastAssistant.id === streamingId}
                  />
                </div>
              )}

              {/* Save decision */}
              {!streaming && lastAssistant?.content.includes("MY TAKE") && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  onClick={saveDecision}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: "none",
                    border: "none",
                    cursor: savedDecision ? "default" : "pointer",
                    padding: "6px 0",
                    marginBottom: 24,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: savedDecision ? "#2ecc71" : "rgba(245,158,11,0.4)" }}>
                    {savedDecision ? "check_circle" : "bookmark_add"}
                  </span>
                  <span className="font-label" style={{ fontSize: 10, letterSpacing: "0.08em", color: savedDecision ? "rgba(46,204,113,0.5)" : "rgba(245,158,11,0.38)" }}>
                    {savedDecision ? "SAVED TO MEMORY" : "SAVE THIS DECISION"}
                  </span>
                </motion.button>
              )}

              {/* Previous history — collapsed, minimal */}
              {messages.length > 2 && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20, marginBottom: 20 }}>
                  {messages.slice(0, -2).map(msg =>
                    msg.role === "user" ? (
                      <p key={msg.id} className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.25)", marginBottom: 6, textAlign: "right" }}>
                        {msg.content.slice(0, 70)}{msg.content.length > 70 ? "…" : ""}
                      </p>
                    ) : (
                      <p key={msg.id} className="font-body" style={{ fontSize: 12, color: "rgba(216,195,173,0.2)", marginBottom: 10, lineHeight: 1.55 }}>
                        {msg.content.slice(0, 90)}{msg.content.length > 90 ? "…" : ""}
                      </p>
                    )
                  )}
                </div>
              )}

              {/* Controls */}
              {!streaming && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={clearSession} style={{ background: "none", border: "1px solid rgba(255,92,92,0.1)", borderRadius: 999, padding: "4px 12px", color: "rgba(255,92,92,0.28)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.06em", cursor: "pointer" }}>
                    CLEAR
                  </button>
                  {CATEGORIES.slice(0, 2).map(cat => (
                    <button key={cat.label} onClick={() => sendMessage(cat.starters[0].prompt, cat.starters[0].label)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 999, padding: "4px 12px", color: "rgba(216,195,173,0.3)", fontSize: 10, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.05em", cursor: "pointer" }}>
                      {cat.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Fixed input */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(60px + env(safe-area-inset-bottom, 0px))",
          left: 0, right: 0, zIndex: 40,
          padding: "12px 20px",
          background: "rgba(6,6,6,0.96)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "flex-end", gap: 10 }}>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight}px`; }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask anything…"
            rows={1}
            disabled={streaming}
            style={{
              flex: 1, fontSize: 15, lineHeight: 1.5, color: "#e3e2e7",
              background: "rgba(255,255,255,0.04)", outline: "none",
              border: "1px solid rgba(255,255,255,0.07)", resize: "none",
              fontFamily: "var(--font-body, inherit)", maxHeight: 120, overflow: "auto",
              borderRadius: 12, padding: "11px 14px", transition: "border-color 0.15s ease",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(245,158,11,0.25)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: input.trim() && !streaming ? "#f59e0b" : "rgba(255,255,255,0.05)",
              border: "none", cursor: input.trim() && !streaming ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: input.trim() && !streaming ? "#1a0e00" : "rgba(216,195,173,0.2)" }}>
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
