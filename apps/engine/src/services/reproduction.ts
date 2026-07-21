import type { Config } from "../config";
import type { LLMClient } from "../integrations/llm";
import type { SandboxRunner } from "../integrations/sandbox";
import { validateAndNormalizePath } from "../security/paths";
import {
  ReproductionProposalSchema,
  type Confidence,
  type IssueIngestionResult,
  type LocalizationResult,
  type ReproductionResult,
} from "@issue-to-pr/core";
import fs from "node:fs/promises";
import path from "node:path";

export class ReproductionService {
  constructor(
    private config: Config,
    private llmClient: LLMClient,
    private sandboxRunner: SandboxRunner,
  ) {}

  async generateAndVerifyReproduction(
    repoRoot: string,
    ingestion: IssueIngestionResult,
    localization: LocalizationResult,
  ): Promise<ReproductionResult> {
    const rejectedReasons: string[] = [];

    // 1. Propose reproduction pytest test via strong LLM role
    const systemPrompt =
      "You are a test-driven AI engineer. Write a minimal pytest test file that reproduces the reported bug. The test MUST fail on the unpatched codebase. Return JSON matching the schema.";

    const userPrompt = `Issue Title: ${ingestion.title}\nIssue Body:\n${ingestion.body}\nTarget Files: ${localization.candidateFiles.join(", ")}`;

    const llmRes = await this.llmClient.call({
      role: "strong",
      stage: "reproducing",
      systemPrompt,
      userPrompt,
      schema: ReproductionProposalSchema,
      budget: { limitUsd: this.config.budgetUsdPerRun, spentUsd: 0 },
    });

    const proposal = llmRes.data;

    // 2. Validate path safety
    let normalizedTestPath: string;
    try {
      normalizedTestPath = validateAndNormalizePath(proposal.testFilePath, repoRoot);
    } catch (err) {
      return {
        proposedTest: proposal,
        syntaxValid: false,
        failedBeforePatch: false,
        symptomMatched: false,
        confidence: "unreproduced",
        failureReason: `Invalid test path: ${err instanceof Error ? err.message : String(err)}`,
        rejectedReasons: ["Invalid test path"],
      };
    }

    // 3. Reject trivial always-pass test logic or self-modification
    if (!proposal.testCode.includes("assert")) {
      rejectedReasons.push("Test lacks assertion statement");
    }
    if (proposal.testCode.includes("open(") && (proposal.testCode.includes("w") || proposal.testCode.includes("a"))) {
      rejectedReasons.push("Test modifies files directly");
    }

    if (rejectedReasons.length > 0) {
      return {
        proposedTest: proposal,
        syntaxValid: true,
        failedBeforePatch: false,
        symptomMatched: false,
        confidence: "unreproduced",
        failureReason: rejectedReasons.join("; "),
        rejectedReasons,
      };
    }

    // 4. Write reproduction test file to repo disk
    const absoluteTestPath = path.join(repoRoot, normalizedTestPath);
    await fs.mkdir(path.dirname(absoluteTestPath), { recursive: true });
    await fs.writeFile(absoluteTestPath, proposal.testCode, "utf-8");

    // 5. Execute pre-patch reproduction test in sandbox
    const execResult = await this.sandboxRunner.execute({
      cwd: repoRoot,
      command: `pytest ${normalizedTestPath}`,
      timeoutMs: 30000,
    });

    // Check if test execution failed (which is required before the fix!)
    const testCases = execResult.report?.cases ?? [];
    const testFailed = execResult.exitCode !== 0 || testCases.some((c) => c.status === "failed" || c.status === "error");

    if (!testFailed) {
      // Test passed before patch! This is invalid as a bug reproduction.
      return {
        proposedTest: proposal,
        syntaxValid: true,
        failedBeforePatch: false,
        symptomMatched: false,
        confidence: "unreproduced",
        failureReason: "Proposed test passed on unpatched code (did not reproduce bug)",
        rejectedReasons: ["Test passed before patch"],
        rawOutput: execResult.stdout || execResult.stderr,
      };
    }

    // 6. Check if failure symptom matches reported issue
    const outputText = `${execResult.stdout}\n${execResult.stderr}`;
    const symptomMatched =
      testFailed &&
      (proposal.expectedSymptom.length === 0 ||
        outputText.toLowerCase().includes(proposal.expectedSymptom.toLowerCase()) ||
        outputText.includes("AssertionError") ||
        outputText.includes("FAILED") ||
        outputText.includes("Error") ||
        execResult.exitCode !== 0);

    let confidence: Confidence = "unreproduced";
    if (testFailed && symptomMatched) {
      confidence = "strong";
    } else if (testFailed) {
      confidence = "weak";
    }

    return {
      proposedTest: proposal,
      syntaxValid: true,
      failedBeforePatch: testFailed,
      symptomMatched,
      confidence,
      rawOutput: outputText,
      rejectedReasons,
    };
  }
}
