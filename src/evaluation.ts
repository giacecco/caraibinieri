/** Evaluation phase: each officer reads both responses and picks a winner */

import { chatCompletion, type ChatMessage } from "./api.ts";
import type { Config } from "./config.ts";
import type { OfficerResponse } from "./officers.ts";
import type { PersuasionResult } from "./persuasion.ts";

export interface EvaluationResult {
  officer: "A" | "B";
  prefers: "A" | "B";
  reasoning: string;
}

function buildEvalMessages(
  prompt: string,
  self: OfficerResponse,
  other: OfficerResponse,
  config: Config,
  priorDebate?: { evaluations: [EvaluationResult, EvaluationResult]; speeches: [PersuasionResult, PersuasionResult] },
): ChatMessage[] {
  const selfName = self.officer === "A" ? config.nameA : config.nameB;
  const otherName = other.officer === "A" ? config.nameA : config.nameB;

  let content =
    `When referring to responses, always use first person: say "my response" when talking about yours and "your response" or "${otherName}'s response" when talking about your partner's.\n\n` +
    `The original prompt was:\n\n"""\n${prompt}\n"""\n\n` +
    `Your response (${selfName}):\n\n"""\n${self.response}\n"""\n\n` +
    `Your partner ${otherName}'s response:\n\n"""\n${other.response}\n"""\n\n`;

  if (priorDebate) {
    const otherEval = priorDebate.evaluations.find((e) => e.officer === other.officer);
    if (!otherEval) throw new Error("Missing evaluation for other officer in prior debate");
    const mySpeech = priorDebate.speeches.find((s) => s.officer === self.officer);
    if (!mySpeech) throw new Error("Missing speech for self in prior debate");
    const otherSpeech = priorDebate.speeches.find((s) => s.officer === other.officer);
    if (!otherSpeech) throw new Error("Missing speech for other officer in prior debate");

    content +=
      `Earlier, ${otherName} argued:\n\n"""\n${otherEval.reasoning}\n"""\n\n` +
      `You argued back:\n\n"""\n${mySpeech.speech}\n"""\n\n` +
      `${otherName} argued back:\n\n"""\n${otherSpeech.speech}\n"""\n\n`;
  }

  content +=
    `Which response do you prefer — yours (${selfName}) or ${otherName}'s? ` +
    `Answer exactly with one of these two lines at the very start:\n` +
    `I prefer my response.\n` +
    `or\n` +
    `I prefer your response.\n\n` +
    `Then explain your reasoning. Always use first person: "my response" and "your response".`;

  return [{ role: "user", content }];
}

function parsePreference(text: string, config: Config, selfOfficer: "A" | "B"): "A" | "B" | null {
  // Search all lines for a first-person preference declaration
  const lines = text.trim().split(/\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim().toLowerCase();
    if (!line.includes("prefer")) continue;

    if (line.includes("my")) return selfOfficer;
    if (line.includes("your")) return selfOfficer === "A" ? "B" : "A";
  }

  // Fallback to name-based detection in the full text
  const combined = text.trim().toLowerCase();
  const nameA = config.nameA.toLowerCase();
  const nameB = config.nameB.toLowerCase();
  if (combined.includes(nameA) && combined.includes("prefer")) return "A";
  if (combined.includes(nameB) && combined.includes("prefer")) return "B";
  if (combined.includes("officer a") && combined.includes("prefer")) return "A";
  if (combined.includes("officer b") && combined.includes("prefer")) return "B";
  return null;
}

function stripPreferenceLine(text: string): string {
  const lines = text.split(/\n/);
  const idx = lines.findIndex((rawLine) => {
    const line = rawLine.trim().toLowerCase();
    return line.includes("prefer") && (line.includes("my") || line.includes("your"));
  });

  if (idx === -1) return text;
  return lines.slice(idx + 1).join("\n").trim();
}

export async function evaluateResponses(
  config: Config,
  prompt: string,
  responses: [OfficerResponse, OfficerResponse],
  priorDebate?: { evaluations: [EvaluationResult, EvaluationResult]; speeches: [PersuasionResult, PersuasionResult] },
): Promise<[EvaluationResult, EvaluationResult]> {
  const [aRes, bRes] = responses;

  const [evalA, evalB] = await Promise.all([
    chatCompletion(config, buildEvalMessages(prompt, aRes, bRes, config, priorDebate), config.modelA).then((text) => {
      const pref = parsePreference(text, config, "A");
      if (!pref) throw new Error(`Failed to parse ${config.nameA}'s evaluation preference. Raw response:\n${text.slice(0, 200)}`);
      return { officer: "A" as const, prefers: pref, reasoning: stripPreferenceLine(text) };
    }),
    chatCompletion(config, buildEvalMessages(prompt, bRes, aRes, config, priorDebate), config.modelB).then((text) => {
      const pref = parsePreference(text, config, "B");
      if (!pref) throw new Error(`Failed to parse ${config.nameB}'s evaluation preference. Raw response:\n${text.slice(0, 200)}`);
      return { officer: "B" as const, prefers: pref, reasoning: stripPreferenceLine(text) };
    }),
  ]);

  return [evalA, evalB];
}
