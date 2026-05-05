/** Ace Attorney theatrical output styling */

import type { OfficerResponse } from "./officers.ts";
import type { EvaluationResult } from "./evaluation.ts";
import type { PersuasionResult } from "./persuasion.ts";
import type { Config } from "./config.ts";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";
const MAGENTA = "\x1b[35m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const DIM = "\x1b[2m";

function spacedTitle(words: string[]): string {
  return words.map((w) => w.split("").join(" ")).join("   ");
}

export class Spinner {
  private timer: ReturnType<typeof setInterval> | null = null;
  private frame = 0;
  private readonly frames = ["🚨", "🚔", "🚨", "🚔", "✨", "🚔"];

  constructor(private label: string) {}

  start() {
    if (this.timer) return;
    process.stdout.write(`\r${DIM}${this.label} ${this.frames[0]}${RESET} `);
    this.timer = setInterval(() => {
      this.frame = (this.frame + 1) % this.frames.length;
      process.stdout.write(`\r${DIM}${this.label} ${this.frames[this.frame]}${RESET} `);
    }, 400);
  }

  stop(message?: string) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    process.stdout.write("\r" + " ".repeat(this.label.length + 10) + "\r");
    if (message) {
      console.log(message);
    }
  }
}

export class Theatre {
  private enabled: boolean;
  private nameA: string;
  private nameB: string;

  constructor(config: Config) {
    this.enabled = !config.noTheatre;
    this.nameA = config.nameA;
    this.nameB = config.nameB;
  }

  private print(text: string) {
    if (this.enabled) {
      console.log(text);
    }
  }

  private banner(text: string, colour: string) {
    if (!this.enabled) return;
    const line = "═".repeat(text.length + 6);
    console.log(`${colour}${BOLD}${line}${RESET}`);
    console.log(`${colour}${BOLD}  ${text}  ${RESET}`);
    console.log(`${colour}${BOLD}${line}${RESET}`);
  }

  welcomeBanner() {
    const line1 = "🚓  WELCOME TO CARAIBINIERI  🚓";
    const line2 = "Two officers patrol your prompt. One answer prevails.";
    const width = Math.max(line1.length, line2.length) + 6;
    const border = "═".repeat(width);
    const pad1 = " ".repeat(width - line1.length - 4);
    const pad2 = " ".repeat(width - line2.length - 4);
    console.log(`${CYAN}${BOLD}${border}${RESET}`);
    console.log(`${CYAN}${BOLD}  ${line1}${pad1}  ${RESET}`);
    console.log(`${CYAN}${BOLD}  ${line2}${pad2}  ${RESET}`);
    console.log(`${CYAN}${BOLD}${border}${RESET}`);
  }

  promptBanner(prompt: string) {
    this.banner("🚓  C A R A I B I N I E R I   O N   P A T R O L  🚓", CYAN);
    this.print(`\n${BOLD}Prompt:${RESET}\n${prompt}\n`);
  }

  showResponses(responses: [OfficerResponse, OfficerResponse]) {
    const [a, b] = responses;

    this.print(`${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    this.print(`${BLUE}${BOLD}  ${this.nameA} RESPONDS${RESET}`);
    this.print(`${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    this.print(a.response);
    this.print("");

    this.print(`${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    this.print(`${MAGENTA}${BOLD}  ${this.nameB} RESPONDS${RESET}`);
    this.print(`${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
    this.print(b.response);
    this.print("");
  }

  showEvaluations(evals: [EvaluationResult, EvaluationResult]) {
    for (const e of evals) {
      const colour = e.officer === "A" ? BLUE : MAGENTA;
      const name = e.officer === "A" ? this.nameA : this.nameB;
      const prefersLabel = e.officer === e.prefers ? "my response" : "your response";
      this.print(`${colour}${BOLD}${name} evaluates:${RESET}`);
      this.print(`${colour}Prefers: ${prefersLabel}${RESET}`);
      this.print(`${colour}${e.reasoning}${RESET}`);
      this.print("");
    }
  }

  evaluationBanner() {
    this.banner("🔍  F R I S K I N G   T H E   A N S W E R S  🔍", CYAN);
  }

  objection() {
    this.banner("⚡  O B J E C T I O N !  ⚡", YELLOW);
    this.print(`${YELLOW}${BOLD}The officers DISAGREE! The case goes to arguments!${RESET}\n`);
  }

  showPersuasions(speeches: [PersuasionResult, PersuasionResult]) {
    for (const s of speeches) {
      const colour = s.officer === "A" ? BLUE : MAGENTA;
      const name = s.officer === "A" ? this.nameA : this.nameB;
      this.print(`${colour}${BOLD}${name} argues:${RESET}`);
      this.print(`${colour}${s.speech}${RESET}`);
      this.print("");
    }
  }

  stalemate() {
    this.print(`${RED}${BOLD}The patrol is hopelessly split. Neither officer will budge.${RESET}`);
    this.print(`${RED}${BOLD}There is only one honourable way to settle this...${RESET}\n`);
  }

  showRpsShowdown(rounds: import("./tiebreaker.ts").RpsRound[]) {
    const lastIndex = rounds.length - 1;
    for (let i = 0; i < rounds.length; i++) {
      const round = rounds[i];
      const baseTitle = spacedTitle(["ROCK", "—", "PAPER", "—", "SCISSORS"]);
      if (rounds.length > 1) {
        const roundTitle = spacedTitle(["Round", String(i + 1)]);
        this.banner(`🪨  📜  ✂️   ${baseTitle}  —  ${roundTitle}  🪨  📜  ✂️`, YELLOW);
      } else {
        this.banner(`🪨  📜  ✂️   ${baseTitle}  🪨  📜  ✂️`, YELLOW);
      }
      this.print(`${BLUE}${BOLD}${this.nameA} plays: ${round.moveA.toUpperCase()}${RESET}`);
      this.print(`${BLUE}${round.rawA}${RESET}`);
      this.print("");
      this.print(`${MAGENTA}${BOLD}${this.nameB} plays: ${round.moveB.toUpperCase()}${RESET}`);
      this.print(`${MAGENTA}${round.rawB}${RESET}`);
      this.print("");
      if (i < lastIndex) {
        this.print(`${YELLOW}${BOLD}D R A W !  Nobody wins. They go again...${RESET}\n`);
      }
    }
  }

  declareWinner(officer: "A" | "B", response: string, lastWordReasoning?: string) {
    const colour = officer === "A" ? BLUE : MAGENTA;
    const winnerName = officer === "A" ? this.nameA : this.nameB;
    this.banner(`🏆  ${winnerName} WINS!  🏆`, GREEN);
    if (lastWordReasoning) {
      this.print(`${GREEN}${BOLD}THE LAST WORD:${RESET}`);
      this.print(`${GREEN}${lastWordReasoning}${RESET}\n`);
    }
    this.print(`${GREEN}${BOLD}${winnerName} presents the final answer:${RESET}\n`);
    this.print(response);
    this.print("");
    this.print(`${CYAN}${BOLD}──────────────────────────────────────────${RESET}`);
    this.print(`${CYAN}Type your next prompt, or press Ctrl+C to dismiss the officers.${RESET}\n`);
  }

  plain(text: string) {
    if (!this.enabled) console.log(text);
  }
}
