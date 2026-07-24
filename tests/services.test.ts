import { describe, expect, it } from "vitest";
import { loadConfig } from "@util/config";
import { LLMClient } from "@libs/integrations/llm";
import { GitHubClient } from "@libs/integrations/github";
import { IngestionService } from "@libs/services/ingestion";
import { LocalizationService } from "@libs/services/localization";
import { ApprovalsService } from "@libs/services/approvals";
import { PullRequestService } from "@libs/services/pull_requests";
import { EvaluationService } from "@libs/services/evaluations";

describe("Services Suite", () => {
  const config = loadConfig({
    DATABASE_URL_DIRECT: "postgresql://localhost:5432/db",
    DATABASE_URL_POOLED: "postgresql://localhost:5432/db",
    E2B_API_KEY: "e2b_test_key",
    GITHUB_WRITES_ENABLED: "true",
  });

  const llmClient = new LLMClient(config);
  const githubClient = new GitHubClient(config);
  const approvalsService = new ApprovalsService();
  const prService = new PullRequestService(githubClient, approvalsService);
  const evalService = new EvaluationService();

  it("IngestionService ingests issue metadata and extracts stack traces", async () => {
    const ingestionService = new IngestionService(config, githubClient, llmClient);
    const result = await ingestionService.ingestIssue("owner", "repo", 42);

    expect(result.issueNumber).toBe(42);
    expect(result.title).toBe("Bug in owner/repo #42");
    expect(result.injectionDetected).toBe(false);
  });

  it("LocalizationService identifies candidate files from stack trace or repo map", async () => {
    const localizationService = new LocalizationService(config, llmClient);
    const result = await localizationService.localize("/tmp", {
      repositoryFullName: "owner/repo",
      issueNumber: 1,
      title: "Bug in calculator",
      body: 'File "calculator.py", line 10, in add',
      labels: ["bug"],
      comments: [],
      stackTraceLocations: [{ file: "calculator.py", line: 10, functionName: "add" }],
      injectionDetected: false,
      injectionScore: 0,
    });

    expect(result.candidateFiles).toContain("calculator.py");
    expect(result.overallConfidence).toBeGreaterThan(0.5);
  });

  it("ApprovalsService validates exact patch and repro digests", () => {
    const valid = approvalsService.validateApprovalDigest(
      {
        runId: 1,
        status: "approved",
        approvedPatchDigest: "patch_sha256_abc",
        approvedReproductionDigest: "repro_sha256_xyz",
      },
      "patch_sha256_abc",
      "repro_sha256_xyz",
    );
    expect(valid).toBe(true);

    const invalid = approvalsService.validateApprovalDigest(
      {
        runId: 1,
        status: "approved",
        approvedPatchDigest: "old_patch",
        approvedReproductionDigest: "repro_sha256_xyz",
      },
      "new_patch",
      "repro_sha256_xyz",
    );
    expect(invalid).toBe(false);
  });

  it("PullRequestService generates rich PR body with badges and evidence", () => {
    const body = prService.generatePRBody(
      101,
      {
        repositoryFullName: "owner/repo",
        issueNumber: 42,
        title: "Add bug in calculator",
        body: "Calculates wrong sum",
        labels: ["bug"],
        comments: [],
        stackTraceLocations: [],
        injectionDetected: false,
        injectionScore: 0,
      },
      {
        explanation: "Fix addition calculation",
        edits: [{ filePath: "calculator.py", replacementContent: "return a + b" }],
        patchDigest: "sha256_patch",
        canonicalDiff: "diff",
        changedFiles: ["calculator.py"],
        sensitiveFiles: [],
        isHighRisk: false,
      },
      {
        baselinePassed: true,
        reproBeforeFailed: true,
        reproAfterPassed: true,
        targetedSuitePassed: true,
        fullSuitePassed: true,
        revertCheckPassed: true,
        flakyTests: [],
        verdict: "success",
        summary: "Passed",
      },
      "strong",
      "alice",
    );

    expect(body).toContain("🟢 STRONG");
    expect(body).toContain("`alice`");
    expect(body).toContain("#42");
    expect(body).toContain("`calculator.py`");
  });

  it("EvaluationService computes aggregate metrics accurately", () => {
    const metrics = evalService.computeAggregateMetrics([
      {
        taskId: "task-1",
        repo: "owner/repo",
        issueNumber: 1,
        mode: "permissive",
        resolved: true,
        costUsd: 0.1,
        latencyMs: 5000,
        localizedCorrectly: true,
        reproducedSuccessfully: true,
      },
      {
        taskId: "task-2",
        repo: "owner/repo",
        issueNumber: 2,
        mode: "strict",
        resolved: false,
        failureType: "cant_reproduce",
        costUsd: 0.05,
        latencyMs: 3000,
        localizedCorrectly: true,
        reproducedSuccessfully: false,
      },
    ]);

    expect(metrics.totalTasks).toBe(2);
    expect(metrics.resolvedCount).toBe(1);
    expect(metrics.resolvedPercentage).toBe(50);
    expect(metrics.localizationTop1Recall).toBe(100);
    expect(metrics.failureCounts["cant_reproduce"]).toBe(1);
  });
});
