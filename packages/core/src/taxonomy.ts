import { z } from "zod";

/**
 * The failure taxonomy. Every dead run lands in exactly one of these — failures
 * become data, not free text. `cant_reproduce` is a valid, honest ending.
 */
export const failureTypes = [
  "cant_localize",
  "cant_reproduce",
  "weak_reproduction",
  "build_failed",
  "patch_apply_failed",
  "tests_regressed",
  "flaky_suite",
  "revert_check_failed",
  "budget_exceeded",
  "attempts_exhausted",
  "injection_suspected",
  "rejected_by_human",
  "infra_error",
] as const;

export const FailureTypeSchema = z.enum(failureTypes);
export type FailureType = z.infer<typeof FailureTypeSchema>;

/** Human-readable, one-line meaning of each failure category (for logs/UI). */
export const FAILURE_DESCRIPTIONS: Readonly<Record<FailureType, string>> = {
  cant_localize: "Could not confidently find the relevant code.",
  cant_reproduce: "Could not write a failing test tied to the reported bug.",
  weak_reproduction: "A failing test exists but its symptom match is uncertain (strict halt).",
  build_failed: "The repo environment would not build.",
  patch_apply_failed: "A structured edit failed to apply through git.",
  tests_regressed: "The fix broke tests that passed in the baseline.",
  flaky_suite: "The suite is too non-deterministic to reach a verdict.",
  revert_check_failed: "After reverting the patch, the repro test did not fail again.",
  budget_exceeded: "Hit a hard dollar / token / wall-clock ceiling.",
  attempts_exhausted: "Retry cap reached without a verified fix.",
  injection_suspected: "Issue text tripped the prompt-injection screen.",
  rejected_by_human: "A human declined the change at the approval gate.",
  infra_error: "Infrastructure fault (sandbox, DB, API) — not the agent's judgement.",
};
