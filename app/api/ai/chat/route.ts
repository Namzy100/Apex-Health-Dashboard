import { NextRequest } from "next/server";
import type { ApexContext } from "@/lib/apex/context-builder";
import { buildChatSystemPrompt, getMockChatResponse } from "@/lib/apex/prompts";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Mock streaming helper ─────────────────────────────────────────────────────

function streamMock(text: string): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const words = text.split(" ");
      for (const word of words) {
        controller.enqueue(new TextEncoder().encode(word + " "));
        await new Promise(r => setTimeout(r, 16));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Mock": "true" },
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      context,
    }: { messages: ChatMessage[]; context: ApexContext } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // ── Mock mode ──────────────────────────────────────────────────────────
    if (!apiKey) {
      const lastUser =
        messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
      return streamMock(getMockChatResponse(lastUser, context));
    }

    // ── Claude streaming ───────────────────────────────────────────────────
    const systemPrompt = buildChatSystemPrompt(context);
    const trimmedMessages = messages.slice(-12); // keep context window sane

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        stream: true,
        system: systemPrompt,
        messages: trimmedMessages,
      }),
    });

    // ── Fallback to mock on API error ──────────────────────────────────────
    if (!response.ok || !response.body) {
      const lastUser =
        messages.filter(m => m.role === "user").slice(-1)[0]?.content ?? "";
      return streamMock(getMockChatResponse(lastUser, context));
    }

    // ── Stream SSE → plain text passthrough ───────────────────────────────
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const json = JSON.parse(data);
              const text =
                json.type === "content_block_delta"
                  ? json.delta?.text
                  : json.delta?.type === "text_delta"
                  ? json.delta?.text
                  : null;
              if (text) controller.enqueue(new TextEncoder().encode(text));
            } catch {
              /* skip malformed lines */
            }
          }
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (err) {
    console.error("[/api/ai/chat]", err);
    return new Response("Something went wrong.", { status: 500 });
  }
}
