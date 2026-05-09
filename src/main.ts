#!/usr/bin/env bun
/** carAIbinieri — main REPL entrypoint */

import { loadConfig } from "./config.ts";
import { patrolInPairs } from "./officers.ts";
import { evaluateResponses } from "./evaluation.ts";
import { runPersuasionRound } from "./persuasion.ts";
import { playRockPaperScissors } from "./tiebreaker.ts";
import { speakTheLastWord } from "./lastWord.ts";
import { Theatre, Spinner } from "./theatre.ts";
import { loadHistory, saveHistoryEntry } from "./history.ts";
import { createInterface } from "node:readline";

const config = loadConfig();

// --- Validate model names ---
if (!config.modelA || !config.modelB) {
  console.error("\n❌ Error: You must specify the Ollama models to use.");
  console.error("   Set --A <model> and --B <model>, or use environment variables:");
  console.error("     CARAIBINIERI_MODEL_A  (model for officer A)");
  console.error("     CARAIBINIERI_MODEL_B  (model for officer B)");
  console.error("     CARAIBINIERI_MODEL    (fallback for both)");
  console.error("\n   Example: bun run start -- --model llama3.1\n");
  process.exit(1);
}

const theatre = new Theatre(config);

if (config.noTheatre) {
  console.log("carAIbinieri — plain text mode");
  console.log(`API: ${config.apiUrl} | Temperature: ${config.temperature}`);
  console.log(`Officers: ${config.nameA} (${config.modelA}) vs ${config.nameB} (${config.modelB})`);
  console.log("Type your prompt and press Enter. Press Ctrl+C to exit.\n");
} else {
  theatre.welcomeBanner();
  console.log(`\nAPI: ${config.apiUrl} | Temperature: ${config.temperature}`);
  console.log(`Officers: ${config.nameA} (${config.modelA}) vs ${config.nameB} (${config.modelB})`);
  console.log("Type your prompt and press Enter. Press Ctrl+C to dismiss the officers.\n");
}

async function runPatrol(userPrompt: string) {
  // 1) Parallel response generation
  theatre.promptBanner(userPrompt);

  const genSpinner = new Spinner(`${config.nameA} & ${config.nameB} are thinking...`);
  genSpinner.start();
  const responses = await patrolInPairs(config, userPrompt);
  genSpinner.stop();

  theatre.showResponses(responses);

  // 2) First evaluation
  theatre.evaluationBanner();
  const evalSpinner = new Spinner("Officers are evaluating...");
  evalSpinner.start();
  let evaluations = await evaluateResponses(config, userPrompt, responses);
  evalSpinner.stop();

  theatre.showEvaluations(evaluations);

  // 3) Check agreement
  const bothPreferA = evaluations[0].prefers === "A" && evaluations[1].prefers === "A";
  const bothPreferB = evaluations[0].prefers === "B" && evaluations[1].prefers === "B";

  if (bothPreferA) {
    await speakTheLastWordAndShow("A", responses, evaluations, userPrompt);
    return;
  }
  if (bothPreferB) {
    await speakTheLastWordAndShow("B", responses, evaluations, userPrompt);
    return;
  }

  // 4) Disagreement → persuasion
  theatre.objection();

  const persuasionSpinner = new Spinner("Officers are arguing...");
  persuasionSpinner.start();
  const speeches = await runPersuasionRound(config, userPrompt, responses, evaluations);
  persuasionSpinner.stop();

  theatre.showPersuasions(speeches);

  // 5) Re-evaluation with debate context
  theatre.evaluationBanner();
  const reEvalSpinner = new Spinner("Officers are re-evaluating...");
  reEvalSpinner.start();
  evaluations = await evaluateResponses(config, userPrompt, responses, { evaluations, speeches });
  reEvalSpinner.stop();

  theatre.showEvaluations(evaluations);

  // 6) Check agreement again
  const bothPreferA2 = evaluations[0].prefers === "A" && evaluations[1].prefers === "A";
  const bothPreferB2 = evaluations[0].prefers === "B" && evaluations[1].prefers === "B";

  if (bothPreferA2) {
    await speakTheLastWordAndShow("A", responses, evaluations, userPrompt, speeches);
    return;
  }
  if (bothPreferB2) {
    await speakTheLastWordAndShow("B", responses, evaluations, userPrompt, speeches);
    return;
  }

  // 7) Still deadlocked → rock-paper-scissors
  theatre.stalemate();
  const debateContext =
    `Officer A's response:\n${responses[0].response}\n\n` +
    `Officer B's response:\n${responses[1].response}\n\n` +
    `During arguments, Officer A argued:\n${speeches[0].speech}\n\n` +
    `Officer B argued:\n${speeches[1].speech}`;

  const rpsSpinner = new Spinner("Rock... Paper... Scissors...");
  rpsSpinner.start();
  const rpsResult = await playRockPaperScissors(config, debateContext);
  rpsSpinner.stop();

  theatre.showRpsShowdown(rpsResult.rounds);

  // 8) The Last Word and declare final winner
  await speakTheLastWordAndShow(rpsResult.winner, responses, evaluations, userPrompt, speeches);
}

async function speakTheLastWordAndShow(
  winner: "A" | "B",
  responses: [import("./officers.ts").OfficerResponse, import("./officers.ts").OfficerResponse],
  evaluations: [import("./evaluation.ts").EvaluationResult, import("./evaluation.ts").EvaluationResult],
  prompt: string,
  speeches?: [import("./persuasion.ts").PersuasionResult, import("./persuasion.ts").PersuasionResult],
) {
  const lastWordSpinner = new Spinner("Winner has the last word...");
  lastWordSpinner.start();
  const lastWord = await speakTheLastWord(
    config,
    prompt,
    winner,
    responses,
    evaluations,
    speeches ?? [
      { officer: "A", speech: "(No persuasion round needed — immediate agreement.)" },
      { officer: "B", speech: "(No persuasion round needed — immediate agreement.)" },
    ],
  );
  lastWordSpinner.stop();

  theatre.declareWinner(winner, lastWord.improvedResponse, lastWord.reasoning);
}

// Readline loop with arrow-key history
const PROMPT = config.noTheatre ? "> " : "\x1b[33m\x1b[1mCitizen> \x1b[0m";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  history: loadHistory(),
});

rl.setPrompt(PROMPT);
rl.prompt();

rl.on("line", async (line) => {
  saveHistoryEntry(line);
  rl.history?.push(line);

  const trimmed = line.trim();
  if (trimmed !== "") {
    await runPatrol(trimmed).catch((err) => {
      console.error("\nPatrol error:", err.message);
      if (config.verbose) console.error(err.stack);
    });
  }
  rl.setPrompt(PROMPT);
  rl.prompt();
});
