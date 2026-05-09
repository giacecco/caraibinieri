/** Officer abstractions — parallel prompt answering */

import { chatCompletion, type ChatMessage } from "./api.ts";
import type { Config } from "./config.ts";

export interface OfficerResponse {
  officer: "A" | "B";
  response: string;
}

export const BRITISH_HINT = "Please reply using British English spelling and conventions (e.g. colour, behaviour, honour, centre) where applicable.";

export async function patrolInPairs(
  config: Config,
  prompt: string,
): Promise<[OfficerResponse, OfficerResponse]> {
  const messages: ChatMessage[] = [
    { role: "user", content: `${prompt}\n\n${BRITISH_HINT}` },
  ];

  const [a, b] = await Promise.all([
    chatCompletion(config, messages, config.modelA).then((r) => ({ officer: "A" as const, response: r })),
    chatCompletion(config, messages, config.modelB).then((r) => ({ officer: "B" as const, response: r })),
  ]);

  return [a, b];
}
