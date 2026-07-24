CREATE TYPE "public"."confidence" AS ENUM('strong', 'weak', 'unreproduced');--> statement-breakpoint
CREATE TYPE "public"."failure_type" AS ENUM('cant_localize', 'cant_reproduce', 'weak_reproduction', 'build_failed', 'patch_apply_failed', 'tests_regressed', 'flaky_suite', 'revert_check_failed', 'budget_exceeded', 'attempts_exhausted', 'injection_suspected', 'rejected_by_human', 'infra_error');--> statement-breakpoint
CREATE TYPE "public"."intervention_kind" AS ENUM('approve_pr', 'review_repro', 'clarify_issue', 'abort');--> statement-breakpoint
CREATE TYPE "public"."intervention_status" AS ENUM('pending', 'resolved', 'expired');--> statement-breakpoint
CREATE TYPE "public"."mode" AS ENUM('strict', 'permissive', 'vibes');--> statement-breakpoint
CREATE TYPE "public"."pr_status" AS ENUM('draft', 'opened', 'failed');--> statement-breakpoint
CREATE TYPE "public"."run_state" AS ENUM('created', 'ingesting', 'localizing', 'reproducing', 'patching', 'verifying', 'awaiting_human', 'opening_pr', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."trace_kind" AS ENUM('model', 'tool');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"n" integer NOT NULL,
	"patch_diff" text,
	"test_results_json" jsonb,
	"verdict" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempts_run_id_n_key" UNIQUE("run_id","n")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"type" text NOT NULL,
	"data_json" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interventions" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"stage" text NOT NULL,
	"kind" "intervention_kind" NOT NULL,
	"request_json" jsonb,
	"status" "intervention_status" DEFAULT 'pending' NOT NULL,
	"response_json" jsonb,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE "prs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"idempotency_key" text NOT NULL,
	"github_pr_number" integer,
	"status" "pr_status" DEFAULT 'draft' NOT NULL,
	"labels_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"default_branch" text DEFAULT 'main' NOT NULL,
	"image_tag" text,
	"build_recipe_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repos_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer NOT NULL,
	"issue_number" integer NOT NULL,
	"state" "run_state" DEFAULT 'created' NOT NULL,
	"mode" "mode" DEFAULT 'permissive' NOT NULL,
	"confidence" "confidence",
	"failure_type" "failure_type",
	"budget_usd" numeric(10, 4) NOT NULL,
	"spent_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"kind" "trace_kind" NOT NULL,
	"name" text NOT NULL,
	"input_json" jsonb,
	"output_json" jsonb,
	"tokens_in" integer,
	"tokens_out" integer,
	"latency_ms" integer,
	"cost_usd" numeric(12, 6),
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prs" ADD CONSTRAINT "prs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_repo_id_repos_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_run_id_id_idx" ON "events" USING btree ("run_id","id");--> statement-breakpoint
CREATE INDEX "interventions_run_id_status_idx" ON "interventions" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "runs_state_idx" ON "runs" USING btree ("state");--> statement-breakpoint
CREATE INDEX "traces_run_id_id_idx" ON "traces" USING btree ("run_id","id");