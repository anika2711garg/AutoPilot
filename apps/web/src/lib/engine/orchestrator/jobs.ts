import type { Db } from "@issue-to-pr/db";
import { jobs, runs } from "@issue-to-pr/db";
import { eq, and, lte, or, isNull } from "drizzle-orm";
import type { StateMachineOrchestrator } from "./state_machine";
import type { IngestionService } from "./../services/ingestion";

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

  async claimNextJob(): Promise<{ id: number; runId: number; stage: string; payloadJson?: Record<string, unknown> } | null> {
    const now = new Date();
    const staleLockThreshold = new Date(now.getTime() - 60000);

    const pendingJobs = await this.db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.status, "pending"),
          or(isNull(jobs.lockedAt), lte(jobs.lockedAt, staleLockThreshold))
        )
      )
      .limit(1);

    if (pendingJobs.length === 0 || !pendingJobs[0]) {
      return null;
    }

    const candidate = pendingJobs[0];

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
      return null;
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
      const currentRuns = await this.db.select().from(runs).where(eq(runs.id, job.runId));
      if (currentRuns.length === 0 || !currentRuns[0]) {
        throw new Error(`Run #${job.runId} missing`);
      }

      await this.orchestrator.transition(job.runId, "ingesting", {
        eventType: "stage_started",
        stage: "ingest",
        details: { jobStage: job.stage },
      });

      await this.db
        .update(jobs)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(jobs.id, job.id));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.db
        .update(jobs)
        .set({
          status: "failed",
          lastError: errMsg,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      await this.orchestrator.transition(job.runId, "failed", {
        eventType: "stage_failed",
        stage: job.stage,
        errorMessage: errMsg,
        failureCategory: "infra_error",
      });
    }
  }
}
