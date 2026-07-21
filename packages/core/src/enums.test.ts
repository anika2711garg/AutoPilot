import { describe, expect, it } from "vitest";

import { ConfidenceSchema, confidences } from "./confidence";
import { DEFAULT_MODE, ModeSchema, modes } from "./mode";

describe("confidence enum", () => {
  it("accepts the three grades and rejects others", () => {
    expect([...confidences]).toEqual(["strong", "weak", "unreproduced"]);
    for (const c of confidences) {
      expect(ConfidenceSchema.parse(c)).toBe(c);
    }
    expect(ConfidenceSchema.safeParse("medium").success).toBe(false);
  });
});

describe("mode enum", () => {
  it("accepts the three modes and rejects others", () => {
    expect([...modes]).toEqual(["strict", "permissive", "vibes"]);
    for (const m of modes) {
      expect(ModeSchema.parse(m)).toBe(m);
    }
    expect(ModeSchema.safeParse("yolo").success).toBe(false);
  });

  it("defaults to permissive (Mode B)", () => {
    expect(DEFAULT_MODE).toBe("permissive");
  });
});
