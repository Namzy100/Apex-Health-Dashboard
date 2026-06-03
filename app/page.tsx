"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useApex } from "@/lib/store";
import type { EnergyLevel } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";
import { deriveOperatingMode, deriveRisk, deriveTodaysMove } from "@/lib/apex/operating-mode";
import EnergySelector from "@/components/today/EnergySelector";

// ─── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

// ─── CTA derivation ───────────────────────────────────────────────────────────

function getCTA(
  hasFood: boolean,
  mode: string
): { label: string; action: "log" | "command" } {
  if (!hasFood) return { label: "Log Breakfast", action: "log" };
  if (mode === "DRIFTING" || mode === "RECOVERY" || mode === "REBUILD MODE") {
    return { label: "Get Back on Track", action: "command" };
  }
  return { label: "Command Apex", action: "command" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const { state, dispatch } = useApex();
  const router = useRouter();
  const hasFetchedBrief = useRef(false);

  const fetchBrief = useCallback(async () => {
    try {
      const ctx = buildContext(state);
      const res = await fetch("/api/ai/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: ctx }),
      });
      if (res.ok) {
        const data = await res.json();
        dispatch({
          type: "SET_BRIEF",
          brief: {
            text: data.brief,
            anchors: data.anchors,
            chips: data.chips,
            generatedAt: new Date().toISOString(),
            risk: data.risk,
            todaysMove: data.todaysMove,
          },
        });
      }
    } catch { /* keep existing */ }
  }, [state, dispatch]);

  useEffect(() => {
    if (hasFetchedBrief.current) return;
    const generated = state.brief.generatedAt
      ? new Date(state.brief.generatedAt).getTime()
      : 0;
    if (Date.now() - generated > 30 * 60 * 1000) {
      hasFetchedBrief.current = true;
      fetchBrief();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────
  const ctx = buildContext(state);
  const modeData = deriveOperatingMode(ctx);
  const risk = state.brief.risk || deriveRisk(ctx);
  const todaysMove = state.brief.todaysMove || deriveTodaysMove(ctx);
  const cta = getCTA(ctx.today.hasLoggedFood, modeData.mode);

  const handleEnergy = (level: EnergyLevel) => {
    dispatch({ type: "SET_ENERGY", level });
  };

  const handleCTA = () => {
    if (cta.action === "log") {
      dispatch({ type: "OPEN_LOG_SHEET", tab: "meal" });
    } else {
      router.push("/command");
    }
  };

  return (
    <div
      className="relative min-h-dvh overflow-x-hidden font-body"
      style={{ background: "#060606" }}
    >
      {/* Atmospheric amber glow */}
      <div
        className="absolute inset-0 pointer-events-none atmospheric-glow"
        style={{ zIndex: 0 }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 560,
          margin: "0 auto",
          padding: "72px 24px 132px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Wordmark + Settings */}
        <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 52 }}>
          <span
            className="font-label"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#f59e0b", opacity: 0.65 }}
          >
            APEX
          </span>
          <a
            href="/settings"
            style={{ color: "rgba(216,195,173,0.3)", textDecoration: "none", lineHeight: 0 }}
            aria-label="Settings"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
          </a>
        </div>

        {/* ── Operating mode display ──────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: 44, width: "100%" }}>
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(52px, 14vw, 80px)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: modeData.color,
              textShadow: `0 0 60px ${modeData.glowColor}`,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            {modeData.mode}
          </h1>
          {/* Glow bar */}
          <div
            style={{
              height: 3,
              width: 28,
              background: "#f59e0b",
              borderRadius: 999,
              margin: "0 auto 10px",
              opacity: 0.6,
              filter: "blur(1px)",
            }}
          />
          <p
            className="font-label"
            style={{
              fontSize: 11,
              letterSpacing: "0.05em",
              color: "rgba(216,195,173,0.5)",
            }}
          >
            {modeData.subtitle}
          </p>
        </div>

        {/* ── Compact energy selector ───────────────────────────────────────── */}
        <div
          style={{
            alignSelf: "flex-start",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            className="font-label"
            style={{
              fontSize: 10,
              letterSpacing: "0.1em",
              color: "rgba(216,195,173,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            ENERGY
          </span>
          <EnergySelector
            value={state.today.energyLevel}
            onChange={handleEnergy}
          />
        </div>

        {/* ── Greeting ─────────────────────────────────────────────────────── */}
        <p
          className="font-display"
          style={{
            alignSelf: "flex-start",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            color: "#e3e2e7",
            marginBottom: 20,
          }}
        >
          {getGreeting(state.profile.name)}
        </p>

        {/* ── Brief prose ──────────────────────────────────────────────────── */}
        <p
          className="font-body"
          style={{
            alignSelf: "flex-start",
            fontSize: 17,
            lineHeight: 1.85,
            color: "rgba(216,195,173,0.82)",
            letterSpacing: "-0.01em",
            marginBottom: 32,
          }}
        >
          {state.brief.text}
        </p>

        {/* ── Risk card ─────────────────────────────────────────────────────── */}
        <div
          className="glass-edge"
          style={{
            width: "100%",
            borderRadius: 14,
            padding: "16px 18px",
            marginBottom: 32,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            background: "rgba(255,92,92,0.04)",
            borderColor: "rgba(255,92,92,0.2)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 18,
              color: "#ff5c5c",
              fontVariationSettings: "'FILL' 1, 'wght' 400",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            warning
          </span>
          <div>
            <p
              className="font-label"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#ff5c5c",
                marginBottom: 5,
              }}
            >
              THE RISK
            </p>
            <p
              className="font-body"
              style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(216,195,173,0.78)" }}
            >
              {risk}
            </p>
          </div>
        </div>

        {/* ── Today's Move ─────────────────────────────────────────────────── */}
        <div
          style={{
            alignSelf: "flex-start",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 24,
            marginBottom: 40,
            width: "100%",
          }}
        >
          <p
            className="font-label"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#f59e0b",
              marginBottom: 12,
            }}
          >
            TODAY&apos;S MOVE
          </p>
          <p
            className="font-display"
            style={{
              fontSize: "clamp(19px, 4.5vw, 24px)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#e3e2e7",
              lineHeight: 1.35,
              fontStyle: "italic",
            }}
          >
            &ldquo;{todaysMove}&rdquo;
          </p>
        </div>

        {/* ── Primary CTA ──────────────────────────────────────────────────── */}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handleCTA}
          style={{
            background: "#f59e0b",
            color: "#1a0e00",
            padding: "16px 40px",
            borderRadius: 999,
            fontSize: 17,
            fontWeight: 700,
            fontFamily: "var(--font-display, sans-serif)",
            letterSpacing: "-0.01em",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 32px rgba(245,158,11,0.28)",
            marginBottom: 36,
            alignSelf: "center",
          }}
        >
          {cta.label}
        </motion.button>

        {/* ── Anchors ──────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
          }}
        >
          {state.brief.anchors.map((anchor, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "baseline", gap: 10 }}
            >
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "rgba(245,158,11,0.35)",
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              <span
                className="font-body"
                style={{ fontSize: 13, color: "rgba(216,195,173,0.45)", lineHeight: 1.5 }}
              >
                {anchor}
              </span>
            </div>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={() => { hasFetchedBrief.current = false; fetchBrief(); }}
          style={{
            marginTop: 28,
            background: "none",
            border: "none",
            color: "rgba(216,195,173,0.25)",
            fontSize: 10,
            fontFamily: "var(--font-mono, monospace)",
            letterSpacing: "0.08em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>refresh</span>
          REFRESH BRIEF
        </button>

        {/* ── APEX NOTICES — pattern preview (from Intelligence) ─────────── */}
        {ctx.behavioral.patterns.length > 0 && (
          <div style={{ width: "100%", marginTop: 44 }}>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#f59e0b" }}>psychology</span>
                <p className="font-label" style={{ fontSize: 10, letterSpacing: "0.1em", color: "#f59e0b" }}>
                  APEX NOTICES
                </p>
              </div>
              <a
                href="/intelligence"
                className="font-label"
                style={{ fontSize: 10, letterSpacing: "0.06em", color: "rgba(245,158,11,0.45)", textDecoration: "none" }}
              >
                {ctx.behavioral.patterns.length} INSIGHT{ctx.behavioral.patterns.length !== 1 ? "S" : ""} →
              </a>
            </div>

            {/* Top 2 pattern chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ctx.behavioral.patterns.slice(0, 2).map((pattern, i) => (
                <a
                  key={i}
                  href="/intelligence"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="glass-card"
                    style={{
                      borderRadius: 12,
                      padding: "13px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <div
                      style={{
                        flexShrink: 0,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: pattern.confidence >= 0.78 ? "#f59e0b" : "rgba(216,195,173,0.3)",
                      }}
                    />
                    <p
                      className="font-body"
                      style={{ fontSize: 13, color: "rgba(216,195,173,0.75)", lineHeight: 1.4, flex: 1 }}
                    >
                      {pattern.pattern.replace(/^[a-z]/, c => c.toUpperCase())}
                    </p>
                    <span
                      className="font-label"
                      style={{ fontSize: 10, letterSpacing: "0.05em", color: "rgba(245,158,11,0.5)", flexShrink: 0 }}
                    >
                      {Math.round(pattern.confidence * 100)}%
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* LogSheet and GlobalLogButton are rendered globally in layout.tsx */}
    </div>
  );
}
