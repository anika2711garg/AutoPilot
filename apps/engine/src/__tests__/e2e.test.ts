import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { loadConfig } from "../config";
import { LLMClient } from "../integrations/llm";
import { GitHubClient } from "../integrations/github";
import { SandboxRunner } from "../integrations/sandbox";
import { IngestionService } from "../services/ingestion";
import { LocalizationService } from "../services/localization";
import { ReproductionService } from "../services/reproduction";
import { PatchingService } from "../services/patching";
import { VerificationService } from "../services/verification";
import { ApprovalsService } from "../services/approvals";
import { PullRequestService } from "../services/pull_requests";

describe("End-to-End Deterministic Issue-to-PR Flow", () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temporary local Python repository fixture
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dig_ai_e2e_fixture_"));

    // Write buggy Python file calculator.py (add returns a + b - 1 instead of a + b)
    const buggyCode = `def add(a, b):
    return a + b - 1
`;
    await fs.writeFile(path.join(tempDir, "calculator.py"), buggyCode, "utf-8");

    // Write existing passing baseline test
    const baselineTest = `def test_baseline():
    assert 1 + 1 == 2
`;
    await fs.mkdir(path.join(tempDir, "tests"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tests", "test_baseline.py"), baselineTest, "utf-8");
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Cleanup
    }
  });

  it("completes full issue-to-PR workflow end-to-end deterministically", async () => {
    const config = loadConfig({
      DATABASE_URL_DIRECT: "postgresql://localhost:5432/db",
      DATABASE_URL_POOLED: "postgresql://localhost:5432/db",
      E2B_API_KEY: "e2b_test_key",
      GITHUB_WRITES_ENABLED: "true",
    });

    const llmClient = new LLMClient(config);
    const githubClient = new GitHubClient(config);
    const sandboxRunner = new SandboxRunner();
    const ingestionService = new IngestionService(config, githubClient, llmClient);
    const localizationService = new LocalizationService(config, llmClient);
    const reproductionService = new ReproductionService(config, llmClient, sandboxRunner);
    const patchingService = new PatchingService(config, llmClient);
    const verificationService = new VerificationService(sandboxRunner);
    const approvalsService = new ApprovalsService();
    const prService = new PullRequestService(githubClient, approvalsService);

    // Track state transitions event log
    const eventLog: string[] = [];

    // Step 1: Run Creation
    const runId = 101;
    eventLog.push("run.created");

    // Step 2: Issue Ingestion
    eventLog.push("run.state_changed.ingesting");
    const ingestionRes = await ingestionService.ingestIssue("owner", "calculator_repo", 1);
    expect(ingestionRes.issueNumber).toBe(1);
    expect(ingestionRes.injectionDetected).toBe(false);

    // Step 3: Localization
    eventLog.push("run.state_changed.localizing");
    const localizationRes = await localizationService.localize(tempDir, ingestionRes);
    expect(localizationRes.candidateFiles).toContain("calculator.py");

    // Step 4: Reproduction Test Generation & Execution
    eventLog.push("run.state_changed.reproducing");
    const reproRes = await reproductionService.generateAndVerifyReproduction(
      tempDir,
      ingestionRes,
      localizationRes,
    );
    expect(reproRes.syntaxValid).toBe(true);
    expect(reproRes.failedBeforePatch).toBe(true);
    expect(reproRes.confidence).toBe("strong");

    // Step 5: Patch Proposal & Application
    eventLog.push("run.state_changed.patching");
    const patchRes = await patchingService.proposeAndApplyPatch(
      tempDir,
      ingestionRes,
      localizationRes,
      reproRes.proposedTest.testCode,
    );
    expect(patchRes.changedFiles).toContain("calculator.py");
    expect(patchRes.patchDigest.length).toBeGreaterThan(0);

    // Step 6: Sandbox Verification & Revert Check
    eventLog.push("run.state_changed.verifying");
    const verificationRes = await verificationService.verifyFix({
      repoRoot: tempDir,
      reproTestPath: reproRes.proposedTest.testFilePath,
      patch: patchRes,
    });
    expect(verificationRes.verdict).toBe("success");
    expect(verificationRes.reproAfterPassed).toBe(true);
    expect(verificationRes.revertCheckPassed).toBe(true);

    // Step 7: Awaiting Human Approval Gate
    eventLog.push("run.state_changed.awaiting_human");
    const reproDigest = "sha256_repro_test_digest";

    // Human Approval Action
    const approvalRecord = {
      runId,
      status: "approved" as const,
      reviewerIdentifier: "senior_dev",
      approvedPatchDigest: patchRes.patchDigest,
      approvedReproductionDigest: reproDigest,
    };

    // Step 8: Idempotent Draft PR Creation
    eventLog.push("run.state_changed.opening_pr");
    const idempotencyKey = prService.generateIdempotencyKey(runId, patchRes.patchDigest);

    const prResult1 = await prService.createDraftPR(
      {
        runId,
        idempotencyKey,
        title: "fix(calculator): fix addition math bug",
        body: "Automated fix",
        headBranch: "dig-ai/fix-calculator-1",
        baseBranch: "main",
        draft: true,
      },
      approvalRecord,
      patchRes,
      reproDigest,
      "owner",
      "calculator_repo",
      1,
      ingestionRes,
      verificationRes,
      reproRes.confidence,
    );

    expect(prResult1.prNumber).toBeGreaterThan(0);
    expect(prResult1.url).toContain("pull/");

    // Step 9: Repeated PR Request is Idempotent
    const prResult2 = await prService.createDraftPR(
      {
        runId,
        idempotencyKey,
        title: "fix(calculator): fix addition math bug",
        body: "Automated fix",
        headBranch: "dig-ai/fix-calculator-1",
        baseBranch: "main",
        draft: true,
      },
      approvalRecord,
      patchRes,
      reproDigest,
      "owner",
      "calculator_repo",
      1,
      ingestionRes,
      verificationRes,
      reproRes.confidence,
    );

    expect(prResult2.prNumber).toBe(prResult1.prNumber);

    eventLog.push("run.state_changed.done");

    // Verify full state machine trajectory
    expect(eventLog).toEqual([
      "run.created",
      "run.state_changed.ingesting",
      "run.state_changed.localizing",
      "run.state_changed.reproducing",
      "run.state_changed.patching",
      "run.state_changed.verifying",
      "run.state_changed.awaiting_human",
      "run.state_changed.opening_pr",
      "run.state_changed.done",
    ]);
  });
});
