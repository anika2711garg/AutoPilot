import { assertTransition, isTerminal, type FailureType, type RunState } from "@issue-to-pr/core";
import type { Db } from "@issue-to-pr/db";
import { events, runs } from "@issue-to-pr/db";
import { eq } from "drizzle-orm";

export class StateMachineOrchestrator {
  constructor(private db: Db) {}

  async transition(
    runId: number,
    toState: RunState,
    eventPayload: {
      eventType: string;
      stage: string;
      details?: Record<string, unknown>;
      failureCategory?: FailureType;
      errorMessage?: string;
    }
  ): Promise<void> {
    const currentRun = await this.db.select().from(runs).where(eq(runs.id, runId));
    if (currentRun.length === 0 || !currentRun[0]) {
      throw new Error(`Run #${runId} not found`);
    }

    const fromState = currentRun[0].state as RunState;

    if (fromState !== toState) {
      assertTransition(fromState, toState);
    }

    await this.db
      .update(runs)
      .set({
        state: toState,
        failureType: eventPayload.failureCategory ?? currentRun[0].failureType,
        failureDetailsJson: eventPayload.errorMessage
          ? { errorMessage: eventPayload.errorMessage }
          : currentRun[0].failureDetailsJson,
        updatedAt: new Date(),
        completedAt: isTerminal(toState) ? new Date() : undefined,
      })
      .where(eq(runs.id, runId));

    await this.db.insert(events).values({
      runId,
      type: eventPayload.eventType,
      state: toState,
      dataJson: eventPayload.details ?? {},
    });
  }
}
