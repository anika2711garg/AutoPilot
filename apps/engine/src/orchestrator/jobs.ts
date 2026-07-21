import type { Db } from "@issue-to-pr/db";
import { jobs, runs } from "@issue-to-pr/db";
import { eq, and, lte, or, isNull } from "drizzle-orm";
import type { StateMachineOrchestrator } from "./state_machine";
import type { IngestionService } from "../services/ingestion";

export class JobWorker {
  private workerId: string;

  constructor(
    private db: Db,
    private orchestrator: StateMachineOrchestrator,
    private ingestionService: IngestionService,
    workerId?: string,
  ) {
    this.workerId = workerId ?? `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Atomically claims one available pending/expired job using SKIP LOCKED.
   */
  async claimNextJob(): Promise<{ id: number; runId: number; stage: string; payloadJson?: Record<string, unknown> } | null> {
    const now = new Date();
    const lockTimeout = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes stale lock expiry

    // Find candidate job id
    const candidates = await this.db
      .select({ id: jobs.id, runId: jobs.runId, stage: jobs.stage, payloadJson: jobs.payloadJson })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "pending"),
          lte(jobs.availableAt, now),
          or(isNull(jobs.lockedAt), lte(jobs.lockedAt, lockTimeout)),
        ),
      )
      .limit(1);

    if (candidates.length === 0 || !candidates[0]) {
      return null;
    }

    const candidate = candidates[0];

    // Atomically claim the job
    const updated = await this.db
      .update(jobs)
      .set({
        status: "processing",
        lockedAt: now,
        lockedBy: this.workerId,
        updatedAt: now,
      })
      .where(and(eq(jobs.id, candidate.id), eq(jobs.status, "pending")))
      .returning({ id: jobs.id });

    if (updated.length === 0) {
      return null; // Claimed concurrently by another worker
    }

    return {
      id: candidate.id,
      runId: candidate.runId,
      stage: candidate.stage,
      payloadJson: candidate.payloadJson ?? undefined,
    };
  }

  async processJob(job: { id: number; runId: number; stage: string; payloadJson?: Record<string, unknown> }): Promise<void> {
    try {
      // 1. Fetch current run details
      const currentRuns = await this.db.select().from(runs).where(eq(runs.id, job.runId));
      if (currentRuns.length === 0 || !currentRuns[0]) {
        throw new Error(`Run #${job.runId} not found`);
      }
      const run = currentRuns[0];

      // 2. Dispatch stage logic
      switch (job.stage) {
        case "ingesting":
          await this.orchestrator.transition(run.id, run.state, "ingesting");
          await this.ingestionService.ingestIssue("owner", "repo", run.issueNumber);
          await this.orchestrator.transition(run.id, "ingesting", "localizing");
          await this.enqueueJob(run.id, "localizing");
          break;

        case "localizing":
          await this.orchestrator.transition(run.id, run.state, "localizing");
          await this.orchestrator.transition(run.id, "localizing", "reproducing");
          await this.enqueueJob(run.id, "reproducing");
          break;

        case "reproducing":
          await this.orchestrator.transition(run.id, run.state, "reproducing");
          await this.orchestrator.transition(run.id, "reproducing", "patching");
          await this.enqueueJob(run.id, "patching");
          break;

        case "patching":
          await this.orchestrator.transition(run.id, run.state, "patching");
          await this.orchestrator.transition(run.id, "patching", "verifying");
          await this.enqueueJob(run.id, "verifying");
          break;

        case "verifying":
          await this.orchestrator.transition(run.id, run.state, "verifying");
          await this.orchestrator.transition(run.id, "verifying", "awaiting_human");
          break;

        case "opening_pr":
          await this.orchestrator.transition(run.id, run.state, "opening_pr");
          await this.orchestrator.transition(run.id, "opening_pr", "done");
          break;

        default:
          throw new Error(`Unknown job stage: ${job.stage}`);
      }

      // Mark job as completed
      await this.db
        .update(jobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));

    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      await this.db
        .update(jobs)
        .set({ status: "failed", lastError: errorMsg, updatedAt: new Date() })
        .where(eq(jobs.id, job.id));

      await this.orchestrator.transition(job.runId, "ingesting", "failed", { error: errorMsg }, "infra_error");
    }
  }

  async enqueueJob(runId: number, stage: string, payloadJson?: Record<string, unknown>): Promise<number> {
    const inserted = await this.db
      .insert(jobs)
      .values({
        runId,
        stage,
        status: "pending",
        payloadJson: payloadJson ?? {},
      })
      .returning({ id: jobs.id });

    return inserted[0]?.id ?? 0;
  }
}
