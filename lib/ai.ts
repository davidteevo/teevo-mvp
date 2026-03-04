import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function getClient(): OpenAI | null {
  if (!OPENAI_API_KEY?.trim()) return null;
  return new OpenAI({ apiKey: OPENAI_API_KEY });
}

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
  options?: { model?: string; responseFormat?: { type: "json_object" } }
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const response = await client.chat.completions.create({
      model: options?.model ?? "gpt-4o-mini",
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      response_format: options?.responseFormat,
    });
    const content = response.choices[0]?.message?.content?.trim();
    return content ?? null;
  } catch (err) {
    console.error("OpenAI chatCompletion error:", err);
    return null;
  }
}

/**
 * Call chat completion and parse the response as JSON.
 * Returns null if the key is missing, the request fails, or the response is invalid JSON.
 */
export async function chatCompletionJson<T>(
  messages: ChatMessage[],
  options?: { model?: string }
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
