import { confidences, failureTypes, modes, runStates } from "@issue-to-pr/core";
import {
  bigserial,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
// Shared enums come straight from @issue-to-pr/core so the DB's allowed values
// and the TS unions can never drift (guarded by schema.test.ts).
export const runStateEnum = pgEnum("run_state", runStates);
export const modeEnum = pgEnum("mode", modes);
export const confidenceEnum = pgEnum("confidence", confidences);
export const failureTypeEnum = pgEnum("failure_type", failureTypes);

// DB-local enums (promoted to core when the engine needs them).
export const traceKinds = ["model", "tool"] as const;
export const traceKindEnum = pgEnum("trace_kind", traceKinds);

export const prStatuses = ["draft", "opened", "failed"] as const;
export const prStatusEnum = pgEnum("pr_status", prStatuses);

export const interventionKinds = ["approve_pr", "review_repro", "clarify_issue", "abort"] as const;
export const interventionKindEnum = pgEnum("intervention_kind", interventionKinds);

export const interventionStatuses = ["pending", "resolved", "expired"] as const;
export const interventionStatusEnum = pgEnum("intervention_status", interventionStatuses);

// Reusable timestamp columns.
const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// ─── repos ───────────────────────────────────────────────────────────────────
export const repos = pgTable("repos", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull().unique(), // "owner/name"
  defaultBranch: text("default_branch").notNull().default("main"),
  imageTag: text("image_tag"), // cached sandbox image, once built
  buildRecipeJson: jsonb("build_recipe_json").$type<Record<string, unknown>>(),
  createdAt,
  updatedAt,
});

// ─── runs ────────────────────────────────────────────────────────────────────
export const runs = pgTable(
  "runs",
  {
    id: serial("id").primaryKey(),
    repoId: integer("repo_id")
      .notNull()
      .references(() => repos.id, { onDelete: "restrict" }),
    issueNumber: integer("issue_number").notNull(),
    state: runStateEnum("state").notNull().default("created"),
    mode: modeEnum("mode").notNull().default("permissive"),
    confidence: confidenceEnum("confidence"), // null until reproduced
    failureType: failureTypeEnum("failure_type"), // null unless state = failed
    budgetUsd: numeric("budget_usd", { precision: 10, scale: 4 }).notNull(),
    spentUsd: numeric("spent_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    // Claim loop (FOR UPDATE SKIP LOCKED) bookkeeping.
    claimedBy: text("claimed_by"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (t) => [index("runs_state_idx").on(t.state)],
);

// ─── attempts ────────────────────────────────────────────────────────────────
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    n: integer("n").notNull(), // 1-based attempt number
    patchDiff: text("patch_diff"),
    testResultsJson: jsonb("test_results_json"),
    verdict: text("verdict"),
    createdAt,
  },
  (t) => [unique("attempts_run_id_n_key").on(t.runId, t.n)],
);

// ─── events (append-only: audit + SSE source + replay) ───────────────────────
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    dataJson: jsonb("data_json").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("events_run_id_id_idx").on(t.runId, t.id)],
);

// ─── traces (every model/tool call) ──────────────────────────────────────────
export const traces = pgTable(
  "traces",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    kind: traceKindEnum("kind").notNull(),
    name: text("name").notNull(),
    inputJson: jsonb("input_json"),
    outputJson: jsonb("output_json"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    latencyMs: integer("latency_ms"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("traces_run_id_id_idx").on(t.runId, t.id)],
);

// ─── prs (idempotent external writes) ────────────────────────────────────────
export const prs = pgTable("prs", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull().unique(), // checked before the API call
  githubPrNumber: integer("github_pr_number"),
  status: prStatusEnum("status").notNull().default("draft"),
  labelsJson: jsonb("labels_json").$type<string[]>(),
  createdAt,
  updatedAt,
});

// ─── interventions (the single human-gate table) ─────────────────────────────
export const interventions = pgTable(
  "interventions",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    kind: interventionKindEnum("kind").notNull(),
    requestJson: jsonb("request_json").$type<Record<string, unknown>>(),
    status: interventionStatusEnum("status").notNull().default("pending"),
    responseJson: jsonb("response_json").$type<Record<string, unknown>>(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: text("resolved_by"),
  },
  (t) => [index("interventions_run_id_status_idx").on(t.runId, t.status)],
);
