/** Rock-paper-scissors tiebreaker */

import { chatCompletion, type ChatMessage } from "./api.ts";
import type { Config } from "./config.ts";

export interface RpsRound {
  moveA: "rock" | "paper" | "scissors";
  moveB: "rock" | "paper" | "scissors";
  rawA: string;
  rawB: string;
}

export interface RpsResult {
  rounds: RpsRound[];
  winner: "A" | "B";
}

const MOVES = ["rock", "paper", "scissors"] as const;

function buildRpsMessages(
  officer: "A" | "B",
  context: string,
  config: Config,
  roundNumber: number,
): ChatMessage[] {
  const selfName = officer === "A" ? config.nameA : config.nameB;
  const otherName = officer === "A" ? config.nameB : config.nameA;
  const roundText = roundNumber > 1
    ? `This is round ${roundNumber} — the previous round(s) were draws.`
    : ``;
  return [
    {
      role: "user",
      content:
        `You (${selfName}) and your partner ${otherName} couldn't agree on the best response to the user's prompt.\n\n` +
        `Here is the full context of your disagreement:\n\n"""\n${context}\n"""\n\n` +
        `${roundText}\n\n` +
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
  return clean.startsWith("s")
    ? "scissors"
    : clean.startsWith("p")
    ? "paper"
    : "rock";
}

function decideWinner(
  moveA: "rock" | "paper" | "scissors",
  moveB: "rock" | "paper" | "scissors",
): "A" | "B" | "draw" {
  if (moveA === moveB) return "draw";
  const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
  return beats[moveA] === moveB ? "A" : "B";
}

export async function playRockPaperScissors(
  config: Config,
  debateContext: string,
): Promise<RpsResult> {
  const rounds: RpsRound[] = [];
  let roundNumber = 1;
  const MAX_ROUNDS = 10;

  while (true) {
    const [rawA, rawB] = await Promise.all([
      chatCompletion(config, buildRpsMessages("A", debateContext, config, roundNumber), config.modelA),
      chatCompletion(config, buildRpsMessages("B", debateContext, config, roundNumber), config.modelB),
    ]);

    const moveA = parseMove(rawA);
    const moveB = parseMove(rawB);

    rounds.push({ moveA, moveB, rawA, rawB });

    const result = decideWinner(moveA, moveB);
    if (result !== "draw") {
      return { rounds, winner: result };
    }

    if (roundNumber >= MAX_ROUNDS) {
      const winner = Math.random() < 0.5 ? "A" as const : "B" as const;
      return { rounds, winner };
    }

    roundNumber++;
  }
}
