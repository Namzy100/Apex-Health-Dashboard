// ─── Learning Engine ──────────────────────────────────────────────────────────
//
// Pure functions that analyze decision history to generate candidate insights.
//
// Philosophy:
//   - No machine learning. No API calls. No overengineering.
//   - Pattern matching on outcomes across categories and recommendation types.
//   - Conservative — requires minimum evidence before claiming anything.
//   - Evidence-based — every insight cites supporting data.
//   - Decision → Outcome → Insight → Better Future Decision

import type { DecisionRecord, DecisionOutcome } from "@/lib/store";

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface DecisionStats {
  total: number;
  resolved: number;
  worked: number;
  mixed: number;
  didNotWork: number;
  successRate: number;          // % of resolved that "worked"
  pendingFollowUp: number;      // decisions > 24h old without outcomes
}

export function computeDecisionStats(decisions: DecisionRecord[]): DecisionStats {
  const resolved = decisions.filter(d => d.outcome);
  const worked = resolved.filter(d => d.outcome === "worked").length;
  const mixed = resolved.filter(d => d.outcome === "mixed").length;
  const didNotWork = resolved.filter(d => d.outcome === "did_not_work").length;
  const pendingFollowUp = getPendingFollowUps(decisions).length;

  return {
    total: decisions.length,
    resolved: resolved.length,
    worked,
    mixed,
    didNotWork,
    successRate: resolved.length > 0 ? Math.round((worked / resolved.length) * 100) : 0,
    pendingFollowUp,
  };
}

// ─── Pending follow-ups ───────────────────────────────────────────────────────
// Decisions older than 24h without a recorded outcome.

export function getPendingFollowUps(decisions: DecisionRecord[]): DecisionRecord[] {
  const now = Date.now();
  const threshold = 24 * 60 * 60 * 1000;

  return decisions
    .filter(d => !d.outcome && now - new Date(d.createdAt).getTime() > threshold)
    .slice(0, 3); // show max 3 at a time
}

// ─── Candidate insight generator ─────────────────────────────────────────────
// Minimum data requirements are enforced per pattern to prevent false claims.

export function generateCandidateInsights(
  decisions: DecisionRecord[],
  dismissedInsights: string[] = [],
  confirmedInsights: string[] = [],
): string[] {
  const resolved = decisions.filter(d => d.outcome);
  if (resolved.length < 3) return [];

  const dismissed = new Set(dismissedInsights);
  const confirmed = new Set(confirmedInsights);

  const candidates: string[] = [];
  const pct = (n: number, total: number) => Math.round((n / total) * 100);

  // ── 1. Category success rates ─────────────────────────────────────────────
  const CATEGORIES: { key: string; label: string }[] = [
    { key: "social",      label: "Social decisions" },
    { key: "focus",       label: "Focus and priority decisions" },
    { key: "money",       label: "Spending decisions" },
    { key: "opportunity", label: "Opportunity decisions" },
    { key: "fitness",     label: "Fitness decisions" },
  ];

  for (const { key, label } of CATEGORIES) {
    const cat = resolved.filter(d => d.category === key);
    if (cat.length < 3) continue;

    const worked = cat.filter(d => d.outcome === "worked").length;
    const didntWork = cat.filter(d => d.outcome === "did_not_work").length;
    const successRate = pct(worked, cat.length);

    if (successRate >= 75) {
      candidates.push(
        `${label} tend to work out well for you — ${worked}/${cat.length} have led to good outcomes.`
      );
    } else if (pct(didntWork, cat.length) >= 60 && didntWork >= 2) {
      candidates.push(
        `${label} have a lower success rate in your history — ${didntWork}/${cat.length} didn't go as expected.`
      );
    }
  }

  // ── 2. "Stay in" pattern ──────────────────────────────────────────────────
  const stayIn = resolved.filter(d => {
    const rec = d.recommendation.toLowerCase();
    return rec.includes("stay in") || rec.includes("don't go") || rec.includes("do not go");
  });
  if (stayIn.length >= 3) {
    const worked = stayIn.filter(d => d.outcome === "worked").length;
    const rate = pct(worked, stayIn.length);
    if (rate >= 70) {
      candidates.push(
        `Staying in has worked out ${rate}% of the time you've followed this recommendation (${worked}/${stayIn.length} decisions).`
      );
    }
  }

  // ── 3. High-confidence calibration ───────────────────────────────────────
  const highConf = resolved.filter(d => {
    const conf = parseInt(d.confidence?.split("/")[0] || "0");
    return conf >= 8;
  });
  if (highConf.length >= 3) {
    const worked = highConf.filter(d => d.outcome === "worked").length;
    const rate = pct(worked, highConf.length);
    if (rate >= 75) {
      candidates.push(
        `High-confidence Apex recommendations (8+/10) have a ${rate}% success rate across your ${highConf.length} recorded outcomes.`
      );
    } else if (rate <= 50 && highConf.length >= 4) {
      candidates.push(
        `High-confidence recommendations have only worked out ${rate}% of the time — treat 8+/10 confidence claims with some skepticism.`
      );
    }
  }

  // ── 4. Overall success trend (10+ decisions) ─────────────────────────────
  if (resolved.length >= 10) {
    const worked = resolved.filter(d => d.outcome === "worked").length;
    const rate = pct(worked, resolved.length);
    if (rate >= 70) {
      candidates.push(
        `Across ${resolved.length} recorded decisions, ${rate}% have led to good outcomes. Apex's recommendations are a reliable signal for you.`
      );
    } else if (rate <= 45) {
      candidates.push(
        `Your recorded success rate is ${rate}% across ${resolved.length} decisions. Apex may need more context about your preferences to improve.`
      );
    }
  }

  // ── 5. Recent streak ─────────────────────────────────────────────────────
  if (resolved.length >= 4) {
    const recent = resolved.slice(0, 5);
    const recentWorked = recent.filter(d => d.outcome === "worked").length;
    if (recentWorked >= 4) {
      candidates.push(
        `Your last ${recent.length} decisions have mostly worked out — you're in a strong decision-making streak.`
      );
    } else if (recentWorked <= 1 && recent.length >= 3) {
      candidates.push(
        `Your last ${recent.length} decisions have had mixed or poor outcomes. It might be worth revisiting your decision-making approach right now.`
      );
    }
  }

  // ── 6. Reflection patterns ───────────────────────────────────────────────
  const withReflections = resolved.filter(d => d.reflection);
  if (withReflections.length >= 3) {
    const tiringWords = ["tired", "exhausted", "drain", "low energy", "worn out"];
    const energizingWords = ["great", "productive", "focused", "energized", "better than expected"];

    const mentionsTiring = withReflections.filter(d =>
      tiringWords.some(w => d.reflection?.toLowerCase().includes(w)) && d.outcome !== "worked"
    );
    if (mentionsTiring.length >= 2) {
      candidates.push(
        `Energy levels show up repeatedly in your decision reflections — fatigue correlates with worse outcomes in your history.`
      );
    }

    const mentionsEnergizing = withReflections.filter(d =>
      energizingWords.some(w => d.reflection?.toLowerCase().includes(w)) && d.outcome === "worked"
    );
    if (mentionsEnergizing.length >= 2) {
      candidates.push(
        `Decisions that led to positive reflections often mention feeling productive or focused — these are reliable positive signals for you.`
      );
    }
  }

  // Filter out already dismissed or confirmed insights
  return candidates.filter(c => !dismissed.has(c) && !confirmed.has(c));
}

// ─── Context summary for AI ───────────────────────────────────────────────────
// Generates a compact decision history string for injection into AI context.

export interface DecisionContextItem {
  question: string;
  recommendation: string;
  outcome?: DecisionOutcome;
  reflection?: string;
  category?: string;
}

export function buildDecisionContext(decisions: DecisionRecord[]): DecisionContextItem[] {
  return decisions
    .filter(d => d.outcome)
    .slice(0, 8)
    .map(d => ({
      question: d.question.slice(0, 80),
      recommendation: d.recommendation.slice(0, 80),
      outcome: d.outcome,
      reflection: d.reflection?.slice(0, 80),
      category: d.category,
    }));
}

// ─── Memory depth confidence adjustment ──────────────────────────────────────
// Returns how much to adjust confidence based on decision history depth.

export function getMemoryConfidenceContext(
  decisions: DecisionRecord[],
  confirmedInsights: string[],
): string {
  const resolved = decisions.filter(d => d.outcome).length;
  const stats = computeDecisionStats(decisions);

  if (resolved === 0 && confirmedInsights.length === 0) {
    return "Memory depth: minimal. User has no recorded outcomes. Cap confidence at 6/10.";
  }
  if (resolved < 5 && confirmedInsights.length < 2) {
    return `Memory depth: early. ${resolved} outcomes recorded. Cap confidence at 7/10.`;
  }
  if (resolved >= 10) {
    return `Memory depth: established. ${resolved} outcomes recorded. ${stats.successRate}% success rate. Confidence can reflect this history.`;
  }
  return `Memory depth: developing. ${resolved} outcomes, ${confirmedInsights.length} confirmed insights. Standard confidence calibration.`;
}

// ─── Empty state intelligence ─────────────────────────────────────────────────

export function getDecisionIntelligenceStatus(total: number): {
  message: string;
  detail: string;
} {
  if (total === 0) {
    return {
      message: "No decisions saved yet.",
      detail: "Apex learns from your decisions. Save a few recommendations and Apex will begin identifying patterns.",
    };
  }
  if (total < 5) {
    return {
      message: `${total} decision${total === 1 ? "" : "s"} saved.`,
      detail: "Apex is collecting signal. Keep saving decisions to unlock pattern detection.",
    };
  }
  if (total < 15) {
    return {
      message: `${total} decisions saved.`,
      detail: "Apex is beginning to recognize patterns in your decision history.",
    };
  }
  return {
    message: `${total} decisions saved.`,
    detail: "Apex has enough history to personalize recommendations based on what has worked for you.",
  };
}
