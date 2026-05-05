/** Persuasion phase: each officer writes a rebuttal to convince the other */

import { chatCompletion, type ChatMessage } from "./api.ts";
import type { Config } from "./config.ts";
import type { OfficerResponse } from "./officers.ts";
import type { EvaluationResult } from "./evaluation.ts";

export interface PersuasionResult {
  officer: "A" | "B";
  speech: string;
}

function buildPersuasionMessages(
  prompt: string,
  self: OfficerResponse,
  other: OfficerResponse,
  otherEval: EvaluationResult,
  config: Config,
): ChatMessage[] {
  const selfName = self.officer === "A" ? config.nameA : config.nameB;
  const otherName = other.officer === "A" ? config.nameA : config.nameB;
  return [
    {
      role: "user",
      content:
        `When referring to responses, always use first person: say "my response" when talking about yours and "your response" or "${otherName}'s response" when talking about your partner's.\n\n` +
        `The original prompt was:\n\n"""\n${prompt}\n"""\n\n` +
        `Your response (${selfName}):\n\n"""\n${self.response}\n"""\n\n` +
        `Your partner ${otherName}'s response:\n\n"""\n${other.response}\n"""\n\n` +
        `${otherName} said:\n\n"""\n${otherEval.reasoning}\n"""\n\n` +
        `Write a persuasive argument for why your response is the better one. ` +
        `Address ${otherName} directly. Use first person: "my response", "your response".\n` +
        `You have one chance to convince them. Be concise but compelling.\n`,
    },
  ];
}

export async function runPersuasionRound(
  config: Config,
  prompt: string,
  responses: [OfficerResponse, OfficerResponse],
  evaluations: [EvaluationResult, EvaluationResult],
): Promise<[PersuasionResult, PersuasionResult]> {
  const [aRes, bRes] = responses;
  const [evalA, evalB] = evaluations;

  const [speechA, speechB] = await Promise.all([
    chatCompletion(config, buildPersuasionMessages(prompt, aRes, bRes, evalB, config), config.modelA).then((text) =>
      ({ officer: "A" as const, speech: text })
    ),
    chatCompletion(config, buildPersuasionMessages(prompt, bRes, aRes, evalA, config), config.modelB).then((text) =>
      ({ officer: "B" as const, speech: text })
    ),
  ]);

  return [speechA, speechB];
}
