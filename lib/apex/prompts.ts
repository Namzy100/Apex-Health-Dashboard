import type { ApexContext } from "./context-builder";
import { deriveRisk, deriveTodaysMove } from "./operating-mode";

// ─── V2.2 System prompt — Chief of Staff ─────────────────────────────────────

export const APEX_SYSTEM_PROMPT = `You are Apex — an AI chief of staff for an ambitious person.

You help the user answer one question: "What should I do next?"

You are NOT a chatbot. You are NOT a wellness app. You are a trusted advisor with full context on this person's life, goals, and behavioral patterns.

WHEN MAKING DECISIONS, use this exact format:

MY TAKE
[One clear, direct opinion. No hedging. State your position in one sentence.]

WHY
[1-2 sentences of personalized reasoning. Reference their actual goals and context.]

WHAT YOU'RE TRADING
[Be specific about the cost. What specifically do they give up?]

WHAT YOU'LL GAIN
[Be specific about the benefit. Connect it to a stated goal.]

CONFIDENCE: [1-10]

GOAL ALIGNMENT
[Name which goal(s) this decision supports.]

BANNED PHRASES:
- "it depends"
- "here are some options"
- "you may want to consider"
- "it's important to"
- "great job"
- "that's understandable"
- "as an AI"
- any hedge without completing the sentence

PERSONALITY:
- Have an opinion. Make the call.
- Bad: "It depends on how tired you are."
- Good: "Stay in tonight. You have a high-leverage morning tomorrow and late nights have consistently made your next day weaker."
- Reference their actual goals, not generic advice
- Short sentences beat long ones
- Confidence beats neutrality — be wrong sometimes, never be vague`;

// ─── Tone instructions per decision style ─────────────────────────────────────

export function getToneInstructions(decisionStyle: string): string {
  const styles: Record<string, string> = {
    direct: `TONE MODIFIER: Direct. Lead with the answer immediately. One sentence where possible. Skip qualifications. Maximum brevity.
Example MY TAKE: "Stay in tonight."`,
    balanced: `TONE MODIFIER: Balanced. State your position clearly, briefly acknowledge the main tradeoff. Opinionated but shows you considered both sides.
Example MY TAKE: "My take: stay in. The upside of going out is real, but tonight the better move is protecting tomorrow."`,
    gentle: `TONE MODIFIER: Gentle. Soften observations. Avoid harsh language. Still give a clear recommendation — just deliver it with care. No blunt calls.
Example MY TAKE: "You don't need to force a big night tonight. A quiet reset would probably serve you better."`,
    brutally_honest: `TONE MODIFIER: Blunt. Cut to the truth immediately. Call out avoidance or procrastination when relevant. Short and direct. Supportive but doesn't soften.
Example MY TAKE: "Don't go out. This is procrastination wearing a social mask."`,
  };
  return styles[decisionStyle] || styles.direct;
}

// ─── Brief generator prompt ───────────────────────────────────────────────────

export function buildBriefPrompt(ctx: ApexContext): string {
  const lines: string[] = [];

  // User identity + tone
  lines.push(`User: ${ctx.user.name}`);
  lines.push(`Decision style: ${ctx.user.decisionStyle}`);
  lines.push(getToneInstructions(ctx.user.decisionStyle || "direct"));

  if (ctx.user.goals.length > 0) {
    lines.push("Goals:");
    ctx.user.goals.forEach(g => lines.push(`  - ${g}`));
  }
  if (ctx.user.currentPriorities.length > 0) {
    lines.push(`Current priorities: ${ctx.user.currentPriorities.join(", ")}`);
  } else if (ctx.user.topPriority) {
    lines.push(`Top priority: ${ctx.user.topPriority}`);
  }
  if (ctx.user.derailers.length > 0) {
    lines.push(`Known derailers: ${ctx.user.derailers.join(", ")}`);
  }
  if (ctx.user.productiveWindows.length > 0) {
    lines.push(`Productive windows: ${ctx.user.productiveWindows.join(", ")}`);
  }
  if (ctx.user.learnedInsights.length > 0) {
    lines.push("Known behavioral insights:");
    ctx.user.learnedInsights.slice(0, 3).forEach(i => lines.push(`  - ${i}`));
  }

  // Today
  lines.push(`\nToday: ${ctx.today.dayOfWeek}, ${ctx.today.date}`);
  if (ctx.today.energyLevel) lines.push(`Energy: ${ctx.today.energyLevel}`);
  if (ctx.today.firstMeeting) lines.push(`First meeting: ${ctx.today.firstMeeting}`);
  if (ctx.today.caloriesEaten > 0) {
    lines.push(`Nutrition logged: ${ctx.today.caloriesEaten}/${ctx.user.calorieTarget} cal, ${ctx.today.proteinEaten}g protein`);
  }
  if (ctx.today.workoutLogged) lines.push(`Workout: ${ctx.today.workoutDetails}`);

  // Physical signals
  if (ctx.recent.currentWeight) lines.push(`\nWeight: ${ctx.recent.currentWeight} lbs`);
  if (ctx.recent.weightTrend) lines.push(`Trend: ${ctx.recent.weightTrend}`);

  // Behavioral intelligence
  if (ctx.behavioral.weeklySummary && ctx.behavioral.daysOfData > 0) {
    lines.push(`\nBehavioral data (last 7 days): ${ctx.behavioral.weeklySummary}`);
  }
  if (ctx.behavioral.patterns.length > 0) {
    lines.push("Detected patterns:");
    ctx.behavioral.patterns.slice(0, 3).forEach(p =>
      lines.push(`  - ${p.pattern} [${Math.round(p.confidence * 100)}% confidence]`)
    );
  }

  // ── Decision memory ──────────────────────────────────────────────────────
  if (ctx.memory.confirmedInsights.length > 0) {
    lines.push("\nConfirmed behavioral insights:");
    ctx.memory.confirmedInsights.slice(0, 3).forEach(i => lines.push(`  - ${i}`));
  }
  if (ctx.memory.recentOutcomes.length > 0) {
    lines.push("Recent decisions with outcomes:");
    ctx.memory.recentOutcomes.slice(0, 4).forEach(d => {
      lines.push(`  - "${d.question.slice(0, 50)}" → ${d.outcome || "pending"}${d.reflection ? ` ("${d.reflection.slice(0, 40)}")` : ""}`);
    });
  }
  lines.push(ctx.memory.confidenceContext);

  const context = lines.join("\n");

  return `${context}

Generate a morning chief-of-staff brief for ${ctx.user.name}.

Return JSON:
{
  "text": "2-3 sentence briefing. Start with a behavioral observation or context framing — not a data summary. Make it feel like a trusted advisor read the room and is giving their take.",
  "todaysMove": "One sentence. The single most important action today. Start with a verb. Be specific: not 'work on your project' but 'Finish the SVN content plan before 4 PM'.",
  "todaysMoveWhy": "One sentence. Why this move matters more than anything else today. Connect to their goals.",
  "focusItems": [
    "3 specific priorities for today. Mix domains based on their actual goals. Actionable, specific, time-aware."
  ],
  "tonightRec": "One sentence. Clear evening recommendation. Specific and consistent with tomorrow.",
  "risk": "One sentence. The most important thing to avoid today. Specific to their situation, not generic.",
  "anchors": [
    "Priority anchor — e.g. 'Top priority: Stripe integration deadline'",
    "Schedule anchor — e.g. 'First meeting: 2:00 PM' or 'Clear calendar — protect it'",
    "Progress anchor — e.g. 'Weight: 184 lbs · down 0.8' or 'Training: 3 days this week'"
  ],
  "chips": ["3 decision questions this person is most likely wrestling with today"]
}

Rules:
- focusItems: max 3 items, each one specific to their actual stated goals
- tonightRec: one clear sentence, not a list
- chips: questions they are genuinely likely to ask Apex, not generic
- Maximum 80 words for the text field`;
}

// ─── Chat system prompt ───────────────────────────────────────────────────────

export function buildChatSystemPrompt(ctx: ApexContext): string {
  const toneInstructions = getToneInstructions(ctx.user.decisionStyle || "direct");
  const lines: string[] = [APEX_SYSTEM_PROMPT, "\n\n" + toneInstructions, "\n\nUser context:"];

  lines.push(`Name: ${ctx.user.name}`);
  if (ctx.user.goals.length > 0) lines.push(`Goals: ${ctx.user.goals.join(" | ")}`);
  if (ctx.user.topPriority) lines.push(`Priority: ${ctx.user.topPriority}`);
  lines.push(`Decision style preference: ${ctx.user.decisionStyle}`);
  if (ctx.user.derailers.length > 0) lines.push(`Known derailers: ${ctx.user.derailers.join(", ")}`);
  if (ctx.user.productiveWindows.length > 0) lines.push(`Best hours: ${ctx.user.productiveWindows.join(", ")}`);
  if (ctx.user.learnedInsights.length > 0) {
    lines.push("Behavioral insights:");
    ctx.user.learnedInsights.slice(0, 3).forEach(i => lines.push(`  - ${i}`));
  }

  lines.push(`\nToday: ${ctx.today.dayOfWeek}`);
  if (ctx.today.energyLevel) lines.push(`Energy: ${ctx.today.energyLevel}`);
  if (ctx.today.firstMeeting) lines.push(`First meeting: ${ctx.today.firstMeeting}`);
  lines.push(`Health signals: ${ctx.today.caloriesEaten}/${ctx.user.calorieTarget} cal`);
  if (ctx.recent.currentWeight) lines.push(`Weight: ${ctx.recent.currentWeight} lbs`);

  if (ctx.behavioral.patterns.length > 0) {
    lines.push("\nDetected patterns:");
    ctx.behavioral.patterns.slice(0, 3).forEach(p => lines.push(`  - ${p.pattern}`));
  }

  // ── Decision memory context ──────────────────────────────────────────────
  if (ctx.memory.totalDecisions > 0) {
    lines.push(`\n${ctx.memory.confidenceContext}`);
  }

  if (ctx.memory.confirmedInsights.length > 0) {
    lines.push("\nConfirmed behavioral insights about this user:");
    ctx.memory.confirmedInsights.slice(0, 4).forEach(i => lines.push(`  - ${i}`));
  }

  if (ctx.memory.recentOutcomes.length > 0) {
    lines.push("\nRecent decision outcomes:");
    ctx.memory.recentOutcomes.slice(0, 5).forEach(d => {
      const line = `  - "${d.question.slice(0, 60)}" → ${d.recommendation.slice(0, 60)} → ${d.outcome || "outcome unknown"}${d.reflection ? ` ("${d.reflection.slice(0, 50)}")` : ""}`;
      lines.push(line);
    });
    if (ctx.memory.successRate > 0) {
      lines.push(`  Overall success rate: ${ctx.memory.successRate}% across ${ctx.memory.totalDecisions} decisions`);
    }
  }

  lines.push(`\nFor decision questions: use MY TAKE / WHY / WHAT YOU'RE TRADING / WHAT YOU'LL GAIN / CONFIDENCE / GOAL ALIGNMENT format. Keep each section to 1-2 sentences. Total response under 200 words unless user requests a plan.`);
  lines.push(`CONFIDENCE: ${ctx.memory.confidenceContext.includes("minimal") ? "Cap at 6/10." : ctx.memory.confidenceContext.includes("early") ? "Cap at 7/10." : "Use historical outcomes to calibrate."} Never claim 9-10/10 without strong supporting evidence from this user's history.`);

  return lines.join("\n");
}

// ─── Mock brief ───────────────────────────────────────────────────────────────

export function getMockBrief(ctx: ApexContext): {
  text: string;
  anchors: [string, string, string];
  chips: string[];
  risk: string;
  todaysMove: string;
  todaysMoveWhy: string;
  focusItems: string[];
  tonightRec: string;
} {
  const risk = deriveRisk(ctx);
  const todaysMove = deriveTodaysMove(ctx);
  const todaysMoveWhy = deriveTodaysMoveWhy(ctx);
  const focusItems = buildFocusItems(ctx).slice(0, 3);
  const tonightRec = buildTonightRec(ctx);
  const brief = buildBriefText(ctx);
  const chips = deriveChips(ctx);

  const priorityAnchor = ctx.user.topPriority
    ? `Priority: ${ctx.user.topPriority}`
    : ctx.user.goals[0]
    ? `Goal: ${ctx.user.goals[0].slice(0, 45)}`
    : "Set your goals in the Me tab";

  const schedAnchor = ctx.today.firstMeeting
    ? `First meeting: ${ctx.today.firstMeeting}`
    : "No meetings set — protect the day";

  const bodyAnchor = ctx.recent.currentWeight
    ? `Weight: ${ctx.recent.currentWeight} lbs${ctx.recent.weightTrend ? ` · ${ctx.recent.weightTrend}` : ""}`
    : ctx.today.workoutLogged
    ? "Workout logged today"
    : "Log a workout or weight";

  return {
    text: brief,
    anchors: [priorityAnchor, schedAnchor, bodyAnchor],
    chips,
    risk,
    todaysMove,
    todaysMoveWhy,
    focusItems,
    tonightRec,
  };
}

// ─── Derivation helpers ───────────────────────────────────────────────────────

function deriveTodaysMoveWhy(ctx: ApexContext): string {
  const patterns = ctx.behavioral.patterns;
  const topPattern = patterns[0];

  if (ctx.behavioral.daysOfData < 3) {
    if (!ctx.today.hasLoggedFood) return "Logging today builds the data Apex needs to give you useful recommendations.";
    return "Establishing your baseline is the prerequisite for everything else Apex can do for you.";
  }

  const priority = ctx.user.topPriority || ctx.user.goals[0];
  if (priority) {
    return `This creates more momentum on ${priority.slice(0, 50)} than anything else on today's schedule.`;
  }
  if (topPattern) {
    const p = topPattern.pattern.toLowerCase();
    if (p.includes("training")) return "Your energy and focus are reliably higher on days you train — this compounds.";
    if (p.includes("under-eat")) return "Fueling properly prevents the afternoon energy collapse that's been cutting your output short.";
  }
  return "This is the highest-leverage action today — everything else is secondary.";
}

function buildFocusItems(ctx: ApexContext): string[] {
  const items: string[] = [];
  const patterns = ctx.behavioral.patterns;
  const topPattern = patterns[0];

  // Lead with work priority
  if (ctx.user.topPriority) {
    items.push(`${ctx.user.topPriority} — focused block, not multitasking`);
  } else if (ctx.user.goals.length > 0) {
    items.push(`${ctx.user.goals[0]} — make a concrete move today`);
  }

  // Fitness if relevant (not first unless it's in goals position 1)
  if (!ctx.today.workoutLogged) {
    if (topPattern && topPattern.pattern.toLowerCase().includes("training")) {
      items.push("Gym — protect the consistency streak");
    } else {
      items.push("Movement — 30 min minimum");
    }
  }

  // Second goal if exists
  if (ctx.user.goals.length > 1 && !items.some(i => i.includes(ctx.user.goals[1].slice(0, 15)))) {
    items.push(ctx.user.goals[1].length > 55 ? ctx.user.goals[1].slice(0, 55) + "…" : ctx.user.goals[1]);
  }

  // Nutrition (only if not logged yet and it's morning)
  const calLeft = ctx.user.calorieTarget - ctx.today.caloriesEaten;
  if (calLeft > ctx.user.calorieTarget * 0.85) {
    items.push(`Eat to target today`);
  }

  return items.slice(0, 3);
}

function buildTonightRec(ctx: ApexContext): string {
  const hasEarlyMeeting = ctx.today.firstMeeting && ctx.today.firstMeeting < "10:00";
  const hasWeekendPattern = ctx.behavioral.patterns.some(p =>
    p.pattern.toLowerCase().includes("weekend")
  );

  if (hasEarlyMeeting) return "Bed by 10:30 PM — you have an early start.";
  if (hasWeekendPattern && (ctx.today.dayOfWeek === "Friday" || ctx.today.dayOfWeek === "Saturday")) {
    return "Stay close to your routine tonight — weekend disruption is a known pattern.";
  }
  return "Stay in, cook dinner, and sleep before midnight.";
}

function buildBriefText(ctx: ApexContext): string {
  const patterns = ctx.behavioral.patterns;
  const hasPatterns = patterns.length > 0 && ctx.behavioral.daysOfData >= 3;

  if (ctx.behavioral.daysOfData < 3) {
    const priority = ctx.user.topPriority || (ctx.user.goals[0] || null);
    const daysLeft = Math.max(0, 3 - ctx.behavioral.daysOfData);
    return `Apex is still calibrating your baseline — ${daysLeft} more day${daysLeft !== 1 ? "s" : ""} of data needed before patterns emerge.${priority ? ` For now: ${priority} is the priority.` : ""} Log consistently and the recommendations get sharper.`;
  }

  if (!hasPatterns) {
    const priority = ctx.user.topPriority || (ctx.user.goals[0] || "your main goal");
    return `Your data is stable and no strong behavioral patterns have emerged yet — that's a clean slate to work with. ${priority} is the priority. ${ctx.today.firstMeeting ? `Protect the block before your ${ctx.today.firstMeeting} meeting.` : "Use the open window."}`;
  }

  const top = patterns[0];
  const p = top.pattern.toLowerCase();

  if (p.includes("under-eat")) {
    return `The under-eating pattern is running again — ${top.pattern.toLowerCase()}. That's been compressing your afternoon focus window. Fuel first today, everything else follows from that.`;
  }
  if (p.includes("training") || (p.includes("workout") && p.includes("consistency"))) {
    return `Training consistency is your current edge — ${top.pattern.toLowerCase()}. That's keeping your energy and output above baseline. ${ctx.user.topPriority ? `Keep ${ctx.user.topPriority} as the anchor.` : ""} Protect the streak.`;
  }
  if (p.includes("energy") && p.includes("workout")) {
    return `There's a clear link in your data: training days are your best output days. ${top.pattern.toLowerCase()}. Today's gym decision matters more than just fitness.`;
  }
  if (p.includes("weekend")) {
    return `The weekend disruption pattern is showing — ${top.pattern.toLowerCase()}. Monday needs more structure than usual to prevent the week from drifting. Lock your morning now.`;
  }

  return `${top.pattern.replace(/^[a-z]/, c => c.toUpperCase())}. ${ctx.user.topPriority ? `${ctx.user.topPriority} is still the priority.` : "The data is telling you something — act on it today."}`;
}

function deriveChips(ctx: ApexContext): string[] {
  const chips: string[] = ["Plan my day"];

  const day = ctx.today.dayOfWeek;
  if (day === "Friday" || day === "Saturday" || day === "Sunday") {
    chips.push("Should I go out tonight?");
  } else {
    chips.push("What should I focus on?");
  }

  if (ctx.user.commonDecisionCategories.includes("money")) {
    chips.push("Is this worth spending on?");
  } else if (ctx.user.commonDecisionCategories.includes("opportunities")) {
    chips.push("Should I say yes to this?");
  } else {
    chips.push("Am I on track?");
  }

  return chips;
}

// ─── Mock chat responses — V2.1 chief of staff format ────────────────────────

export function getMockChatResponse(message: string, ctx: ApexContext): string {
  const lower = message.toLowerCase();
  const calLeft = ctx.user.calorieTarget - ctx.today.caloriesEaten;
  const protLeft = Math.round(ctx.user.proteinTarget - ctx.today.proteinEaten);
  const goals = ctx.user.goals;
  const priority = ctx.user.topPriority || goals[0] || "your top goal";
  const topPattern = ctx.behavioral.patterns[0];
  const style = ctx.user.decisionStyle || "direct";

  // ── Tonight / social decisions ─────────────────────────────────────────
  if (lower.includes("go out") || (lower.includes("tonight") && !lower.includes("tonight recommendation")) || lower.includes("stay in or")) {
    const hasMeeting = ctx.today.firstMeeting && ctx.today.firstMeeting < "11:00";
    const hasEnergyIssue = ctx.today.energyLevel === "low" || (topPattern && topPattern.pattern.toLowerCase().includes("energy"));
    const rec = hasMeeting || hasEnergyIssue ? "Stay in tonight." : "Keep it early and optional — out by 11.";
    const confidence = hasMeeting || hasEnergyIssue ? 9 : 6;

    return `MY TAKE\n${rec}\n\nWHY\n${hasMeeting ? `You have an ${ctx.today.firstMeeting} start tomorrow — late nights compress your next day's output.` : hasEnergyIssue ? "Your energy is already running low. A social night won't fix that." : "No hard constraints, but late nights reliably tank the following morning."}\n\nWHAT YOU'RE TRADING\nA social opportunity. Probably a fun night.\n\nWHAT YOU'LL GAIN\nA sharper morning, more capacity for ${priority}.\n\nCONFIDENCE: ${confidence}/10\n\nGOAL ALIGNMENT\nProtects your ability to execute on: ${priority}.`;
  }

  // ── I feel off / recovery ─────────────────────────────────────────────
  if (lower.includes("feel off") || lower.includes("wasted the day") || lower.includes("get back on track") || lower.includes("i need a plan")) {
    return `MY TAKE\nStop trying to salvage the whole day — salvage the next 2 hours.\n\nWHY\nPerfectionism about a lost day usually kills the evening too. One focused block beats zero.\n\nWHAT YOU'RE TRADING\nThe feeling of having a "complete" day.\n\nWHAT YOU'LL GAIN\nMomentum into tomorrow. That's what actually matters.\n\nCONFIDENCE: 9/10\n\nGOAL ALIGNMENT\nGets you back toward: ${priority}.`;
  }

  // ── Money decisions ────────────────────────────────────────────────────
  if (lower.includes("spend") || lower.includes("buy") || lower.includes("worth it") || lower.includes("purchase")) {
    const hasFinancialGoal = goals.some(g => g.toLowerCase().includes("spend") || g.toLowerCase().includes("budget") || g.toLowerCase().includes("sav"));
    const rec = hasFinancialGoal ? "No — your goals say otherwise." : "Ask if it moves any of your goals forward. If not, hold off.";
    const conf = hasFinancialGoal ? 9 : 6;
    return `MY TAKE\n${rec}\n\nWHY\n${hasFinancialGoal ? "You've set a financial goal. Every exception weakens the constraint." : "Non-essential spending is fine when it's intentional. The question is whether this is intentional or reactive."}\n\nWHAT YOU'RE TRADING\nThe money and the future optionality it represents.\n\nWHAT YOU'LL GAIN\n${hasFinancialGoal ? "Staying on track with your financial goal." : "Clarity on whether you're spending with intention."}\n\nCONFIDENCE: ${conf}/10\n\nGOAL ALIGNMENT\n${hasFinancialGoal ? "Directly supports your financial goals." : "Unclear — needs more context."}`;
  }

  // ── Opportunity / yes or no ────────────────────────────────────────────
  if (lower.includes("say yes") || lower.includes("opportunity") || lower.includes("should i take") || lower.includes("worth my time")) {
    return `MY TAKE\nOnly say yes if it clearly serves one of your active goals.\n\nWHY\nEvery yes is a no to something else. At your stage, focus compounds faster than variety.\n\nWHAT YOU'RE TRADING\nPossible upside from this opportunity.\n\nWHAT YOU'LL GAIN\nDepth on what already matters: ${goals.slice(0, 2).join(", ")}.\n\nCONFIDENCE: 7/10\n\nGOAL ALIGNMENT\nFilter it against: ${goals.slice(0, 2).join("; ")}. If it doesn't serve those, decline.`;
  }

  // ── Prioritize / what to focus on ─────────────────────────────────────
  if (lower.includes("prioritize") || lower.includes("focus on") || lower.includes("cut from") || lower.includes("what should i work")) {
    return `MY TAKE\n${priority} is the answer. Everything else is maintenance until that moves.\n\nWHY\nYou've identified it as the priority — which means every other task is either enabling it or competing with it.\n\nWHAT YOU'RE TRADING\nProgress on other things.\n\nWHAT YOU'LL GAIN\nCompound momentum on what matters most.\n\nCONFIDENCE: 9/10\n\nGOAL ALIGNMENT\nDirectly advances: ${priority}.`;
  }

  // ── Weekend planning ────────────────────────────────────────────────────
  if (lower.includes("weekend") || lower.includes("saturday") || lower.includes("sunday")) {
    const hasPattern = topPattern && topPattern.pattern.toLowerCase().includes("weekend");
    return `MY TAKE\nBuild two anchors: same wake time, one focused work block.\n\nWHY\n${hasPattern ? "Your data shows a pattern: unstructured weekends directly precede your worst Mondays." : "Weekends without any structure reliably erode the momentum built during the week."}\n\nWHAT YOU'RE TRADING\nFull spontaneity.\n\nWHAT YOU'LL GAIN\nA Monday that starts with velocity instead of recovery.\n\nCONFIDENCE: 8/10\n\nGOAL ALIGNMENT\nProtects your ability to make progress on: ${priority} next week.`;
  }

  // ── Food ────────────────────────────────────────────────────────────────
  if (lower.includes("eat") || lower.includes("food") || lower.includes("lunch") || lower.includes("breakfast") || lower.includes("dinner")) {
    if (calLeft > 200) {
      return `You have ${calLeft} cal and ${protLeft}g protein left. Best options: Greek yogurt + almonds (280 cal, 22g protein), chicken bowl (600 cal, 48g), or eggs + toast + protein shake (500 cal, 45g). The chicken bowl gives you the best protein-to-calorie ratio. Go with that.`;
    }
    return `You're close to target — ${ctx.today.caloriesEaten} cal logged. Focus on protein now: Greek yogurt, eggs, or a protein shake to close the ${protLeft}g gap.`;
  }

  // ── Day planning ────────────────────────────────────────────────────────
  if (lower.includes("plan") || lower.includes("plan my day") || lower.includes("schedule") || lower.includes("morning")) {
    const meeting = ctx.today.firstMeeting || "your first commitment";
    return `Here's the structure: eat first if you haven't (${calLeft > 400 ? `${calLeft} cal still needed` : "you're close to target"}), then a focused block on ${priority} until ${meeting}. No context-switching before the meeting. After: gym. That's the play.`;
  }

  // ── Progress check ─────────────────────────────────────────────────────
  if (lower.includes("on track") || lower.includes("progress") || lower.includes("am i doing")) {
    const hasWeight = ctx.recent.currentWeight;
    const weightLine = hasWeight ? `Weight is at ${ctx.recent.currentWeight} lbs${ctx.recent.weightTrend ? ` — ${ctx.recent.weightTrend}` : ""}.` : "Log your weight for a progress read.";
    const patternLine = topPattern ? ` Main pattern: ${topPattern.pattern}.` : "";
    return `${weightLine}${patternLine} The real scorecard: did ${priority} move today? That's the number that matters most.`;
  }

  // ── Workout ─────────────────────────────────────────────────────────────
  if (lower.includes("workout") || lower.includes("gym") || lower.includes("train") || lower.includes("exercise")) {
    const hasStreak = topPattern && topPattern.pattern.toLowerCase().includes("training");
    return `${hasStreak ? "You're on a streak — protect it." : "Get it done today."} ${ctx.today.energyLevel === "low" ? "70% effort is the right call when energy is low. Consistent effort beats maximum effort." : "You have the fuel for a solid session."} Compound movements, under 60 minutes.`;
  }

  // ── Default: proactive ─────────────────────────────────────────────────
  if (ctx.today.caloriesEaten === 0) {
    return `Nothing logged yet today. Fuel first — everything else (energy, focus, output) traces back to whether you're properly fed. What's your first meal?`;
  }
  if (calLeft > 600) {
    return `You still have ${calLeft} cal and ${protLeft}g protein to hit today. Most useful next step: plan your next two meals now. What do you have access to?`;
  }
  return `You're at ${ctx.today.caloriesEaten} cal today. ${priority} is the priority. What are you trying to decide?`;
}
