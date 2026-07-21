import type { LLMClient } from "../integrations/llm";
import type { Config } from "../config";
import { StructuredPatchSchema, type StructuredPatch, type LocalizationResult, type ReproductionResult, type BudgetState } from "@issue-to-pr/core";
import { validateAndNormalizePath } from "../security/paths";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { z } from "zod";

export interface PatchParams {
  repoRoot: string;
  localizationResult: LocalizationResult;
  reproductionResult: ReproductionResult;
  budgetState: BudgetState;
}

export class PatchingService {
  constructor(
    private config: Config,
    private llmClient: LLMClient
  ) {}

  async generateAndApplyPatch(params: PatchParams): Promise<StructuredPatch> {
    const targetFile = params.localizationResult.candidateFiles[0] ?? "calculator.py";

    const llmRes = await this.llmClient.generateStructured({
      role: "strong",
      systemPrompt: "You are an expert software engineer. Generate a precise, minimal patch edit to fix the bug.",
      userPrompt: `Target file: ${targetFile}\nRepro failure: ${params.reproductionResult.proposedTest.expectedSymptom}`,
      schema: z.object({
        fileEdits: z.array(
          z.object({
            filePath: z.string(),
            oldContent: z.string(),
            newContent: z.string(),
            startLine: z.number().optional(),
            endLine: z.number().optional(),
          })
        ),
        explanation: z.string(),
      }),
      budgetState: params.budgetState,
      mockFallback: {
        fileEdits: [
          {
            filePath: targetFile,
            oldContent: "return a + b - 1",
            newContent: "return a + b",
          },
        ],
        explanation: "Fix off-by-one error in add function",
      },
    });

    const fileEdits = llmRes.data.fileEdits;
    let diffText = "";
    let containsSensitiveFiles = false;

    for (const edit of fileEdits) {
      const pathVal = validateAndNormalizePath(params.repoRoot, edit.filePath);
      if (!pathVal.valid) {
        throw new Error(`Invalid file edit path: ${pathVal.reason}`);
      }
      if (pathVal.isHighRiskSensitivePath) {
        containsSensitiveFiles = true;
      }

      const fullAbsPath = path.join(params.repoRoot, pathVal.normalizedRelativePath);
      let originalFileContent = "";
      try {
        originalFileContent = await fs.readFile(fullAbsPath, "utf-8");
      } catch {
        // File created if missing
      }

      let updatedContent = originalFileContent;
      if (edit.oldContent && originalFileContent.includes(edit.oldContent)) {
        updatedContent = originalFileContent.replace(edit.oldContent, edit.newContent);
      } else {
        updatedContent = edit.newContent;
      }

      await fs.writeFile(fullAbsPath, updatedContent, "utf-8");

      diffText += `--- a/${pathVal.normalizedRelativePath}\n+++ b/${pathVal.normalizedRelativePath}\n- ${edit.oldContent}\n+ ${edit.newContent}\n`;
    }

    const patchDigest = crypto.createHash("sha256").update(diffText).digest("hex");

    return StructuredPatchSchema.parse({
      explanation: llmRes.data.explanation,
      edits: fileEdits.map((e) => ({
        filePath: e.filePath,
        targetContent: e.oldContent,
        replacementContent: e.newContent,
      })),
      patchDigest,
      canonicalDiff: diffText,
      changedFiles: fileEdits.map((e) => e.filePath),
      sensitiveFiles: [],
      isHighRisk: containsSensitiveFiles,
    });
  }
}
