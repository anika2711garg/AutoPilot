import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { addCost, assertBudget, remainingUsd, type BudgetState } from "./budget";
import { BudgetExceededError } from "./errors";

const budget = (limitUsd: number, spentUsd: number): BudgetState => ({ limitUsd, spentUsd });

describe("assertBudget", () => {
  it("passes when spend + projected is under the limit", () => {
    expect(() => assertBudget(budget(2, 0.5), 0.5)).not.toThrow();
  });

  it("passes at the exact boundary (spend up to the limit is allowed)", () => {
    expect(() => assertBudget(budget(2, 1.5), 0.5)).not.toThrow();
    expect(() => assertBudget(budget(2, 2), 0)).not.toThrow();
  });

  it("throws once the projected call would exceed the limit", () => {
    expect(() => assertBudget(budget(2, 1.5), 0.51)).toThrow(BudgetExceededError);
  });

  it("throws on a zero-cost check when already over budget", () => {
    expect(() => assertBudget(budget(2, 2.0001), 0)).toThrow(BudgetExceededError);
  });

  it("carries the offending numbers on the error", () => {
    try {
      assertBudget(budget(2, 1.9), 0.5);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      const detail = (err as BudgetExceededError).detail;
      expect(detail).toEqual({ limitUsd: 2, spentUsd: 1.9, projectedUsd: 0.5 });
    }
  });

  it("rejects a negative projected cost", () => {
    expect(() => assertBudget(budget(2, 0), -0.01)).toThrow(RangeError);
  });
});

describe("remainingUsd", () => {
  it("reports the gap and clamps to zero once overspent", () => {
    expect(remainingUsd(budget(2, 0.5))).toBeCloseTo(1.5);
    expect(remainingUsd(budget(2, 2))).toBe(0);
    expect(remainingUsd(budget(2, 3))).toBe(0);
  });
});

describe("addCost", () => {
  it("accumulates spend immutably", () => {
    const b0 = budget(2, 0.5);
    const b1 = addCost(b0, 0.25);
    expect(b1.spentUsd).toBeCloseTo(0.75);
    expect(b0.spentUsd).toBe(0.5); // original untouched
  });

  it("rejects a negative cost", () => {
    expect(() => addCost(budget(2, 0), -1)).toThrow(RangeError);
  });
});

describe("properties (fast-check)", () => {
  const money = fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true });

  it("throws iff spent + projected strictly exceeds the limit", () => {
    fc.assert(
      fc.property(money, money, money, (limit, spent, projected) => {
        const over = spent + projected > limit;
        const run = () => assertBudget(budget(limit, spent), projected);
        if (over) {
          expect(run).toThrow(BudgetExceededError);
        } else {
          expect(run).not.toThrow();
        }
      }),
    );
  });
});
