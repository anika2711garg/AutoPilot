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

export const approvalStatuses = ["pending", "approved", "rejected"] as const;
export const approvalStatusEnum = pgEnum("approval_status", approvalStatuses);

export const jobStatuses = ["pending", "processing", "completed", "failed"] as const;
export const jobStatusEnum = pgEnum("job_status", jobStatuses);

// Reusable timestamp columns.
const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

// ─── repos ───────────────────────────────────────────────────────────────────
export const repos = pgTable("repos", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull().unique(), // "owner/name"
  defaultBranch: text("default_branch").notNull().default("main"),
  cloneUrl: text("clone_url"),
  status: text("status").notNull().default("active"),
  imageTag: text("image_tag"), // cached sandbox image, once built
  buildRecipeJson: jsonb("build_recipe_json").$type<Record<string, unknown>>(),
  createdAt,
  updatedAt,
});

// ─── issues ──────────────────────────────────────────────────────────────────
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  repoId: integer("repo_id")
    .notNull()
    .references(() => repos.id, { onDelete: "cascade" }),
  externalIssueId: text("external_issue_id"),
  issueNumber: integer("issue_number").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  labelsJson: jsonb("labels_json").$type<string[]>(),
  commentsJson: jsonb("comments_json").$type<Record<string, unknown>[]>(),
  authorJson: jsonb("author_json").$type<Record<string, unknown>>(),
  state: text("state").notNull().default("open"),
  sourceUrl: text("source_url"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  rawPayloadJson: jsonb("raw_payload_json").$type<Record<string, unknown>>(),
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
    issueId: integer("issue_id")
      .references(() => issues.id, { onDelete: "set null" }),
    issueNumber: integer("issue_number").notNull(),
    state: runStateEnum("state").notNull().default("created"),
    mode: modeEnum("mode").notNull().default("permissive"),
    confidence: confidenceEnum("confidence"), // null until reproduced
    failureType: failureTypeEnum("failure_type"), // null unless state = failed
    failureDetailsJson: jsonb("failure_details_json").$type<Record<string, unknown>>(),
    currentAttempt: integer("current_attempt").notNull().default(1),
    maxAttempts: integer("max_attempts").notNull().default(3),
    budgetUsd: numeric("budget_usd", { precision: 10, scale: 4 }).notNull(),
    spentUsd: numeric("spent_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    tokenBudget: integer("token_budget").default(500000),
    tokensUsed: integer("tokens_used").default(0),
    wallClockLimitSeconds: integer("wall_clock_limit_seconds").default(1800),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
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
    localizationResultJson: jsonb("localization_result_json"),
    reproductionPatch: text("reproduction_patch"),
    reproductionResultJson: jsonb("reproduction_result_json"),
    sourcePatch: text("source_patch"),
    patchApplyResultJson: jsonb("patch_apply_result_json"),
    verificationResultJson: jsonb("verification_result_json"),
    verdict: text("verdict"),
    modelMetadataJson: jsonb("model_metadata_json"),
    tokenUsageJson: jsonb("token_usage_json"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
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
    sequenceNumber: integer("sequence_number").notNull().default(1),
    type: text("type").notNull(),
    state: runStateEnum("state"),
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
    attemptId: integer("attempt_id")
      .references(() => attempts.id, { onDelete: "set null" }),
    kind: traceKindEnum("kind").notNull(),
    name: text("name").notNull(),
    inputJson: jsonb("input_json"),
    outputJson: jsonb("output_json"),
    success: text("success").default("true"),
    errorType: text("error_type"),
    errorMessage: text("error_message"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    latencyMs: integer("latency_ms"),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("traces_run_id_id_idx").on(t.runId, t.id)],
);

// ─── approvals (digest-bound human gate) ─────────────────────────────────────
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  status: approvalStatusEnum("status").notNull().default("pending"),
  reviewerIdentifier: text("reviewer_identifier"),
  reviewerComment: text("reviewer_comment"),
  approvedPatchDigest: text("approved_patch_digest").notNull(),
  approvedReproductionDigest: text("approved_reproduction_digest").notNull(),
  createdAt,
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

// ─── prs (idempotent external writes) ────────────────────────────────────────
export const prs = pgTable("prs", {
  id: serial("id").primaryKey(),
  runId: integer("run_id")
    .notNull()
    .references(() => runs.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull().unique(), // checked before the API call
  provider: text("provider").notNull().default("github"),
  externalPrNumber: integer("external_pr_number"),
  externalPrId: text("external_pr_id"),
  url: text("url"),
  headBranch: text("head_branch"),
  baseBranch: text("base_branch").default("main"),
  status: prStatusEnum("status").notNull().default("draft"),
  labelsJson: jsonb("labels_json").$type<string[]>(),
  requestPayloadJson: jsonb("request_payload_json").$type<Record<string, unknown>>(),
  responsePayloadJson: jsonb("response_payload_json").$type<Record<string, unknown>>(),
  createdAt,
  updatedAt,
});

// ─── jobs (Postgres SKIP LOCKED queue) ────────────────────────────────────────
export const jobs = pgTable(
  "jobs",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    payloadJson: jsonb("payload_json").$type<Record<string, unknown>>(),
    createdAt,
    updatedAt,
  },
  (t) => [index("jobs_status_available_idx").on(t.status, t.availableAt)],
);

// ─── evaluations ─────────────────────────────────────────────────────────────
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  datasetVersion: text("dataset_version").notNull(),
  taskSubset: text("task_subset"),
  configSnapshotJson: jsonb("config_snapshot_json").$type<Record<string, unknown>>(),
  modelIdentifiersJson: jsonb("model_identifiers_json").$type<Record<string, unknown>>(),
  commitSha: text("commit_sha"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  aggregateMetricsJson: jsonb("aggregate_metrics_json").$type<Record<string, unknown>>(),
  perTaskResultsJson: jsonb("per_task_results_json").$type<Record<string, unknown>>(),
  createdAt,
});

// ─── interventions (legacy human-gate table kept for backward compatibility) ─
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
