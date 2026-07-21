import { ModeSchema } from "@issue-to-pr/core";
import { z } from "zod";

/**
 * Validated engine configuration. Loaded once at startup; if a required secret
 * is missing or malformed we fail loud here rather than mid-run.
 *
 * Secrets (E2B key, GitHub token, LLM key) flow from this object into
 * deterministic code only — never into a sandbox or a prompt built from
 * untrusted issue text.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** "true"/"1" → true, "false"/"0"/"" → false. */
const boolFromEnv = z
  .preprocess((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return ["true", "1", "yes"].includes(v.trim().toLowerCase());
    return v;
  }, z.boolean())
  .default(true);

const postgresUrl = z
  .string()
  .url()
  .refine((s) => s.startsWith("postgres://") || s.startsWith("postgresql://"), {
    message: "must be a postgres:// or postgresql:// URL",
  });

const ConfigSchema = z.object({
  // Database — DIRECT for the engine/migrations, POOLED for the web app.
  databaseUrlDirect: postgresUrl,
  databaseUrlPooled: postgresUrl,

  // E2B cloud sandbox.
  e2bApiKey: z.string().min(1, "E2B_API_KEY is required"),

  // LLM routing (via OpenRouter) — optional until Phase 1 uses it.
  openrouterApiKey: z.string().default(""),
  llmModelStrong: z.string().min(1).default("anthropic/claude-opus-4.8"),
  llmModelCheap: z.string().min(1).default("anthropic/claude-haiku-4.5"),

  // GitHub — optional until Phase 3 opens PRs.
  githubToken: z.string().default(""),

  // Hard run budgets enforced by the orchestrator.
  budgetUsdPerRun: z.coerce.number().positive().default(2),
  maxAttempts: z.coerce.number().int().positive().default(3),
  wallClockSeconds: z.coerce.number().int().positive().default(1800),

  // Strictness + kill switch.
  defaultMode: ModeSchema.default("permissive"),
  githubWritesEnabled: boolFromEnv,
});

export type Config = z.infer<typeof ConfigSchema>;

type RawEnv = Record<string, string | undefined>;

/**
 * Build a validated {@link Config} from an environment map (defaults to
 * `process.env`). Throws {@link ConfigError} listing every problem at once.
 */
export function loadConfig(env: RawEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse({
    databaseUrlDirect: env.DATABASE_URL_DIRECT,
    databaseUrlPooled: env.DATABASE_URL_POOLED,
    e2bApiKey: env.E2B_API_KEY,
    openrouterApiKey: env.OPENROUTER_API_KEY,
    llmModelStrong: env.LLM_MODEL_STRONG,
    llmModelCheap: env.LLM_MODEL_CHEAP,
    githubToken: env.GITHUB_TOKEN,
    budgetUsdPerRun: env.BUDGET_USD_PER_RUN,
    maxAttempts: env.MAX_ATTEMPTS,
    wallClockSeconds: env.WALL_CLOCK_SECONDS,
    defaultMode: env.DEFAULT_MODE,
    githubWritesEnabled: env.GITHUB_WRITES_ENABLED,
  });

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new ConfigError(`Invalid engine configuration:\n${problems}`);
  }
  return parsed.data;
}
