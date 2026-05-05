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
    const otherEval = priorDebate.evaluations.find((e) => e.officer === other.officer)!;
    const mySpeech = priorDebate.speeches.find((s) => s.officer === self.officer)!;
    const otherSpeech = priorDebate.speeches.find((s) => s.officer === other.officer)!;

    content +=
      `Earlier, ${otherName} argued:\n\n"""\n${otherEval.reasoning}\n"""\n\n` +
      `You argued back:\n\n"""\n${mySpeech.speech}\n"""\n\n` +
      `${otherName} argued back:\n\n"""\n${otherSpeech.speech}\n"""\n\n`;
  }

  content +=
    `Which response do you prefer — yours (${selfName}) or ${otherName}'s? ` +
    `Answer exactly with one of these two lines at the very start:\n` +
    `I prefer ${config.nameA}'s response.\n` +
    `or\n` +
    `I prefer ${config.nameB}'s response.\n\n` +
    `Then explain your reasoning. Always use first person: "my response" and "your response".`;

  return [{ role: "user", content }];
}

function parsePreference(text: string, config: Config): "A" | "B" | null {
  const firstLine = text.trim().split(/\n/)[0].trim().toLowerCase();
  const nameA = config.nameA.toLowerCase();
  const nameB = config.nameB.toLowerCase();
  if (firstLine.includes(nameA) && firstLine.includes("prefer")) return "A";
  if (firstLine.includes(nameB) && firstLine.includes("prefer")) return "B";
  // Fallback in case the model still uses "officer a" / "officer b"
  if (firstLine.includes("officer a") && firstLine.includes("prefer")) return "A";
  if (firstLine.includes("officer b") && firstLine.includes("prefer")) return "B";
  return null;
}

function stripFirstLine(text: string): string {
  const lines = text.split(/\n/);
  if (lines.length <= 1) return "";
  return lines.slice(1).join("\n").trim();
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
      const pref = parsePreference(text, config) ?? "A";
      return { officer: "A" as const, prefers: pref, reasoning: stripFirstLine(text) };
    }),
    chatCompletion(config, buildEvalMessages(prompt, bRes, aRes, config, priorDebate), config.modelB).then((text) => {
      const pref = parsePreference(text, config) ?? "B";
      return { officer: "B" as const, prefers: pref, reasoning: stripFirstLine(text) };
    }),
  ]);

  return [evalA, evalB];
}
