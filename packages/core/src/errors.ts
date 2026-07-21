import type { RunState } from "./state";

/**
 * Thrown when code attempts a state transition the machine does not allow.
 * Carries the offending edge so the orchestrator can log it and bail typed.
 */
export class InvalidTransitionError extends Error {
  constructor(
    readonly from: RunState,
    readonly to: RunState,
  ) {
    super(`Illegal state transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export interface BudgetDetail {
  limitUsd: number;
  spentUsd: number;
  projectedUsd: number;
}

/**
 * Thrown by the budget guard when a run has hit its hard dollar ceiling.
 * The orchestrator catches this and ends the run as `budget_exceeded`.
 */
export class BudgetExceededError extends Error {
  constructor(readonly detail: BudgetDetail) {
    super(
      `Budget exceeded: spent $${detail.spentUsd.toFixed(4)} + projected ` +
        `$${detail.projectedUsd.toFixed(4)} > limit $${detail.limitUsd.toFixed(4)}`,
    );
    this.name = "BudgetExceededError";
  }
}
