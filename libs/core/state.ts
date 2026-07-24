import { z } from "zod";

import { InvalidTransitionError } from "./errors";

/**
 * The run state machine.
 *
 *   created → ingesting → localizing → reproducing → patching → verifying
 *           → awaiting_human → opening_pr → done
 *
 * plus  verifying → patching  (bounded retry)
 * plus  any non-terminal → failed  (typed bail-out; see FailureType)
 *
 * `awaiting_human` is the single parked state — the interventions row records
 * *why* it is parked (approve_pr / review_repro / clarify_issue / abort).
 */
export const runStates = [
  "created",
  "ingesting",
  "localizing",
  "reproducing",
  "patching",
  "verifying",
  "awaiting_human",
  "opening_pr",
  "done",
  "failed",
  "cancelled",
] as const;

export const RunStateSchema = z.enum(runStates);
export type RunState = z.infer<typeof RunStateSchema>;

/** Terminal states have no outgoing transitions. */
export const TERMINAL_STATES: ReadonlySet<RunState> = new Set(["done", "failed", "cancelled"]);

export function isTerminal(state: RunState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Happy-path + retry edges. `failed` and `cancelled` are intentionally NOT listed here — they are
 * reachable from every non-terminal state and handled by `canTransition`.
 *
 * Parking edges (into/out of `awaiting_human` for review_repro & clarify_issue)
 * are introduced with the intervention flow; today only the
 * approve-then-open-PR path enters `awaiting_human`.
 */
export const TRANSITIONS: Readonly<Record<RunState, readonly RunState[]>> = {
  created: ["ingesting"],
  ingesting: ["localizing"],
  localizing: ["reproducing"],
  reproducing: ["patching"],
  patching: ["verifying"],
  verifying: ["patching", "awaiting_human"],
  awaiting_human: ["opening_pr"],
  opening_pr: ["done"],
  done: [],
  failed: [],
  cancelled: [],
};

/** Every state a run may legally move to from `from`, including `failed` and `cancelled`. */
export function nextStates(from: RunState): readonly RunState[] {
  if (isTerminal(from)) return [];
  return [...TRANSITIONS[from], "failed", "cancelled"];
}

export function canTransition(from: RunState, to: RunState): boolean {
  if (isTerminal(from)) return false;
  if (to === "failed" || to === "cancelled") return true; // universal bail-out
  return TRANSITIONS[from].includes(to);
}

/** Throws {@link InvalidTransitionError} if `from → to` is not allowed. */
export function assertTransition(from: RunState, to: RunState): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
