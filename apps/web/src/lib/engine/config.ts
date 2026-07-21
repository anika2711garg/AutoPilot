import { z } from "zod";

export const ConfigSchema = z.object({
  DATABASE_URL_DIRECT: z.string().min(1, "DATABASE_URL_DIRECT is required"),
  DATABASE_URL_POOLED: z.string().min(1, "DATABASE_URL_POOLED is required"),
  E2B_API_KEY: z.string().min(1, "E2B_API_KEY is required"),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_WRITES_ENABLED: z.coerce.boolean().default(false),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_CHEAP_MODEL: z.string().default("google/gemini-2.5-flash"),
  OPENROUTER_STRONG_MODEL: z.string().default("google/gemini-2.5-pro"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(overrideEnv?: Record<string, string>): Config {
  const envSource = overrideEnv ?? process.env;
  
  return ConfigSchema.parse({
    DATABASE_URL_DIRECT: envSource.DATABASE_URL_DIRECT ?? "postgresql://postgres:postgres@localhost:5432/issue_to_pr",
    DATABASE_URL_POOLED: envSource.DATABASE_URL_POOLED ?? "postgresql://postgres:postgres@localhost:5432/issue_to_pr",
    E2B_API_KEY: envSource.E2B_API_KEY ?? "e2b_placeholder_key",
    GITHUB_TOKEN: envSource.GITHUB_TOKEN,
    GITHUB_WRITES_ENABLED: envSource.GITHUB_WRITES_ENABLED ?? "false",
    OPENROUTER_API_KEY: envSource.OPENROUTER_API_KEY,
    OPENROUTER_CHEAP_MODEL: envSource.OPENROUTER_CHEAP_MODEL ?? "google/gemini-2.5-flash",
    OPENROUTER_STRONG_MODEL: envSource.OPENROUTER_STRONG_MODEL ?? "google/gemini-2.5-pro",
  });
}
