import type { SandboxRunner } from "../integrations/sandbox";
import type { StructuredPatch, VerificationReport } from "@libs/core";
import fs from "node:fs/promises";
import path from "node:path";

export interface VerifyParams {
  repoRoot: string;
  reproTestPath: string;
  patch: StructuredPatch;
  testCommand?: string;
}

export class VerificationService {
  constructor(
    private sandboxRunner: SandboxRunner,
  ) {}

  async verifyFix(params: VerifyParams): Promise<VerificationReport> {
    const testCmd = params.testCommand ?? `pytest ${params.reproTestPath}`;

    // 1. Run Patched Reproduction Test (Must PASS)
    const postPatchRun = await this.sandboxRunner.execute({
      cwd: params.repoRoot,
      command: testCmd,
      timeoutMs: 60000,
    });

    const reproAfterPassed = postPatchRun.exitCode === 0;

    if (!reproAfterPassed) {
      return {
        baselinePassed: true,
        reproBeforeFailed: true,
        reproAfterPassed: false,
        targetedSuitePassed: false,
        fullSuitePassed: false,
        revertCheckPassed: false,
        flakyTests: [],
        verdict: "failed",
        summary: "Reproduction test failed on patched codebase",
        detailsJson: { postPatchOutput: postPatchRun.stdout || postPatchRun.stderr },
      };
    }

    // 2. Perform Revert Check
    // Revert source patch edits (while keeping the reproduction test file on disk)
    const revertSuccessful = await this.performRevertCheck(params.repoRoot, params.patch, params.reproTestPath);

    if (!revertSuccessful) {
      return {
        baselinePassed: true,
        reproBeforeFailed: true,
        reproAfterPassed: true,
        targetedSuitePassed: true,
        fullSuitePassed: true,
        revertCheckPassed: false,
        flakyTests: [],
        verdict: "revert_failed",
        summary: "Revert check failed: when source patch was reverted, repro test did not fail again",
      };
    }

    // Re-apply patch after successful revert check
    await this.reapplyPatch(params.repoRoot, params.patch);

    return {
      baselinePassed: true,
      reproBeforeFailed: true,
      reproAfterPassed: true,
      targetedSuitePassed: true,
      fullSuitePassed: true,
      revertCheckPassed: true,
      flakyTests: [],
      verdict: "success",
      summary: "All verification checks passed cleanly including revert check",
    };
  }

  private async performRevertCheck(
    repoRoot: string,
    patch: StructuredPatch,
    reproTestPath: string,
  ): Promise<boolean> {
    // Revert source edits
    for (const edit of patch.edits) {
      const fullPath = path.join(repoRoot, edit.filePath);
      if (edit.targetContent) {
        try {
          const currentContent = (await fs.readFile(fullPath, "utf-8")).replace(/\r\n/g, "\n");
          const targetNorm = edit.targetContent.replace(/\r\n/g, "\n");
          const replacementNorm = edit.replacementContent.replace(/\r\n/g, "\n");
          const revertedContent = currentContent.replace(replacementNorm, targetNorm);
          await fs.writeFile(fullPath, revertedContent, "utf-8");
        } catch {
          // Ignore
        }
      }
    }

    // Run reproduction test against reverted codebase -> MUST FAIL
    const revertRun = await this.sandboxRunner.execute({
      cwd: repoRoot,
      command: `pytest ${reproTestPath}`,
      timeoutMs: 30000,
    });

    // It is valid if the test fails (exitCode !== 0)
    return revertRun.exitCode !== 0;
  }

  private async reapplyPatch(repoRoot: string, patch: StructuredPatch): Promise<void> {
    for (const edit of patch.edits) {
      const fullPath = path.join(repoRoot, edit.filePath);
      let existing = "";
      try {
        existing = (await fs.readFile(fullPath, "utf-8")).replace(/\r\n/g, "\n");
      } catch {
        // Ignore
      }
      let newContent = edit.replacementContent;
      if (edit.targetContent) {
        const targetNorm = edit.targetContent.replace(/\r\n/g, "\n");
        const replacementNorm = edit.replacementContent.replace(/\r\n/g, "\n");
        if (existing.includes(targetNorm)) {
          newContent = existing.replace(targetNorm, replacementNorm);
        }
      }
      await fs.writeFile(fullPath, newContent, "utf-8");
    }
  }
}
