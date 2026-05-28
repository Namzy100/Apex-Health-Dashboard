"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import { useApex } from "@/lib/store";
import type { EnergyLevel } from "@/lib/store";
import { buildContext } from "@/lib/apex/context-builder";
import Brief from "@/components/today/Brief";
import EnergySelector from "@/components/today/EnergySelector";
import Anchors from "@/components/today/Anchors";
import SuggestionChips from "@/components/today/SuggestionChips";
import LogSheet from "@/components/LogSheet";

function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  return `Good evening, ${name}.`;
}

export default function TodayPage() {
  const { state, dispatch } = useApex();
  const router = useRouter();
  const [briefLoading, setBriefLoading] = useState(false);
  const hasFetchedBrief = useRef(false);

  const fetchBrief = useCallback(async () => {
    setBriefLoading(true);
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
          },
        });
      }
    } catch { /* keep existing */ }
    setBriefLoading(false);
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

  const handleEnergy = (level: EnergyLevel) => {
    dispatch({ type: "SET_ENERGY", level });
  };

  // Anchors: derive from live data, fall back to brief anchors
  const anchors = state.brief.anchors;

  return (
    <>
      <div className="max-w-lg mx-auto px-5 pt-10 pb-8">

        {/* Wordmark — minimal, no clock */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginBottom: 32 }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "var(--amber)", opacity: 0.7 }}>
            APEX
          </span>
        </motion.div>

        {/* Greeting */}
        <motion.h1
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          style={{
            fontSize: 28,
            fontWeight: 680,
            letterSpacing: "-0.025em",
            color: "var(--text-primary)",
            marginBottom: 24,
            lineHeight: 1.15,
          }}
        >
          {getGreeting(state.profile.name)}
        </motion.h1>

        {/* The Brief — the entire product */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: 32 }}
        >
          <Brief
            text={state.brief.text}
            isLoading={briefLoading}
            onRefresh={() => { hasFetchedBrief.current = false; fetchBrief(); }}
          />
        </motion.div>

        {/* Energy selector — no label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          style={{ marginBottom: 36 }}
        >
          <EnergySelector value={state.today.energyLevel} onChange={handleEnergy} />
        </motion.div>

        {/* Single divider */}
        <div className="divider" style={{ marginBottom: 28 }} />

        {/* Three anchors */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          style={{ marginBottom: 32 }}
        >
          <Anchors anchors={anchors} />
        </motion.div>

        {/* Chips + ask bar — the invitation to go deeper */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28 }}
          style={{ marginBottom: 16 }}
        >
          <SuggestionChips chips={state.brief.chips} onChipClick={chip => router.push(`/ask?q=${encodeURIComponent(chip)}`)} />
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32 }}
          onClick={() => router.push("/ask")}
          className="w-full ask-input-ring flex items-center gap-3 px-4 py-3.5"
        >
          <span style={{ fontSize: 14, color: "var(--text-muted)", flex: 1, textAlign: "left" }}>
            Ask Apex anything...
          </span>
          <kbd style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.4, fontFamily: "inherit" }}>↵</kbd>
        </motion.button>

      </div>

      {/* Floating log button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.42, type: "spring", stiffness: 420, damping: 30 }}
        whileTap={{ scale: 0.88 }}
        onClick={() => dispatch({ type: "OPEN_LOG_SHEET", tab: "meal" })}
        className="fixed bottom-[88px] right-5 z-20 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #f59e0b, #f97316)",
          boxShadow: "0 8px 28px rgba(245, 158, 11, 0.25)",
        }}
        aria-label="Log meal, weight, or workout"
      >
        <Plus size={20} color="#000" strokeWidth={2.5} />
      </motion.button>

      <LogSheet />
    </>
  );
}
