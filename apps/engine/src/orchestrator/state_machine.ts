import { assertTransition, isTerminal, type FailureType, type RunState } from "@issue-to-pr/core";
import type { Db } from "@issue-to-pr/db";
import { events, runs } from "@issue-to-pr/db";
import { eq } from "drizzle-orm";

export class StateMachineOrchestrator {
  constructor(private db: Db) {}

  /**
   * Persists state transition to PostgreSQL before executing side-effects.
   * Emits monotonic state change audit event.
   */
  async transition(
    runId: number,
    fromState: RunState,
    toState: RunState,
    dataJson?: Record<string, unknown>,
    failureType?: FailureType,
  ): Promise<void> {
    assertTransition(fromState, toState);

    const updateFields: Record<string, unknown> = {
      state: toState,
      updatedAt: new Date(),
    };

    if (failureType) {
      updateFields["failureType"] = failureType;
    }

    if (toState === "ingesting" && !dataJson?.["resuming"]) {
      updateFields["startedAt"] = new Date();
    }

    if (isTerminal(toState)) {
      updateFields["completedAt"] = new Date();
    }

    // 1. Update run record in Postgres
    await this.db
      .update(runs)
      .set(updateFields)
      .where(eq(runs.id, runId));

    // 2. Persist audit event
    await this.db.insert(events).values({
      runId,
      type: `run.state_changed.${toState}`,
      state: toState,
      dataJson: {
        fromState,
        toState,
        failureType,
        ...(dataJson ?? {}),
      },
    });
  }
}
