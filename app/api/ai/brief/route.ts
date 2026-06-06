import { NextRequest, NextResponse } from "next/server";
import type { ApexContext } from "@/lib/apex/context-builder";
import { buildBriefPrompt, getMockBrief, APEX_SYSTEM_PROMPT } from "@/lib/apex/prompts";

export const runtime = "nodejs";

// ─── Model selection ──────────────────────────────────────────────────────────
// Try opus first (deeper synthesis), fall back to sonnet.
const BRIEF_MODELS = ["claude-opus-4-5", "claude-sonnet-4-5"];

interface BriefResult {
  text: string;             // standardized — replaces the old "brief" key
  anchors: [string, string, string];
  chips: string[];
  risk?: string;
  todaysMove?: string;
  todaysMoveWhy?: string;
  focusItems?: string[];
  tonightRec?: string;
}

// ─── Structured validation ────────────────────────────────────────────────────

function validateBriefResult(parsed: unknown): parsed is BriefResult {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as Record<string, unknown>;
  // Accept both `text` and legacy `brief` key from older prompts
  const textValue = p.text ?? p.brief;
  if (typeof textValue !== "string" || textValue.length < 10) return false;
  if (!Array.isArray(p.anchors) || p.anchors.length !== 3) return false;
  if (!p.anchors.every((a: unknown) => typeof a === "string" && a.length > 0)) return false;
  if (!Array.isArray(p.chips) || p.chips.length < 2) return false;
  return true;
}

// Normalize the result to always use `text`
function normalizeBriefResult(parsed: Record<string, unknown>): BriefResult {
  return {
    text: (parsed.text ?? parsed.brief) as string,
    anchors: parsed.anchors as [string, string, string],
    chips: parsed.chips as string[],
    risk: parsed.risk as string | undefined,
    todaysMove: parsed.todaysMove as string | undefined,
    todaysMoveWhy: parsed.todaysMoveWhy as string | undefined,
    focusItems: parsed.focusItems as string[] | undefined,
    tonightRec: Array.isArray(parsed.tonightRec)
      ? (parsed.tonightRec as string[]).join(". ")
      : (parsed.tonightRec as string | undefined),
  };
}

function extractJson(text: string): BriefResult | null {
  // Try to find JSON object in response
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return validateBriefResult(parsed) ? normalizeBriefResult(parsed as unknown as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ─── Claude call ──────────────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  model: string,
  prompt: string
): Promise<BriefResult | null> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system: APEX_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const text: string = data.content?.[0]?.text ?? "";
  return extractJson(text);
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { context }: { context: ApexContext } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Mock mode ──────────────────────────────────────────────────────────
    if (!apiKey) {
      const mock = getMockBrief(context);
      return NextResponse.json({ ...mock, mock: true });
    }

    const prompt = buildBriefPrompt(context);

    // ── Try each model, with one retry per model if JSON extraction fails ──
    for (const model of BRIEF_MODELS) {
      // Attempt 1
      let result = await callClaude(apiKey, model, prompt).catch(() => null);
      if (result) {
        return NextResponse.json({ ...result, mock: false, model });
      }

      // Attempt 2 — retry with explicit JSON reminder
      const retryPrompt = prompt + "\n\nIMPORTANT: Respond with ONLY valid JSON. No explanation text before or after the JSON object.";
      result = await callClaude(apiKey, model, retryPrompt).catch(() => null);
      if (result) {
        return NextResponse.json({ ...result, mock: false, model });
      }

      // Model failed both attempts, try next model
    }

    // ── All models failed — return mock ────────────────────────────────────
    console.error("[/api/ai/brief] All models failed, falling back to mock");
    const mock = getMockBrief(context);
    return NextResponse.json({ ...mock, mock: true, error: "api_fallback" });

  } catch (err) {
    console.error("[/api/ai/brief]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
