/** Rock-paper-scissors tiebreaker */

import { chatCompletion, type ChatMessage } from "./api.ts";
import type { Config } from "./config.ts";

export interface RpsResult {
  moveA: "rock" | "paper" | "scissors";
  moveB: "rock" | "paper" | "scissors";
  rawA: string;
  rawB: string;
  winner: "A" | "B";
}

const MOVES = ["rock", "paper", "scissors"] as const;

const BRITISH_HINT = "Please reply using British English spelling and conventions (e.g. colour, behaviour, honour, centre) where applicable.";

function buildRpsMessages(
  officer: "A" | "B",
  context: string,
  config: Config,
): ChatMessage[] {
  const selfName = officer === "A" ? config.nameA : config.nameB;
  const otherName = officer === "A" ? config.nameB : config.nameA;
  return [
    {
      role: "user",
      content:
        `You (${selfName}) and your partner ${otherName} couldn't agree on the best response to the user's prompt.\n\n` +
        `${BRITISH_HINT}\n\n` +
        `Here is the full context of your disagreement:\n\n"""\n${context}\n"""\n\n` +
        `You must now settle this with a single round of rock-paper-scissors. ` +
        `Think about your move. You may try to bluff, outsmart, or simply pick one.\n\n` +
        `Answer with EXACTLY one word — no punctuation, no explanation: rock, paper, or scissors.`,
    },
  ];
}

function parseMove(raw: string): "rock" | "paper" | "scissors" {
  const clean = raw.trim().toLowerCase();
  for (const m of MOVES) {
    if (clean.includes(m)) return m;
  }
  // Default: rock for A, scissors for B (by seniority / rank)
  return clean.startsWith("s")
    ? "scissors"
    : clean.startsWith("p")
    ? "paper"
    : "rock";
}

function decideWinner(
  moveA: "rock" | "paper" | "scissors",
  moveB: "rock" | "paper" | "scissors",
): "A" | "B" {
  if (moveA === moveB) return "A"; // A wins draws by seniority (classic Carabinieri hierarchy)
  const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
  return beats[moveA] === moveB ? "A" : "B";
}

export async function playRockPaperScissors(
  config: Config,
  debateContext: string,
): Promise<RpsResult> {
  const [rawA, rawB] = await Promise.all([
    chatCompletion(config, buildRpsMessages("A", debateContext, config), config.modelA),
    chatCompletion(config, buildRpsMessages("B", debateContext, config), config.modelB),
  ]);

  const moveA = parseMove(rawA);
  const moveB = parseMove(rawB);

  return {
    moveA,
    moveB,
    rawA,
    rawB,
    winner: decideWinner(moveA, moveB),
  };
}
