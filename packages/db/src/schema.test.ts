import { confidences, failureTypes, modes, runStates } from "@issue-to-pr/core";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  approvals,
  attempts,
  confidenceEnum,
  evaluations,
  events,
  failureTypeEnum,
  interventions,
  issues,
  jobs,
  modeEnum,
  prs,
  repos,
  runStateEnum,
  runs,
  traces,
} from "./schema";

describe("schema ↔ core enum consistency (drift guard)", () => {
  it("run_state pg enum matches core runStates exactly", () => {
    expect(runStateEnum.enumValues).toEqual([...runStates]);
  });
  it("mode pg enum matches core modes exactly", () => {
    expect(modeEnum.enumValues).toEqual([...modes]);
  });
  it("confidence pg enum matches core confidences exactly", () => {
    expect(confidenceEnum.enumValues).toEqual([...confidences]);
  });
  it("failure_type pg enum matches core failureTypes exactly", () => {
    expect(failureTypeEnum.enumValues).toEqual([...failureTypes]);
  });
});

describe("table shape", () => {
  const cols = (t: Parameters<typeof getTableColumns>[0]) => Object.keys(getTableColumns(t));

  it("defines all core tables", () => {
    for (const t of [repos, issues, runs, attempts, events, traces, approvals, prs, jobs, evaluations, interventions]) {
      expect(Object.keys(getTableColumns(t)).length).toBeGreaterThan(0);
    }
  });

  it("runs carries state-machine, budget, and claim columns", () => {
    expect(cols(runs)).toEqual(
      expect.arrayContaining([
        "id",
        "repoId",
        "issueNumber",
        "state",
        "mode",
        "confidence",
        "failureType",
        "budgetUsd",
        "spentUsd",
        "claimedBy",
        "claimedAt",
      ]),
    );
  });

  it("prs has the idempotency key that guards external writes", () => {
    expect(cols(prs)).toContain("idempotencyKey");
  });

  it("events is the append-only audit/SSE/replay stream", () => {
    expect(cols(events)).toEqual(expect.arrayContaining(["id", "runId", "type", "dataJson", "at"]));
  });

  it("traces records model/tool calls with token + cost accounting", () => {
    expect(cols(traces)).toEqual(
      expect.arrayContaining(["kind", "name", "tokensIn", "tokensOut", "latencyMs", "costUsd"]),
    );
  });
});
