import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { isSensitivePath, validateAndNormalizePath } from "../security/paths";
import type { Config } from "../config";
import type { LLMClient } from "../integrations/llm";
import {
  StructuredPatchSchema,
  type IssueIngestionResult,
  type LocalizationResult,
  type StructuredPatch,
} from "@issue-to-pr/core";

export class PatchingService {
  constructor(
    private config: Config,
    private llmClient: LLMClient,
  ) {}

  async proposeAndApplyPatch(
    repoRoot: string,
    ingestion: IssueIngestionResult,
    localization: LocalizationResult,
    reproductionTestCode?: string,
  ): Promise<StructuredPatch> {
    // Read source content of candidate files
    const fileContexts: Array<{ path: string; content: string }> = [];
    for (const relPath of localization.candidateFiles) {
      try {
        const norm = validateAndNormalizePath(relPath, repoRoot);
        const fullPath = path.join(repoRoot, norm);
        const content = await fs.readFile(fullPath, "utf-8");
        fileContexts.push({ path: norm, content });
      } catch {
        // Skip unreadable files
      }
    }

    // 1. Solicit structured patch proposal from strong LLM role
    const systemPrompt =
      "You are a senior principal Python software engineer. Propose a minimal, precise fix for the bug. Return JSON matching the schema.";

    const userPrompt = `Issue Title: ${ingestion.title}\nIssue Body:\n${ingestion.body}\n\nFiles to Fix:\n${fileContexts.map((f) => `--- ${f.path}\n${f.content}`).join("\n\n")}\n${reproductionTestCode ? `\nReproduction Test:\n${reproductionTestCode}` : ""}`;

    const llmRes = await this.llmClient.call({
      role: "strong",
      stage: "patching",
      systemPrompt,
      userPrompt,
      schema: StructuredPatchSchema,
      budget: { limitUsd: this.config.budgetUsdPerRun, spentUsd: 0 },
    });

    const patch = llmRes.data;
    const changedFiles: string[] = [];
    const sensitiveFiles: string[] = [];

    // 2. Apply edits deterministically with path safety & sensitive path detection
    for (const edit of patch.edits) {
      const normalizedPath = validateAndNormalizePath(edit.filePath, repoRoot);
      changedFiles.push(normalizedPath);

      if (isSensitivePath(normalizedPath)) {
        sensitiveFiles.push(normalizedPath);
      }

      const fullPath = path.join(repoRoot, normalizedPath);

      let existingContent = "";
      try {
        existingContent = (await fs.readFile(fullPath, "utf-8")).replace(/\r\n/g, "\n");
      } catch {
        // New file creation if not existing
      }

      let newContent = edit.replacementContent;
      if (edit.targetContent) {
        const normalizedTarget = edit.targetContent.replace(/\r\n/g, "\n");
        if (existingContent.includes(normalizedTarget)) {
          newContent = existingContent.replace(normalizedTarget, edit.replacementContent);
        }
      }

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, newContent, "utf-8");
    }

    // 3. Compute deterministic patch digest (SHA-256)
    const digestContent = patch.edits
      .map((e) => `${e.filePath}:${e.replacementContent}`)
      .join("\n");
    const patchDigest = crypto.createHash("sha256").update(digestContent).digest("hex");

    return {
      ...patch,
      patchDigest,
      changedFiles: Array.from(new Set(changedFiles)),
      sensitiveFiles: Array.from(new Set(sensitiveFiles)),
      isHighRisk: sensitiveFiles.length > 0,
    };
  }
}
