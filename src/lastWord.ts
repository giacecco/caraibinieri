/** The Last Word: winning officer improves their answer using the debate */

import { chatCompletion, type ChatMessage } from "./api.ts";
import type { Config } from "./config.ts";
import type { EvaluationResult } from "./evaluation.ts";
import type { PersuasionResult } from "./persuasion.ts";
import type { OfficerResponse } from "./officers.ts";
import { BRITISH_HINT } from "./officers.ts";

export interface LastWordResult {
  officer: "A" | "B";
  originalResponse: string;
  improvedResponse: string;
  reasoning: string;
}

function buildLastWordMessages(
  prompt: string,
  winner: OfficerResponse,
  loser: OfficerResponse,
  evaluations: [EvaluationResult, EvaluationResult],
  speeches: [PersuasionResult, PersuasionResult],
  config: Config,
): ChatMessage[] {
  const winnerName = winner.officer === "A" ? config.nameA : config.nameB;
  const loserName = loser.officer === "A" ? config.nameA : config.nameB;
  const winnerEval = evaluations.find((e) => e.officer === winner.officer);
  if (!winnerEval) throw new Error("Missing evaluation for winner in last word phase");
  const loserEval = evaluations.find((e) => e.officer === loser.officer);
  if (!loserEval) throw new Error("Missing evaluation for loser in last word phase");
  const winnerSpeech = speeches.find((s) => s.officer === winner.officer);
  if (!winnerSpeech) throw new Error("Missing speech for winner in last word phase");
  const loserSpeech = speeches.find((s) => s.officer === loser.officer);
  if (!loserSpeech) throw new Error("Missing speech for loser in last word phase");

  return [
    {
      role: "user",
      content:
        `You are ${winnerName}. You have WON a debate with your partner ${loserName} about the best response to a prompt. ` +
        `Before presenting the final answer to the user, you have the opportunity to improve your original response by ` +
        `considering your partner's arguments — adopt any good ideas, fix any weaknesses they pointed out, ` +
        `and produce the best possible version. You are NOT required to use their ideas if you genuinely believe yours is already better.\n\n` +
        `${BRITISH_HINT}\n\n` +
        `The original prompt:\n\n"""\n${prompt}\n"""\n\n` +
        `Your original winning response:\n\n"""\n${winner.response}\n"""\n\n` +
        `${loserName}'s response:\n\n"""\n${loser.response}\n"""\n\n` +
        `Your evaluation of the two responses (why you preferred yours):\n\n"""\n${winnerEval.reasoning}\n"""\n\n` +
        `${loserName}'s evaluation of the two responses (why they preferred theirs):\n\n"""\n${loserEval.reasoning}\n"""\n\n` +
        `Your argument during the debate:\n\n"""\n${winnerSpeech.speech}\n"""\n\n` +
        `${loserName}'s argument during the debate:\n\n"""\n${loserSpeech.speech}\n"""\n\n` +
        `Please provide your improved final response. Start with a brief explanation of what (if anything) you changed and why, ` +
        `then present the final answer clearly.\n\n` +
        `${BRITISH_HINT}`,
    },
  ];
}

export async function speakTheLastWord(
  config: Config,
  prompt: string,
  winner: "A" | "B",
  responses: [OfficerResponse, OfficerResponse],
  evaluations: [EvaluationResult, EvaluationResult],
  speeches: [PersuasionResult, PersuasionResult],
): Promise<LastWordResult> {
  const winnerRes = winner === "A" ? responses[0] : responses[1];
  const loserRes = winner === "A" ? responses[1] : responses[0];

  const improved = await chatCompletion(
    config,
    buildLastWordMessages(prompt, winnerRes, loserRes, evaluations, speeches, config),
    winner === "A" ? config.modelA : config.modelB,
  );

  const lines = improved.split("\n");
  const reasoning = lines[0] ?? "No changes made.";
  const improvedResponse = lines.slice(1).join("\n").trim() || winnerRes.response;
  return {
    officer: winner,
    originalResponse: winnerRes.response,
    improvedResponse,
    reasoning,
  };
}
