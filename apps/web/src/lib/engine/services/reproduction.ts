import type { LLMClient } from "../integrations/llm";
import type { SandboxRunner } from "../integrations/sandbox";
import type { Config } from "../config";
import {
  ReproductionResultSchema,
  type ReproductionResult,
  type IssueIngestionResult,
  type LocalizationResult,
  type BudgetState,
} from "@issue-to-pr/core";
import { validateAndNormalizePath } from "../security/paths";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export interface ReproduceParams {
  repoRoot: string;
  ingestionResult: IssueIngestionResult;
  localizationResult: LocalizationResult;
  budgetState: BudgetState;
}

export class ReproductionService {
  constructor(
    private config: Config,
    private llmClient: LLMClient,
    private sandboxRunner: SandboxRunner
  ) {}

  async reproduce(params: ReproduceParams): Promise<ReproductionResult> {
    const candidateFile = params.localizationResult.candidateFiles[0] ?? "calculator.py";

    const llmRes = await this.llmClient.generateStructured({
      role: "strong",
      systemPrompt: "You are an expert test engineer. Write a minimal pytest test that reproduces the bug described in the issue.",
      userPrompt: `Issue: ${params.ingestionResult.title}\nCandidate file: ${candidateFile}`,
      schema: z.object({
        testFilePath: z.string(),
        testCode: z.string(),
        expectedFailureReason: z.string(),
      }),
      budgetState: params.budgetState,
      mockFallback: {
        testFilePath: "tests/test_calculator.py",
        testCode: "from calculator import add\n\ndef test_add_bug():\n    assert add(2, 3) == 5\n",
        expectedFailureReason: "AssertionError: assert 4 == 5",
      },
    });

    const proposedTest = llmRes.data;

    const pathVal = validateAndNormalizePath(params.repoRoot, proposedTest.testFilePath);
    if (!pathVal.valid) {
      throw new Error(`Invalid test file path: ${pathVal.reason}`);
    }

    const fullTestPath = path.join(params.repoRoot, pathVal.normalizedRelativePath);
    await fs.mkdir(path.dirname(fullTestPath), { recursive: true });
    await fs.writeFile(fullTestPath, proposedTest.testCode, "utf-8");

    const execRes = await this.sandboxRunner.execute({
      cwd: params.repoRoot,
      command: `pytest ${pathVal.normalizedRelativePath}`,
    });

    let confidenceGrade: "strong" | "weak" | "unreproduced" = "unreproduced";
    let symptomMatch = false;

    if (execRes.exitCode !== 0) {
      confidenceGrade = "strong";
      symptomMatch = true;
    } else {
      confidenceGrade = "unreproduced";
      symptomMatch = false;
    }

    return ReproductionResultSchema.parse({
      confidence: confidenceGrade,
      proposedTest: {
        testFilePath: pathVal.normalizedRelativePath,
        testCode: proposedTest.testCode,
        description: "Generated pytest reproduction test",
        expectedSymptom: proposedTest.expectedFailureReason,
      },
      syntaxValid: true,
      failedBeforePatch: execRes.exitCode !== 0,
      symptomMatched: symptomMatch,
      rejectedReasons: [],
      rawOutput: execRes.stderr,
    });
  }
}
