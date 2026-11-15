import { OpenAI as PostHogOpenAI } from "@posthog/ai/openai";
import OpenAI from "openai";
import { getPostHogClient } from "@/lib/posthog-server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type ChatCompletionOptions = {
  model?: string;
  responseFormat?: { type: "json_object" };
  distinctId?: string;
};

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Call OpenAI chat completion. Use server-side only (API routes).
 * Returns null if OPENAI_API_KEY is not set or the request fails.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: ChatCompletionOptions
): Promise<string | null> {
  if (!OPENAI_API_KEY?.trim()) return null;

  const posthog = getPostHogClient();
  try {
    if (posthog) {
      const client = new PostHogOpenAI({ apiKey: OPENAI_API_KEY, posthog });
      const response = await client.chat.completions.create({
        model: options?.model ?? "gpt-4o-mini",
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        response_format: options?.responseFormat,
        posthogTraceId: crypto.randomUUID(),
        posthogProperties: { $ai_session_id: `process-${process.pid}` },
        ...(options?.distinctId ? { posthogDistinctId: options.distinctId } : {}),
      });
      return response.choices[0]?.message?.content?.trim() ?? null;
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: options?.model ?? "gpt-4o-mini",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      response_format: options?.responseFormat,
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error("OpenAI chatCompletion error:", err);
    return null;
  } finally {
    await posthog?.flush().catch(() => {});
  }
}

/**
 * Call chat completion and parse the response as JSON.
 * Returns null if the key is missing, the request fails, or the response is invalid JSON.
 */
export async function chatCompletionJson<T>(
  messages: ChatMessage[],
  options?: Pick<ChatCompletionOptions, "model" | "distinctId">
): Promise<T | null> {
  const raw = await chatCompletion(messages, {
    ...options,
    responseFormat: { type: "json_object" },
  });
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
