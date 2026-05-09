/**
 * Prompt history — persisted across executions so arrow-up/down recalls past prompts.
 * Stored as plain text, one line per input line, in ~/.caraibinieri_history.
 */

import { existsSync, readFileSync, appendFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HISTORY_FILE = join(homedir(), ".caraibinieri_history");
const MAX_LINES = 2000;

export function loadHistory(): string[] {
  try {
    if (existsSync(HISTORY_FILE)) {
      return readFileSync(HISTORY_FILE, "utf-8")
        .split("\n")
        .filter((line) => line.length > 0)
        .slice(-MAX_LINES);
    }
  } catch {
    // silently ignore — history is a convenience, not a requirement
  }
  return [];
}

export function saveHistoryEntry(line: string): void {
  try {
    appendFileSync(HISTORY_FILE, line + "\n");
    // Trim if file grew too large
    const raw = readFileSync(HISTORY_FILE, "utf-8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    if (lines.length > MAX_LINES) {
      writeFileSync(HISTORY_FILE, lines.slice(-MAX_LINES).join("\n") + "\n");
    }
  } catch {
    // silently ignore
  }
}
