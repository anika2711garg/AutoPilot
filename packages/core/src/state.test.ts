import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { InvalidTransitionError } from "./errors";
import {
  assertTransition,
  canTransition,
  isTerminal,
  nextStates,
  RunStateSchema,
  runStates,
  TERMINAL_STATES,
  TRANSITIONS,
  type RunState,
} from "./state";

const anyState = fc.constantFrom(...runStates);
const nonTerminal = runStates.filter((s) => !TERMINAL_STATES.has(s));

describe("state machine — structural integrity", () => {
  it("defines outgoing edges for every state (completeness)", () => {
    for (const s of runStates) {
      expect(TRANSITIONS[s], `missing transitions for ${s}`).toBeDefined();
    }
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...runStates].sort());
  });

  it("only ever targets valid states", () => {
    for (const targets of Object.values(TRANSITIONS)) {
      for (const t of targets) {
        expect(() => RunStateSchema.parse(t)).not.toThrow();
      }
    }
  });

  it("has no self-loops", () => {
    for (const s of runStates) {
      expect(TRANSITIONS[s]).not.toContain(s);
    }
  });

  it("never lists `failed` explicitly (it is universal, handled in code)", () => {
    for (const s of runStates) {
      expect(TRANSITIONS[s]).not.toContain("failed");
    }
  });

  it("terminal states are exactly cancelled + done + failed with no exits", () => {
    expect([...TERMINAL_STATES].sort()).toEqual(["cancelled", "done", "failed"]);
    expect(TRANSITIONS.done).toEqual([]);
    expect(TRANSITIONS.failed).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
  });
});

describe("canTransition — happy path", () => {
  const chain: RunState[] = [
    "created",
    "ingesting",
    "localizing",
    "reproducing",
    "patching",
    "verifying",
    "awaiting_human",
    "opening_pr",
    "done",
  ];

  it("walks the full pipeline end to end", () => {
    for (let i = 0; i < chain.length - 1; i++) {
      expect(canTransition(chain[i]!, chain[i + 1]!)).toBe(true);
    }
  });

  it("allows the verify → patch retry loop", () => {
    expect(canTransition("verifying", "patching")).toBe(true);
  });
});

describe("canTransition — illegal edges are rejected", () => {
  it.each([
    ["created", "done"],
    ["created", "localizing"],
    ["ingesting", "reproducing"],
    ["localizing", "patching"],
    ["reproducing", "verifying"],
    ["patching", "awaiting_human"],
    ["awaiting_human", "done"],
    ["opening_pr", "awaiting_human"],
  ] as const)("%s ✗→ %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

describe("failed and cancelled are reachable from every non-terminal state", () => {
  it.each(nonTerminal)("%s → failed", (from) => {
    expect(canTransition(from, "failed")).toBe(true);
  });
  it.each(nonTerminal)("%s → cancelled", (from) => {
    expect(canTransition(from, "cancelled")).toBe(true);
  });
});

describe("terminal states are dead ends", () => {
  it.each(["done", "failed", "cancelled"] as const)("%s cannot transition anywhere", (from) => {
    for (const to of runStates) {
      expect(canTransition(from, to)).toBe(false);
    }
    expect(nextStates(from)).toEqual([]);
    expect(isTerminal(from)).toBe(true);
  });
});

describe("nextStates", () => {
  it("returns the happy-path targets plus failed and cancelled for non-terminal states", () => {
    expect(nextStates("verifying")).toEqual(["patching", "awaiting_human", "failed", "cancelled"]);
    expect(nextStates("created")).toEqual(["ingesting", "failed", "cancelled"]);
  });
});

describe("assertTransition", () => {
  it("does not throw for a legal edge", () => {
    expect(() => assertTransition("created", "ingesting")).not.toThrow();
  });

  it("throws a typed InvalidTransitionError carrying the edge", () => {
    try {
      assertTransition("created", "done");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTransitionError);
      expect((err as InvalidTransitionError).from).toBe("created");
      expect((err as InvalidTransitionError).to).toBe("done");
    }
  });
});

describe("properties (fast-check)", () => {
  it("canTransition and nextStates agree for every pair", () => {
    fc.assert(
      fc.property(anyState, anyState, (from, to) => {
        expect(canTransition(from, to)).toBe(nextStates(from).includes(to));
      }),
    );
  });

  it("no state ever transitions to itself", () => {
    fc.assert(
      fc.property(anyState, (s) => {
        expect(canTransition(s, s)).toBe(false);
      }),
    );
  });

  it("terminal source ⇒ no transition; non-terminal source ⇒ can always fail", () => {
    fc.assert(
      fc.property(anyState, anyState, (from, to) => {
        if (isTerminal(from)) {
          expect(canTransition(from, to)).toBe(false);
        } else {
          expect(canTransition(from, "failed")).toBe(true);
        }
      }),
    );
  });
});
