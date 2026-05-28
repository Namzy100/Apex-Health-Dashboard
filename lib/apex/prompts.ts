import type { ApexContext } from "./context-builder";

// ─── Core system prompt ───────────────────────────────────────────────────────

export const APEX_SYSTEM_PROMPT = `You are Apex — a behavioral operating system for an ambitious founder.

Your role: observant chief of staff. You have full context about this person's physiology, behavioral patterns, work habits, and goals. You have seen their data across weeks, not just today.

CORE OPERATING PRINCIPLE — Notice, do not summarize.
  Wrong: "You ate 1700 calories yesterday."
  Right: "You're under-eating again. That's why your energy keeps collapsing midweek."

  Wrong: "You had 4 meetings today."
  Right: "Your mornings have been fragmented for 5 straight days. Your output drops every time that happens."

Personality:
- Direct and specific. No preamble, no filler.
- Pattern-aware: Reference behavioral trends, not just today's snapshot.
- Predictive: Tell the user what will happen if the current pattern continues.
- Confident: Make recommendations. Never hedge. "Eat the chicken bowl" not "you could try eating..."
- Grounded in evidence: Reference actual numbers when calling out patterns.
- Never say "great job", "amazing", "as an AI", "it's important to", "don't forget to", or anything therapy-adjacent.
- Never give generic wellness advice. Everything must be specific to this person's data.
- Treat the user as a high-functioning adult who can handle honest, uncomfortable observations.
- Brevity is intelligence. Say the essential thing in the fewest words.`;

// ─── Brief generator prompt ───────────────────────────────────────────────────

export function buildBriefPrompt(ctx: ApexContext): string {
  const lines: string[] = [];

  // User context
  lines.push(`User: ${ctx.user.name}`);
  lines.push(`Goal: ${ctx.user.goal}`);
  lines.push(
    `Targets: ${ctx.user.calorieTarget} cal/day, ${ctx.user.proteinTarget}g protein/day, ${ctx.user.stepTarget} steps/day`
  );
  if (ctx.user.topPriority)
    lines.push(`Top priority this week: ${ctx.user.topPriority}`);

  // Today
  lines.push(`\nToday: ${ctx.today.dayOfWeek}, ${ctx.today.date}`);
  if (ctx.today.energyLevel) lines.push(`Energy: ${ctx.today.energyLevel}`);
  lines.push(
    `Calories so far: ${ctx.today.caloriesEaten} / ${ctx.user.calorieTarget}`
  );
  lines.push(
    `Protein so far: ${ctx.today.proteinEaten}g / ${ctx.user.proteinTarget}g`
  );
  if (ctx.today.steps > 0)
    lines.push(`Steps: ${ctx.today.steps.toLocaleString()}`);
  if (ctx.today.firstMeeting)
    lines.push(`First meeting: ${ctx.today.firstMeeting}`);
  if (ctx.today.workoutLogged)
    lines.push(`Workout logged: ${ctx.today.workoutDetails}`);

  // Weight / goal progress
  if (ctx.recent.currentWeight)
    lines.push(`\nCurrent weight: ${ctx.recent.currentWeight} lbs`);
  if (ctx.recent.weightTrend)
    lines.push(`Weight trend: ${ctx.recent.weightTrend}`);
  if (ctx.goals.weightRemaining != null)
    lines.push(`Remaining to goal: ${ctx.goals.weightRemaining} lbs`);
  if (ctx.goals.daysToDeadline != null)
    lines.push(`Days to deadline: ${ctx.goals.daysToDeadline}`);
  if (ctx.goals.weeklyRateNeeded != null)
    lines.push(`Weekly rate needed: ${ctx.goals.weeklyRateNeeded} lbs/week`);

  // ── Behavioral intelligence ──────────────────────────────────────────────
  lines.push(`\nLast 7 days: ${ctx.behavioral.weeklySummary}`);
  lines.push(`Days of data: ${ctx.behavioral.daysOfData}`);

  if (ctx.behavioral.patterns.length > 0) {
    lines.push("\nBehavioral patterns detected:");
    ctx.behavioral.patterns.slice(0, 4).forEach(p => {
      lines.push(
        `- ${p.pattern} [confidence: ${Math.round(p.confidence * 100)}%]`
      );
    });
  }

  const context = lines.join("\n");

  return `${context}

Generate a morning brief for ${ctx.user.name}.

CRITICAL INSTRUCTION: Do NOT summarize data. SYNTHESIZE behavior.
Ask yourself: What is this person's current behavioral loop? Where are they stuck? What will happen today if nothing changes? What specific action breaks the pattern?

The brief should contain:
1. What you noticed (the behavioral reality, not today's numbers)
2. Why it matters (consequence or trajectory)
3. What to do today (one clear, specific action)

Return a JSON object with exactly these fields:
{
  "brief": "3-4 sentences. Start with the most important behavioral observation — a pattern, a drift, a loop. Reference specific numbers from history, not just today. State the consequence clearly. End with the single most important action for today. Max 90 words.",
  "anchors": [
    "food anchor — specific to today, e.g. '1,340 cal left · 89g protein still needed'",
    "schedule anchor — e.g. 'First meeting: 2:00 PM' or 'Clear day — protect the morning'",
    "body anchor — e.g. 'Current: 178.2 lbs · down 0.6 this week' or 'Log weight this morning'"
  ],
  "chips": ["3 chips — the most urgent questions for this specific person right now, based on patterns"]
}

Rules:
- Do not start with "Good morning" or any greeting.
- Do not use bullet points inside the brief.
- Do not say "remember to", "make sure you", "don't forget", "it's important to".
- Do not hedge recommendations.
- Maximum 90 words for the brief field.
- The chips must be questions this specific person should be asking, not generic suggestions.`;
}

// ─── Chat system prompt with full context ─────────────────────────────────────

export function buildChatSystemPrompt(ctx: ApexContext): string {
  const lines: string[] = [APEX_SYSTEM_PROMPT, "\n\nCurrent context:"];

  lines.push(`User: ${ctx.user.name}`);
  lines.push(`Goal: ${ctx.user.goal}`);
  lines.push(`Today: ${ctx.today.dayOfWeek}, ${ctx.today.date}`);
  lines.push(
    `Calories: ${ctx.today.caloriesEaten}/${ctx.user.calorieTarget} eaten`
  );
  lines.push(
    `Protein: ${ctx.today.proteinEaten}g/${ctx.user.proteinTarget}g eaten`
  );
  if (ctx.today.energyLevel) lines.push(`Energy: ${ctx.today.energyLevel}`);
  if (ctx.today.firstMeeting)
    lines.push(`First meeting: ${ctx.today.firstMeeting}`);
  if (ctx.user.topPriority)
    lines.push(`Top priority: ${ctx.user.topPriority}`);
  if (ctx.recent.currentWeight)
    lines.push(`Weight: ${ctx.recent.currentWeight} lbs`);
  if (ctx.recent.weightTrend)
    lines.push(`Weight trend: ${ctx.recent.weightTrend}`);
  if (ctx.goals.weightRemaining != null)
    lines.push(`Remaining to goal: ${ctx.goals.weightRemaining} lbs`);
  if (ctx.goals.daysToDeadline != null)
    lines.push(`Days to deadline: ${ctx.goals.daysToDeadline}`);

  // Include behavioral patterns in chat too
  if (ctx.behavioral.patterns.length > 0) {
    lines.push(`\nLast 7 days: ${ctx.behavioral.weeklySummary}`);
    lines.push("Behavioral patterns:");
    ctx.behavioral.patterns.slice(0, 3).forEach(p => {
      lines.push(`- ${p.pattern}`);
    });
  }

  lines.push(
    "\nRespond in 2-4 sentences unless the user explicitly asks for a plan or breakdown. Be specific to their data and patterns. Make a clear recommendation. Never hedge."
  );

  return lines.join("\n");
}

// ─── Pattern-specific brief builder ──────────────────────────────────────────
// Each pattern type has its own voice. The brief leads with behavioral observation,
// not today's data. Data is used to anchor the observation, not lead it.

function buildPatternLedBrief(
  topPattern: import("./memory").BehavioralPattern,
  ctx: ApexContext,
  calLeft: number
): string {
  const p = topPattern.pattern.toLowerCase();
  const priority = ctx.user.topPriority;
  const meeting = ctx.today.firstMeeting;
  const pat = topPattern.pattern.replace(/^[a-z]/, c => c.toUpperCase());

  if (p.includes("under-eat")) {
    return `The under-eating pattern is still running. ${pat}. If today goes the same way, your energy collapses before 3 PM and the afternoon is gone. ${priority ? `That's the worst time to be pushing on ${priority}.` : "That's the worst time for anything that matters."} Eat a real breakfast before you open the laptop.`;
  }

  if (p.includes("weekend")) {
    return `Your weekends are disrupting your week. ${pat}. Monday is usually where the week derails — ${ctx.today.dayOfWeek === "Monday" ? "that's today" : "watch for it"}. ${priority ? `${priority} needs your structured weekday version, not the post-weekend fog.` : "Get the routine back."} ${meeting ? `Log food today and protect the block before your ${meeting} meeting.` : "Log food today and rebuild the structure."}`;
  }

  if (p.includes("training") || (p.includes("workout") && p.includes("consistency"))) {
    return `${pat}. That training streak is doing more than fitness — it's the main driver of your energy and focus right now. ${priority ? `${priority} gets your best hours on the days you move.` : "Keep this going."} ${calLeft > 0 ? `Eat first (${calLeft} cal still needed today), then protect the workout slot.` : `Protect the workout slot today.`}`;
  }

  if (p.includes("energy") && (p.includes("workout") || p.includes("higher"))) {
    return `${pat}. That's not coincidence — training is the most reliable energy lever you have. ${priority ? `${priority} gets better work on the days you've moved.` : "Use this."} ${calLeft > 500 ? `Eat properly today (${calLeft} cal left), then decide on the workout.` : "Build the workout in today."}`;
  }

  if (p.includes("protein")) {
    return `Protein is the recurring miss — ${pat}. That gap is slowing recovery and leaving you under-fuelled for focused work. ${priority ? `${priority} gets worse work when you're running on empty protein.` : ""} ${meeting ? `Plan a protein-dense lunch before your ${meeting}.` : "Fix it at lunch today."} Front-load your protein.`;
  }

  if (p.includes("log") && p.includes("only")) {
    return `You've been logging inconsistently — ${pat.toLowerCase()}. Without data I'm working blind on your patterns. ${priority ? `${priority} is the work priority, but your nutrition is the input.` : ""} ${meeting ? `Log every meal today, starting with breakfast before your ${meeting}.` : "Log every meal today, starting now."}`;
  }

  // Generic pattern lead
  return `${pat}. ${priority ? `${priority} is the work priority today.` : "The work priority is clear."} ${meeting ? `First meeting at ${meeting} — protect the morning.` : "Calendar looks clear — use the block."} ${calLeft > 800 ? `You're ${calLeft} cal short — eat before you work.` : "Eat well and execute."}`;
}

// ─── Mock brief ───────────────────────────────────────────────────────────────
// Used when no API key is present. Demonstrates behavioral synthesis even in
// mock mode — patterns over summaries.

export function getMockBrief(ctx: ApexContext): {
  brief: string;
  anchors: [string, string, string];
  chips: string[];
} {
  const calLeft = ctx.user.calorieTarget - ctx.today.caloriesEaten;
  const protLeft = Math.round(ctx.user.proteinTarget - ctx.today.proteinEaten);

  // A pattern is "strong" if confidence > 0.72 AND it's not just a momentum trend
  const strongPatterns = ctx.behavioral.patterns.filter(
    p => p.confidence >= 0.72 && !p.pattern.toLowerCase().includes("tightening") && !p.pattern.toLowerCase().includes("drifting above")
  );
  const topPattern = strongPatterns.length > 0 ? strongPatterns[0] : null;

  let brief: string;

  // ── Pattern-led brief: behavioral observation always leads when data exists ─
  if (topPattern && ctx.behavioral.daysOfData >= 3) {
    brief = buildPatternLedBrief(topPattern, ctx, calLeft);
  } else if (ctx.today.caloriesEaten === 0) {
    // No patterns yet → forward-looking setup brief
    brief = `Nothing logged yet — the day is unwritten. Your target is ${ctx.user.calorieTarget} cal and ${ctx.user.proteinTarget}g protein. ${ctx.user.topPriority ? `${ctx.user.topPriority} is the priority today — guard your morning before it disappears.` : "Your first work block is your most valuable — don't let it fill with admin."} ${ctx.today.firstMeeting ? `First meeting at ${ctx.today.firstMeeting}.` : "Calendar looks clear."} Eat breakfast, then open the laptop.`;
  } else if (calLeft > 800) {
    brief = `You're ${calLeft} cal short with ${protLeft}g protein still needed — that's two real meals left today. ${ctx.user.topPriority ? `Don't let the deficit bleed into your focus on ${ctx.user.topPriority}.` : "Undereating will cost you focus before it costs you weight."} ${ctx.today.firstMeeting ? `First meeting at ${ctx.today.firstMeeting} — eat before it.` : "No meetings blocking you."} Eat before you work.`;
  } else {
    const proteinClose = protLeft > 0 && protLeft < 40;
    brief = `You're on track — ${ctx.today.caloriesEaten} cal and ${ctx.today.proteinEaten}g protein in. ${ctx.user.topPriority ? `${ctx.user.topPriority} should be getting your best hours today.` : "The day is set up well."} ${ctx.today.firstMeeting ? `Meeting at ${ctx.today.firstMeeting} — protect the window before it.` : "No meetings blocking you."} ${proteinClose ? `Close the ${protLeft}g protein gap before tonight.` : !ctx.today.workoutLogged ? "Get the workout done — you have the fuel for it." : "This is what a solid day looks like."}`;
  }

  // Anchors
  const calAnchor =
    ctx.today.caloriesEaten > 0
      ? `${calLeft > 0 ? calLeft.toLocaleString() + " cal left" : "Calories hit"} · ${protLeft > 0 ? protLeft + "g protein still needed" : "Protein hit"}`
      : `Eat ${ctx.user.calorieTarget.toLocaleString()} cal · hit ${ctx.user.proteinTarget}g protein`;
  const schedAnchor = ctx.today.firstMeeting
    ? `First meeting: ${ctx.today.firstMeeting}`
    : "No meetings logged — protect the day";
  const bodyAnchor = ctx.recent.currentWeight
    ? `Current: ${ctx.recent.currentWeight} lbs${ctx.recent.weightTrend ? ` · ${ctx.recent.weightTrend}` : ""}`
    : "Log weight this morning";

  // Chips — derived from state, not generic
  const chips: string[] =
    ctx.today.caloriesEaten === 0
      ? ["What should I eat first?", "Plan my morning", "What's my goal?"]
      : calLeft > 600
      ? ["What should I eat next?", "How do I hit my protein?", "Should I work out today?"]
      : ["Am I going to hit my goal?", "Should I work out today?", "What should I work on first?"];

  return { brief, anchors: [calAnchor, schedAnchor, bodyAnchor], chips };
}

// ─── Mock chat responses ──────────────────────────────────────────────────────

export function getMockChatResponse(message: string, ctx: ApexContext): string {
  const lower = message.toLowerCase();
  const calLeft = ctx.user.calorieTarget - ctx.today.caloriesEaten;
  const protLeft = Math.round(ctx.user.proteinTarget - ctx.today.proteinEaten);
  const topPattern = ctx.behavioral.patterns[0];

  if (
    lower.includes("eat") ||
    lower.includes("food") ||
    lower.includes("meal") ||
    lower.includes("lunch") ||
    lower.includes("breakfast") ||
    lower.includes("dinner")
  ) {
    return `You have ${calLeft} cal and ${protLeft}g protein left. Best options: Greek yogurt + almonds (280 cal, 22g protein), chicken bowl (600 cal, 48g), or eggs + toast + protein shake (500 cal, 45g). The chicken bowl gives you the best protein-to-calorie ratio given where you are. Go with that.`;
  }

  if (
    lower.includes("plan") ||
    lower.includes("day") ||
    lower.includes("morning") ||
    lower.includes("schedule")
  ) {
    const meeting = ctx.today.firstMeeting || "your first commitment";
    const priority = ctx.user.topPriority || "your top priority";
    return `Eat first — you need ${calLeft} cal today. Then a focused block on ${priority} until ${meeting}. No context-switching before that meeting. After: gym if you have energy left. That's the move.`;
  }

  if (
    lower.includes("track") ||
    lower.includes("progress") ||
    lower.includes("goal") ||
    lower.includes("hit")
  ) {
    const w = ctx.recent.currentWeight;
    const r = ctx.goals.weightRemaining;
    const d = ctx.goals.daysToDeadline;
    if (w && r && d) {
      return `You're at ${w} lbs with ${r} lbs remaining and ${d} days left. You need ${ctx.goals.weeklyRateNeeded} lbs/week. That's ${ctx.goals.onTrack ? "achievable" : "tight — you need to tighten up now"}. ${ctx.today.caloriesEaten < 500 ? "Today's main job: actually eat at target." : "Today looks fine so far."}`;
    }
    return `Log your weight so I can give you a real progress number. Based on your food logs, consistency is the main variable right now.`;
  }

  if (lower.includes("focus") || lower.includes("work") || lower.includes("priorit")) {
    return `${ctx.user.topPriority || "Your top priority"} is the only thing that should have your full attention right now. Everything else is maintenance. Block 90 minutes this morning with no interruptions and make a concrete dent. What specifically needs to happen on it today?`;
  }

  if (lower.includes("motivat") || lower.includes("help")) {
    return `You're running a company and trying to stay in shape at the same time. The data points to one lever: eating at target consistently. Everything else — energy, focus, weight trend — follows from that. ${ctx.today.caloriesEaten < ctx.user.calorieTarget * 0.5 ? `Today you're at ${ctx.today.caloriesEaten} cal. That's the problem to solve right now.` : "Today you're doing it. Keep the same pattern tomorrow."}`;
  }

  if (
    lower.includes("workout") ||
    lower.includes("gym") ||
    lower.includes("lift") ||
    lower.includes("exercise")
  ) {
    return `Based on your goal and energy, a strength session today makes sense. ${ctx.today.energyLevel === "low" ? "Keep intensity moderate — 70% effort. Don't skip it, but don't blow up either." : "You have enough fuel for a solid session."} Prioritize compound lifts, keep it under 60 minutes.`;
  }

  if (lower.includes("pattern") || lower.includes("notice") || lower.includes("trend")) {
    if (topPattern) {
      return `The main thing I'm noticing: ${topPattern.pattern.toLowerCase().replace(/^[a-z]/, c => c.toUpperCase())}. That's been the recurring theme. ${topPattern.evidence.length > 0 ? `Evidence: ${topPattern.evidence.slice(0, 2).join(", ")}.` : ""} The fix is consistent execution over the next 5 days.`;
    }
    return `Not enough data yet to identify strong patterns — need at least a week of logs. The more you track, the more specific I can get.`;
  }

  // Default: proactive recommendation based on current state
  if (ctx.today.caloriesEaten === 0) {
    return `You haven't logged food yet today. Start there — everything else (energy, focus, weight) traces back to whether you're eating at target. What's your first meal?`;
  }
  if (calLeft > 600) {
    return `You still have ${calLeft} cal and ${protLeft}g protein left today. The most useful thing right now is planning your next two meals. What do you have access to?`;
  }
  return `You're at ${ctx.today.caloriesEaten} cal and ${ctx.today.proteinEaten}g protein today. ${ctx.user.topPriority ? `On the work side, ${ctx.user.topPriority} is the priority.` : ""} What specifically are you trying to decide?`;
}
