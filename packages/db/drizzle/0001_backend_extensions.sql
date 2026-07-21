ALTER TYPE "public"."failure_type" ADD VALUE IF NOT EXISTS 'invalid_repository';--> statement-breakpoint
ALTER TYPE "public"."failure_type" ADD VALUE IF NOT EXISTS 'unsupported_repository';--> statement-breakpoint
ALTER TYPE "public"."failure_type" ADD VALUE IF NOT EXISTS 'sandbox_timeout';--> statement-breakpoint
ALTER TYPE "public"."failure_type" ADD VALUE IF NOT EXISTS 'cancelled';--> statement-breakpoint
ALTER TYPE "public"."run_state" ADD VALUE IF NOT EXISTS 'cancelled';--> statement-breakpoint

CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint

ALTER TABLE "repos" ADD COLUMN IF NOT EXISTS "clone_url" text;--> statement-breakpoint
ALTER TABLE "repos" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "issues" (
	"id" serial PRIMARY KEY NOT NULL,
	"repo_id" integer NOT NULL REFERENCES "public"."repos"("id") ON DELETE cascade,
	"external_issue_id" text,
	"issue_number" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"labels_json" jsonb,
	"comments_json" jsonb,
	"author_json" jsonb,
	"state" text DEFAULT 'open' NOT NULL,
	"source_url" text,
	"fetched_at" timestamp with time zone,
	"raw_payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "issue_id" integer REFERENCES "public"."issues"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "failure_details_json" jsonb;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "current_attempt" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "max_attempts" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "token_budget" integer DEFAULT 500000;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "tokens_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "wall_clock_limit_seconds" integer DEFAULT 1800;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint

ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "localization_result_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "reproduction_patch" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "reproduction_result_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "source_patch" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "patch_apply_result_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "verification_result_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "model_metadata_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "token_usage_json" jsonb;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "cost_usd" numeric(12, 6);--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;--> statement-breakpoint

ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "sequence_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "state" "run_state";--> statement-breakpoint

ALTER TABLE "traces" ADD COLUMN IF NOT EXISTS "attempt_id" integer REFERENCES "public"."attempts"("id") ON DELETE set null;--> statement-breakpoint
ALTER TABLE "traces" ADD COLUMN IF NOT EXISTS "success" text DEFAULT 'true';--> statement-breakpoint
ALTER TABLE "traces" ADD COLUMN IF NOT EXISTS "error_type" text;--> statement-breakpoint
ALTER TABLE "traces" ADD COLUMN IF NOT EXISTS "error_message" text;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL REFERENCES "public"."runs"("id") ON DELETE cascade,
	"status" "approval_status" DEFAULT 'pending' NOT NULL,
	"reviewer_identifier" text,
	"reviewer_comment" text,
	"approved_patch_digest" text NOT NULL,
	"approved_reproduction_digest" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);--> statement-breakpoint

ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'github' NOT NULL;--> statement-breakpoint
ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "external_pr_id" text;--> statement-breakpoint
ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "url" text;--> statement-breakpoint
ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "head_branch" text;--> statement-breakpoint
ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "base_branch" text DEFAULT 'main';--> statement-breakpoint
ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "request_payload_json" jsonb;--> statement-breakpoint
ALTER TABLE "prs" ADD COLUMN IF NOT EXISTS "response_payload_json" jsonb;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL REFERENCES "public"."runs"("id") ON DELETE cascade,
	"stage" text NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"payload_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"dataset_version" text NOT NULL,
	"task_subset" text,
	"config_snapshot_json" jsonb,
	"model_identifiers_json" jsonb,
	"commit_sha" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"aggregate_metrics_json" jsonb,
	"per_task_results_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "jobs_status_available_idx" ON "jobs" USING btree ("status", "available_at");--> statement-breakpoint
