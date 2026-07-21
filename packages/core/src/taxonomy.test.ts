import { describe, expect, it } from "vitest";

import { FAILURE_DESCRIPTIONS, FailureTypeSchema, failureTypes } from "./taxonomy";

describe("failure taxonomy", () => {
  it("has exactly 17 distinct categories", () => {
    expect(failureTypes).toHaveLength(17);
    expect(new Set(failureTypes).size).toBe(17);
  });

  it("parses every valid category and rejects anything else", () => {
    for (const t of failureTypes) {
      expect(FailureTypeSchema.parse(t)).toBe(t);
    }
    expect(FailureTypeSchema.safeParse("nonsense").success).toBe(false);
    expect(FailureTypeSchema.safeParse("").success).toBe(false);
    expect(FailureTypeSchema.safeParse("Cant_Reproduce").success).toBe(false);
  });

  it("has a non-empty description for every category (completeness)", () => {
    expect(Object.keys(FAILURE_DESCRIPTIONS).sort()).toEqual([...failureTypes].sort());
    for (const t of failureTypes) {
      expect(FAILURE_DESCRIPTIONS[t].length).toBeGreaterThan(0);
    }
  });
});
