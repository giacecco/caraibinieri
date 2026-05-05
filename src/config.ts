/** Configuration: env vars, CLI flags, and random Italian name picker */

const ITALIAN_NAMES = [
  "Mario", "Luigi", "Giovanni", "Marco", "Antonio", "Giuseppe", "Francesco",
  "Alessandro", "Luca", "Roberto", "Stefano", "Paolo", "Andrea", "Matteo",
  "Davide", "Simone", "Daniele", "Fabio", "Claudio", "Alberto", "Enrico",
  "Vincenzo", "Salvatore", "Domenico", "Gabriele", "Raffaele", "Tommaso",
  "Cristiano", "Federico", "Emanuele", "Lorenzo", "Pietro", "Nicola",
  "Filippo", "Giacomo", "Edoardo", "Riccardo", "Giorgio", "Silvio",
  "Sergio", "Flavio", "Massimo", "Carmine", "Benedetto", "Pasquale",
  "Gianluca", "Giancarlo", "Franco", "Bruno", "Nino",
];

function pickRandomName(exclude?: string): string {
  const pool = exclude
    ? ITALIAN_NAMES.filter((n) => n !== exclude)
    : [...ITALIAN_NAMES];
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface Config {
  apiUrl: string;
  apiKey: string | undefined;
  model: string;
  modelA: string;
  modelB: string;
  temperature: number;
  verbose: boolean;
  noTheatre: boolean;
  nameA: string;
  nameB: string;
}

function getEnv(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const raw = typeof process !== "undefined" ? process.argv.slice(2) : [];

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (i + 1 < raw.length && !raw[i + 1].startsWith("--")) {
        args[key] = raw[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

export function loadConfig(): Config {
  const args = parseArgs();

  const model =
    (args.model as string) ||
    getEnv("CARAIBINIERI_MODEL") ||
    "llama3.1";

  const nameA =
    (args.nameA as string) ||
    getEnv("CARAIBINIERI_NAME_A") ||
    pickRandomName();

  const nameB =
    (args.nameB as string) ||
    getEnv("CARAIBINIERI_NAME_B") ||
    pickRandomName(nameA);

  return {
    apiUrl:
      (args.apiUrl as string) ||
      getEnv("CARAIBINIERI_API_URL") ||
      "http://localhost:11434/v1",
    apiKey:
      (args.apiKey as string) || getEnv("CARAIBINIERI_API_KEY") || undefined,
    model,
    modelA: (args.A as string) || (args.modelA as string) || getEnv("CARAIBINIERI_MODEL_A") || model,
    modelB: (args.B as string) || (args.modelB as string) || getEnv("CARAIBINIERI_MODEL_B") || model,
    temperature: parseFloat(
      (args.temperature as string) || getEnv("CARAIBINIERI_TEMPERATURE") || "0.7"
    ),
    verbose: !!(args.verbose || getEnv("CARAIBINIERI_VERBOSE")),
    noTheatre: !!(args.noTheatre || getEnv("CARAIBINIERI_NO_THEATRE")),
    nameA,
    nameB,
  };
}
