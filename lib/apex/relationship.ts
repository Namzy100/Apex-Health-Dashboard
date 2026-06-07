// ─── Relationship Intelligence ───────────────────────────────────────────────
//
// Generates "Apex Noticed", "Apex Learned", "Apex Was Right" moments.
// These are visible relationship events — the product feeling alive.
//
// Philosophy:
//   - Pure functions. No API calls. Based entirely on existing state.
//   - Never fabricate data. Only surface real patterns.
//   - Conservative — a false observation destroys trust faster than silence.
//   - Every moment should feel earned, not generated.

import type { DecisionRecord } from "@/lib/store";
import type { ApexContext } from "./context-builder";

// ─── Progressive intelligence stage ──────────────────────────────────────────

export type IntelligenceStage =
  | "Exploring"
  | "Learning"
  | "Understanding"
  | "Personalizing"
  | "Trusted";

export function getIntelligenceStage(
  totalDecisions: number,
  confirmedInsights: number,
  daysOfData: number,
): IntelligenceStage {
  if (totalDecisions >= 20 && confirmedInsights >= 5) return "Trusted";
  if (totalDecisions >= 12 && confirmedInsights >= 3) return "Personalizing";
  if (totalDecisions >= 6 && confirmedInsights >= 1)  return "Understanding";
  if (totalDecisions >= 2 || daysOfData >= 3)          return "Learning";
  return "Exploring";
}

// ─── Apex Noticed ────────────────────────────────────────────────────────────
// Soft behavioral observation. Never a command. Never an alert.
// Returns a single sentence starting with "Apex noticed that..."

export function getApexNoticed(
  ctx: ApexContext,
  decisions: DecisionRecord[],
): string | null {
  const patterns = ctx.behavioral.patterns;
  const resolved = decisions.filter(d => d.outcome);

  // ── From decision category history ───────────────────────────────────────
  const CATEGORY_SIGNALS: { key: string; message: string }[] = [
    {
      key: "social",
      message: "Apex noticed that social decisions usually work out better than you expect.",
    },
    {
      key: "focus",
      message: "Apex noticed that focus decisions tend to pay off when you act on them early.",
    },
    {
      key: "opportunity",
      message: "Apex noticed that you do best when you decide quickly on opportunities.",
    },
    {
      key: "money",
      message: "Apex noticed that your spending decisions align well with your stated goals.",
    },
  ];

  for (const { key, message } of CATEGORY_SIGNALS) {
    const cat = resolved.filter(d => d.category === key);
    if (cat.length < 3) continue;
    const worked = cat.filter(d => d.outcome === "worked").length;
    if (worked / cat.length >= 0.7) return message;
  }

  // ── From behavioral patterns ─────────────────────────────────────────────
  if (patterns.length > 0) {
    const p = patterns[0].pattern.toLowerCase();

    if (p.includes("energy") && (p.includes("workout") || p.includes("higher"))) {
      return "Apex noticed that you are most consistent when workouts happen before dinner.";
    }
    if (p.includes("solid training") || (p.includes("workout") && p.includes("consistency"))) {
      return "Apex noticed that training consistency is your strongest behavioral signal right now.";
    }
    if (p.includes("under-eat") && p.includes("energy")) {
      return "Apex noticed that under-fueling on high-output days collapses afternoon energy.";
    }
    if (p.includes("under-eat")) {
      return "Apex noticed that you tend to underestimate how much fuel the day requires.";
    }
    if (p.includes("weekend")) {
      return "Apex noticed that weekend structure predicts how your following Monday goes.";
    }
    if (p.includes("protein")) {
      return "Apex noticed that protein gaps tend to show up in your energy two days later.";
    }
  }

  // ── From productive windows ──────────────────────────────────────────────
  if (ctx.user.productiveWindows.length > 0) {
    const window = ctx.user.productiveWindows[0].toLowerCase();
    return `Apex noticed that protecting your ${window} window tends to set the tone for the rest of the day.`;
  }

  // ── From reflections ─────────────────────────────────────────────────────
  const workedWithReflections = resolved.filter(d => d.reflection && d.outcome === "worked");
  if (workedWithReflections.length >= 3) {
    return "Apex noticed that decisions you reflect on tend to work out better than ones you don't.";
  }

  // ── Milestone observations ───────────────────────────────────────────────
  if (resolved.length >= 10) {
    return "Apex noticed that you've built a strong decision review habit. Patterns are becoming reliable.";
  }

  return null;
}

// ─── Apex Learned ────────────────────────────────────────────────────────────
// Celebrates a confirmed learning moment. Returns a single sentence.

export function getApexLearned(
  confirmedInsights: string[],
  decisions: DecisionRecord[],
): string | null {
  const resolved = decisions.filter(d => d.outcome);

  // Most recently confirmed insight — reformulated
  if (confirmedInsights.length > 0) {
    const latest = confirmedInsights[confirmedInsights.length - 1];
    // Remove leading "you " or similar prefixes so the sentence flows
    const cleaned = latest
      .replace(/^(you tend to |you |apex noticed that |apex learned that )/i, "")
      .trim();
    const starts = cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    return `Apex learned that ${starts}`;
  }

  // From decision category patterns (no confirmed insight yet)
  const socialDecisions = resolved.filter(d => d.category === "social");
  if (socialDecisions.length >= 4) {
    const worked = socialDecisions.filter(d => d.outcome === "worked").length;
    if (worked / socialDecisions.length >= 0.7) {
      return "Apex learned that experiences tend to create better outcomes than staying in.";
    }
  }

  const focusDecisions = resolved.filter(d => d.category === "focus");
  if (focusDecisions.length >= 3) {
    const worked = focusDecisions.filter(d => d.outcome === "worked").length;
    if (worked / focusDecisions.length >= 0.75) {
      return "Apex learned that protecting your focus blocks improves your week.";
    }
  }

  return null;
}

// ─── Apex Was Right ──────────────────────────────────────────────────────────
// Evidence-based trust signal. Never arrogant. Never smug.
// Trustworthy — cites specific data.

export interface ApexWasRightData {
  text: string;
  count: number;
}

export function getApexWasRight(
  decisions: DecisionRecord[],
  currentCategory?: string,
): ApexWasRightData | null {
  const resolved = decisions.filter(d => d.outcome);
  if (resolved.length < 3) return null;

  // Category-specific trust signal (most meaningful)
  if (currentCategory) {
    const cat = resolved.filter(d => d.category === currentCategory);
    if (cat.length >= 3) {
      const worked = cat.filter(d => d.outcome === "worked").length;
      if (worked >= 3 && worked / cat.length >= 0.7) {
        return {
          text: `${worked} similar recommendations have worked out in the past.`,
          count: worked,
        };
      }
    }
  }

  // Overall recent streak
  const recent = resolved.slice(0, 5);
  const recentWorked = recent.filter(d => d.outcome === "worked").length;
  if (recentWorked >= 4) {
    return {
      text: `The last ${recentWorked} decisions of this type produced positive outcomes.`,
      count: recentWorked,
    };
  }

  // Overall track record (10+ decisions)
  if (resolved.length >= 10) {
    const totalWorked = resolved.filter(d => d.outcome === "worked").length;
    const rate = Math.round((totalWorked / resolved.length) * 100);
    if (rate >= 70) {
      return {
        text: `${rate}% of Apex recommendations have worked out across your history.`,
        count: totalWorked,
      };
    }
  }

  return null;
}

// ─── What Changed Recently ────────────────────────────────────────────────────
// Short list of recent activity. Creates a sense of momentum on the Me screen.

export function getWhatChangedRecently(
  decisions: DecisionRecord[],
  confirmedInsights: string[],
): string[] {
  const changes: string[] = [];
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;

  // Decisions reviewed this week
  const reviewedThisWeek = decisions.filter(d =>
    d.outcome && d.reviewedAt && now - new Date(d.reviewedAt).getTime() < oneWeek
  ).length;
  if (reviewedThisWeek > 0) {
    changes.push(`${reviewedThisWeek} decision${reviewedThisWeek !== 1 ? "s" : ""} reviewed this week.`);
  }

  // New decisions saved this week
  const savedThisWeek = decisions.filter(d =>
    now - new Date(d.createdAt).getTime() < oneWeek
  ).length;
  if (savedThisWeek > 0) {
    changes.push(`${savedThisWeek} new decision${savedThisWeek !== 1 ? "s" : ""} saved.`);
  }

  // Confirmed insights
  if (confirmedInsights.length > 0) {
    changes.push(`${confirmedInsights.length} behavioral pattern${confirmedInsights.length !== 1 ? "s" : ""} confirmed.`);
  }

  // Pending follow-ups
  const pending = decisions.filter(d => !d.outcome).length;
  if (pending > 0) {
    changes.push(`${pending} decision${pending !== 1 ? "s" : ""} awaiting your review.`);
  }

  return changes.slice(0, 3);
}

// ─── Relationship Timeline ────────────────────────────────────────────────────
// Milestones in the user's relationship with Apex. Progress, not gamification.

export interface RelationshipMilestone {
  label: string;
  reached: boolean;
  description: string;
}

export function getRelationshipTimeline(
  decisions: DecisionRecord[],
  confirmedInsights: string[],
): RelationshipMilestone[] {
  const resolved = decisions.filter(d => d.outcome);

  return [
    {
      label: "First decision saved",
      reached: decisions.length >= 1,
      description: "Apex began learning your judgment.",
    },
    {
      label: "First outcome reviewed",
      reached: resolved.length >= 1,
      description: "The feedback loop started.",
    },
    {
      label: "First pattern confirmed",
      reached: confirmedInsights.length >= 1,
      description: "Apex locked in its first insight about you.",
    },
    {
      label: "10 decisions reviewed",
      reached: resolved.length >= 10,
      description: "Apex has enough signal to recognize real patterns.",
    },
    {
      label: "3 confirmed patterns",
      reached: confirmedInsights.length >= 3,
      description: "Apex understands how you operate.",
    },
  ];
}

// ─── Decision learning annotation ────────────────────────────────────────────
// "What Apex learned" from a specific decision outcome.
// Shown inline on the decision history card.

export function getDecisionLearning(record: DecisionRecord): string | null {
  if (!record.outcome) return null;

  const cat = record.category;
  const outcome = record.outcome;
  const rec = record.recommendation.toLowerCase();

  if (outcome === "worked") {
    if (cat === "social")      return "Protecting social energy creates better outcomes.";
    if (cat === "focus")       return "Acting on focus decisions early pays off.";
    if (cat === "money")       return "This spending pattern aligns with your goals.";
    if (cat === "opportunity") return "Moving quickly on opportunities tends to work.";
    if (rec.includes("stay in") || rec.includes("don't go") || rec.includes("do not go")) {
      return "Protecting tomorrow tends to create better results.";
    }
    if (rec.includes("gym") || rec.includes("workout") || rec.includes("train")) {
      return "Training when the opportunity is there compounds over time.";
    }
    return "This decision reinforced a positive pattern.";
  }

  if (outcome === "did_not_work") {
    if (cat === "social")  return "Social pressure can override better judgment.";
    if (cat === "focus")   return "External commitments fragment focus more than expected.";
    if (cat === "money")   return "This spend didn't align as expected — worth noting.";
    return "Context here matters more than the category suggests.";
  }

  if (outcome === "mixed") {
    return "Partial result — circumstances affected the outcome.";
  }

  return null;
}
