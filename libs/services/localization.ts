import type { Config } from "@util/config";
import type { LLMClient } from "../integrations/llm";
import {
  LocalizationResultSchema,
  type IssueIngestionResult,
  type LocalizationResult,
} from "@libs/core";
import fs from "node:fs/promises";
import path from "node:path";

export class LocalizationService {
  constructor(
    private config: Config,
    private llmClient: LLMClient,
  ) {}

  async localize(
    repoRoot: string,
    ingestionResult: IssueIngestionResult,
  ): Promise<LocalizationResult> {
    const filesExamined: string[] = [];
    const queriesPerformed: string[] = [];

    // Tier 1: Stack trace location prioritization
    if (ingestionResult.stackTraceLocations.length > 0) {
      const traceFiles = ingestionResult.stackTraceLocations.map((loc) => loc.file);
      filesExamined.push(...traceFiles);

      return {
        candidateFiles: Array.from(new Set(traceFiles)),
        candidates: ingestionResult.stackTraceLocations.map((loc) => ({
          filePath: loc.file,
          symbolName: loc.functionName,
          confidence: 0.9,
          reasoning: `Extracted directly from stack trace at line ${loc.line ?? "?"}`,
        })),
        evidence: `Stack trace in issue references file(s): ${traceFiles.join(", ")}`,
        overallConfidence: 0.9,
        queriesPerformed: ["stack_trace_analysis"],
        filesExamined,
      };
    }

    // Tier 2: Build light repository map
    const repoMap = await this.buildRepoMap(repoRoot);
    queriesPerformed.push("repo_map_traversal");

    // Tier 3: LLM Code search & candidate ranking
    const systemPrompt =
      "You are a expert code localizer. Examine the issue details and repository file structure to identify the exact files and functions causing the bug. Return JSON matching the schema.";

    const userPrompt = `Issue Title: ${ingestionResult.title}\nIssue Body:\n${ingestionResult.body}\n\nRepository File Map:\n${JSON.stringify(repoMap, null, 2)}`;

    const llmRes = await this.llmClient.call({
      role: "cheap",
      stage: "localizing",
      systemPrompt,
      userPrompt,
      schema: LocalizationResultSchema,
      budget: { limitUsd: this.config.budgetUsdPerRun, spentUsd: 0 },
    });

    return {
      ...llmRes.data,
      queriesPerformed: [...queriesPerformed, ...(llmRes.data.queriesPerformed ?? [])],
      filesExamined: Array.from(new Set([...filesExamined, ...(llmRes.data.filesExamined ?? []), ...llmRes.data.candidateFiles])),
    };
  }

  private async buildRepoMap(repoRoot: string): Promise<Array<{ filePath: string; sizeBytes: number }>> {
    const items: Array<{ filePath: string; sizeBytes: number }> = [];

    const traverse = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(repoRoot, fullPath).replace(/\\/g, "/");

        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "__pycache__" || entry.name === "venv") {
          continue;
        }

        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith(".py") || entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
          const stat = await fs.stat(fullPath);
          items.push({ filePath: relPath, sizeBytes: stat.size });
        }
      }
    };

    try {
      await traverse(repoRoot);
    } catch {
      // Return empty if repo directory is inaccessible
    }

    return items;
  }
}
