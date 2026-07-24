import { BudgetExceededError } from "./errors";

/** A run's money ceiling and what it has spent so far (USD). */
export interface BudgetState {
  limitUsd: number;
  spentUsd: number;
}

/**
 * Assert there is room for a call projected to cost `projectedUsd`.
 *
 * Checked before every LLM call. Boundary rule: spending *up to and including*
 * the limit is allowed; only strictly exceeding it throws. A projected cost of 0
 * is a pure "are we already over?" check.
 *
 * @throws {BudgetExceededError} if `spent + projected` would exceed `limit`.
 */
export function assertBudget(budget: BudgetState, projectedUsd = 0): void {
  if (projectedUsd < 0) {
    throw new RangeError(`projectedUsd must be >= 0, got ${projectedUsd}`);
  }
  if (budget.spentUsd + projectedUsd > budget.limitUsd) {
    throw new BudgetExceededError({
      limitUsd: budget.limitUsd,
      spentUsd: budget.spentUsd,
      projectedUsd,
    });
  }
}

/** Dollars left before the ceiling, never negative. */
export function remainingUsd(budget: BudgetState): number {
  return Math.max(0, budget.limitUsd - budget.spentUsd);
}

/** Return a new budget with `costUsd` added to what's been spent. */
export function addCost(budget: BudgetState, costUsd: number): BudgetState {
  if (costUsd < 0) {
    throw new RangeError(`costUsd must be >= 0, got ${costUsd}`);
  }
  return { ...budget, spentUsd: budget.spentUsd + costUsd };
}
