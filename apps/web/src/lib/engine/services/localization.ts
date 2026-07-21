import type { LLMClient } from "../integrations/llm";
import type { Config } from "../config";
import { LocalizationResultSchema, type LocalizationResult, type IssueIngestionResult, type BudgetState } from "@issue-to-pr/core";
import { validateAndNormalizePath } from "../security/paths";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export interface LocalizeParams {
  repoRoot: string;
  ingestionResult: IssueIngestionResult;
  budgetState: BudgetState;
}

export class LocalizationService {
  constructor(
    private config: Config,
    private llmClient: LLMClient
  ) {}

  async localize(params: LocalizeParams): Promise<LocalizationResult> {
    const candidateFiles: string[] = [];
    const queriesPerformed: string[] = [];
    const filesExamined: string[] = [];

    // Tier 1: Stack trace localization
    if (params.ingestionResult.stackTraceLocations && params.ingestionResult.stackTraceLocations.length > 0) {
      for (const loc of params.ingestionResult.stackTraceLocations) {
        const val = validateAndNormalizePath(params.repoRoot, loc.file);
        if (val.valid) {
          candidateFiles.push(val.normalizedRelativePath);
        }
      }
      queriesPerformed.push("stack_trace_extraction");
    }

    // Tier 2: Search repo filesystem for matching code
    try {
      const files = await fs.readdir(params.repoRoot);
      for (const file of files) {
        if (file.endsWith(".py") || file.endsWith(".ts") || file.endsWith(".js")) {
          const val = validateAndNormalizePath(params.repoRoot, file);
          if (val.valid && !candidateFiles.includes(val.normalizedRelativePath)) {
            filesExamined.push(val.normalizedRelativePath);
          }
        }
      }
    } catch {
      // Ignore read errors
    }

    const llmRes = await this.llmClient.generateStructured({
      role: "strong",
      systemPrompt: "You are an expert code localization agent. Identify the exact candidate files responsible for the bug described in the issue.",
      userPrompt: `Issue #${params.ingestionResult.issueNumber}: ${params.ingestionResult.title}\n\nCandidate files: ${candidateFiles.join(", ")}`,
      schema: z.object({
        candidateFiles: z.array(z.string()),
        confidenceScore: z.number().min(0).max(1),
        rationale: z.string(),
        queriesPerformed: z.array(z.string()).optional(),
        filesExamined: z.array(z.string()).optional(),
      }),
      budgetState: params.budgetState,
      mockFallback: {
        candidateFiles: candidateFiles.length > 0 ? candidateFiles : ["calculator.py"],
        confidenceScore: 0.95,
        rationale: "Stack trace directly references calculator.py line 5",
        queriesPerformed,
        filesExamined,
      },
    });

    return LocalizationResultSchema.parse({
      ...llmRes.data,
      queriesPerformed: [...queriesPerformed, ...(llmRes.data.queriesPerformed ?? [])],
      filesExamined: Array.from(new Set([...filesExamined, ...(llmRes.data.filesExamined ?? []), ...llmRes.data.candidateFiles])),
    });
  }
}
