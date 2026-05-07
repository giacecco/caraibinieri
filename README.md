# 🚓 carAIbinieri

> *"Why do Carabinieri patrol in pairs? Because one can read, and the other can write."*
>
> An alternative LLM harness/REPL built on the iconic Italian joke: two "officers" (LLM instances) patrol the prompt together, evaluate each other, argue when they disagree, and — if all else fails — settle their dispute with rock-paper-scissors.

---

## The Concept

In `carAIbinieri`, every user prompt is handled by a pair of LLM instances (Officer A and Officer B). They work in parallel, judge each other's work, and only present a final answer to the user once they reach consensus — or once the procedural circus runs its course.

The joke is the architecture: two "cops" who are nominally cooperating but are just as likely to get in each other's way, require persuasion, and ultimately need a childish game to break deadlocks.

Even when one wins, the victory is not hollow: the winning officer gets **The Last Word** — a chance to improve their answer by reflecting on the debate, adopting any good ideas from their partner, and fixing weaknesses that were pointed out.

---

## How It Works (The Patrol Loop)

```
┌─────────────────────────────────────────────────────────────┐
│  1. HUMAN submits a prompt                                    │
│         ↓                                                   │
│  2. OFFICER A and OFFICER B process it IN PARALLEL          │
│         ↓                                                   │
│  3. EVALUATION PHASE                                        │
│     • A reads B's response and decides: "I prefer mine"     │
│       or "I prefer B's"                                     │
│     • B reads A's response and decides the same             │
│         ↓                                                   │
│  4. AGREEMENT? → Winning officer gets THE LAST WORD      │
│     (improves their answer using the debate) + presents     │
│         ↓ (no agreement)                                    │
│  5. PERSUASION PHASE (1 round each)                         │
│     • A writes a rebuttal, trying to convince B           │
│     • B writes a rebuttal, trying to convince A             │
│         ↓                                                   │
│  6. RE-EVALUATION — do they now agree?                      │
│         ↓ (agreement)                                       │
│     Winner gets THE LAST WORD + presents improved answer    │
│         ↓ (still no agreement)                              │
│  7. ROCK-PAPER-SCISSORS                                   │
│     • Each officer strategises and picks a move           │
│     • Winner gets THE LAST WORD using the full debate     │
│       and presents the improved answer to the user          │
│         ↓                                                   │
│  LOOP BACK TO (1)                                           │
└─────────────────────────────────────────────────────────────┘
```

### Response Generation

The same prompt is sent to both officers in parallel. They use the same model by default, but can be configured with different ones (e.g. `--A gemma4:31b-cloud --B llama3.3`).

### Evaluation

Officers evaluate **naturally**, using first person: *"my response"* vs *"your response"*. The harness does not inject rubrics, scoring systems, or personas. Each officer receives:

- The original prompt
- Their own drafted response
- The other officer's drafted response

They are simply asked: *"Which response do you prefer — yours or your partner's? Explain why."*

If both pick the same winner, that officer gets **The Last Word** — a chance to improve their answer using what they learned from the debate before presenting it.

### Persuasion

If A and B disagree, each is shown:
- The original prompt
- Both responses
- The other officer's evaluation (including their reasoning)

They get **one speech** to write a persuasive argument for why their own response is better. They address each other by their Italian names (e.g. *"Giancarlo, your response misses the key point..."*)

After both rebuttals are complete, they re-evaluate. If they still disagree, the process escalates.

### Rock-Paper-Scissors Tiebreaker

When persuasion fails, the officers play rock-paper-scissors. Each officer is prompted to **strategise and choose a move** (not random — they are asked to think about it). On a draw, they go again — and again — until one decisively wins. All rounds are shown on screen. The winner then gets **The Last Word** — using the full debate context to produce an improved final answer for the user.

The law is the law.

### The Last Word

Whenever there's consensus (immediate, after persuasion, or via RPS), the winning officer gets one more API call to:
- Review both original responses
- Consider the evaluations and arguments
- Produce an improved final answer

The user sees **The Last Word** (e.g. *"I kept my main argument but incorporated Salvatore's point about..."*) followed by the polished response.

---

## Theatrical UI (Ace Attorney Mode)

Inspired by *Phoenix Wright: Ace Attorney*, the REPL is theatrical and dramatic:

- **Animated spinners**: 🚨🚔✨ cycling while the officers are thinking
- **Dramatic banners**: "CARAIBINIERI ON PATROL", "OBJECTION!", "ROCK — PAPER — SCISSORS"
- **Named officers**: "Giancarlo (gemma4:31b-cloud) evaluates:" instead of generic "Officer A"
- **Verbose logging**: Every thought, evaluation, rebuttal, and RPS move is shown
- **The Last Word reveal**: The winner explains how they improved their answer before showing it

The user sees the sausage being made. All of it.

---

## Tech Stack

- **Runtime**: Bun
- **Language**: TypeScript
- **LLM API**: Anthropic-compatible (OpenAI-style `/v1/chat/completions` endpoint)
  - Primary target: Ollama (cloud or local) via its OpenAI-compatible API
  - Configurable base URL, model name, and API key
- **Configuration**: Environment variables + CLI flags

---

## Configuration

| Variable / Flag | Description | Default |
|---|---|---|
| `CARAIBINIERI_API_URL` / `--api-url` | Base URL for the chat completions endpoint | `http://localhost:11434/v1` (Ollama) |
| `CARAIBINIERI_API_KEY` / `--api-key` | API key (if required by provider) | *(none)* |
| `CARAIBINIERI_MODEL` / `--model` | Fallback model name if per-officer models not set | `llama3.1` |
| `--A` / `--modelA` / `CARAIBINIERI_MODEL_A` | Model for Officer A (e.g. `gemma4:31b-cloud`) | falls back to `--model` |
| `--B` / `--modelB` / `CARAIBINIERI_MODEL_B` | Model for Officer B (e.g. `llama3.3`) | falls back to `--model` |
| `CARAIBINIERI_NAME_A` / `--nameA` | Name for Officer A | random Italian male name |
| `CARAIBINIERI_NAME_B` / `--nameB` | Name for Officer B | random Italian male name (different from A) |
| `CARAIBINIERI_TEMPERATURE` / `--temperature` | Sampling temperature | `0.7` |
| `--verbose` | Show full raw prompts and API responses | `false` |
| `--no-theatre` | Disable Ace Attorney styling, plain text only | `false` |

> **Note**: `carAIbinieri` does not inject personas or characters into prompts. The officers are neutral and address each other by their Italian names. Diversity comes from using different models (e.g. `--A gemma4:31b-cloud --B llama3.3`), not from roleplay.

---

## Project Structure

```
caraibinieri/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts              # CLI entrypoint, REPL loop
│   ├── config.ts            # Env/CLI configuration + Italian name picker
│   ├── api.ts               # Anthropic-compatible API client
│   ├── officers.ts          # Parallel dual-officer response generation
│   ├── evaluation.ts        # Evaluation phase (first person)
│   ├── persuasion.ts        # Persuasion phase (named rebuttals)
│   ├── tiebreaker.ts        # Rock-paper-scissors logic
│   ├── lastWord.ts          # The Last Word: winner improves answer
│   └── theatre.ts           # Ace Attorney styled output + spinners
└── bun.lock
```

---

## Installation & Usage

```bash
# Clone and enter
git clone https://github.com/giacecco/caraibinieri.git
cd caraibinieri

# Install dependencies (just TypeScript types)
bun install

# Run with Ollama locally (default: http://localhost:11434/v1, model llama3.1)
bun run src/main.ts

# Run against a remote provider
bun run src/main.ts --api-url https://api.example.com/v1 --api-key sk-xxx --model mistral-nemo

# Use different models per officer
bun run src/main.ts --A gemma4:31b-cloud --B llama3.3

# Custom names
bun run src/main.ts --nameA Giancarlo --nameB Salvatore

# Mix and match
bun run src/main.ts --A qwen2.5:72b --nameA Bruno --B gemma3:27b --nameB Nino

# Plain text mode (no Ace Attorney theatrics)
bun run src/main.ts --no-theatre

# Show raw API prompts/responses
bun run src/main.ts --verbose

# Both models and names, remote provider
bun run src/main.ts \
  --api-url https://openrouter.ai/api/v1 \
  --api-key sk-or-v1-xxx \
  --A kimi-k2.6:cloud \
  --B deepseek-v4-pro:cloud \
  --nameA Giancarlo \
  --nameB Salvatore
```

---

## Why?

Because watching two identical models argue over which of their almost-certainly-identical answers is better, fail to persuade each other, play rock-paper-scissors to decide the user's fate, and then **get The Last Word to actually improve the answer** is objectively funnier and more useful than a single `/v1/chat/completions` call.

Also, it makes a genuinely interesting testbed for:
- Self-evaluation in LLMs
- Persuasion and consensus-building
- Strategic reasoning in trivial games
- Post-debate reflection and answer improvement

---

*Made with ❤️ and mild disrespect for Italy's finest.* 🇮🇹🚔
