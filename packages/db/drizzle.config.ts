import { defineConfig } from "drizzle-kit";

/**
 * `drizzle-kit generate` reads the schema and emits SQL migrations offline — no
 * DB connection needed. `migrate`/`push` use `DATABASE_URL_DIRECT` (the engine's
 * direct, unpooled connection; migrations must not run through a pooler).
 */
export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL_DIRECT ??
      "postgresql://issue_to_pr:issue_to_pr@localhost:5432/issue_to_pr",
  },
  strict: true,
  verbose: true,
});
