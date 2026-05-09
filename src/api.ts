/** OpenAI-compatible API client for chat completions */

import type { Config } from "./config.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  config: Config,
  messages: ChatMessage[],
  modelOverride?: string,
): Promise<string> {
  const url = `${config.apiUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const body = {
    model: modelOverride ?? config.model,
    messages,
    temperature: config.temperature,
  };

  if (config.verbose) {
    console.error("\n[VERBOSE] API Request:");
    console.error(JSON.stringify({ url, body }, null, 2));
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = json.choices[0]?.message?.content ?? "";

  if (config.verbose) {
    console.error("\n[VERBOSE] API Response:");
    console.error(JSON.stringify(json, null, 2));
  }

  return content;
}
