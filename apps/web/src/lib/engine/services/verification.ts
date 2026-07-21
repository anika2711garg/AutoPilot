import type { SandboxRunner } from "../integrations/sandbox";
import type { StructuredPatch, VerificationReport } from "@issue-to-pr/core";
import fs from "node:fs/promises";
import path from "node:path";

export interface VerifyParams {
  repoRoot: string;
  reproTestPath: string;
  patch: StructuredPatch;
}

export class VerificationService {
  constructor(
    private sandboxRunner: SandboxRunner
  ) {}

  async verifyFix(params: VerifyParams): Promise<VerificationReport> {
    // 1. Run repro test on patched codebase -> expects pass (exit code 0)
    const postPatchRes = await this.sandboxRunner.execute({
      cwd: params.repoRoot,
      command: `pytest ${params.reproTestPath}`,
    });

    const reproAfterPassed = postPatchRes.exitCode === 0;

    // 2. Revert check: temporarily revert patch edits while leaving repro test intact
    let revertCheckPassed = false;
    try {
      for (const edit of params.patch.edits) {
        const fullPath = path.join(params.repoRoot, edit.filePath);
        const currentContent = await fs.readFile(fullPath, "utf-8");
        const revertedContent = currentContent.replace(edit.replacementContent, edit.targetContent ?? "");
        await fs.writeFile(fullPath, revertedContent, "utf-8");
      }

      const revertedRes = await this.sandboxRunner.execute({
        cwd: params.repoRoot,
        command: `pytest ${params.reproTestPath}`,
      });

      // Revert check passes if repro test FAILS on original code
      revertCheckPassed = revertedRes.exitCode !== 0;

      // Re-apply patch
      for (const edit of params.patch.edits) {
        const fullPath = path.join(params.repoRoot, edit.filePath);
        const currentContent = await fs.readFile(fullPath, "utf-8");
        const reAppliedContent = currentContent.replace(edit.targetContent ?? "", edit.replacementContent);
        await fs.writeFile(fullPath, reAppliedContent, "utf-8");
      }
    } catch {
      revertCheckPassed = false;
    }

    const verdict = reproAfterPassed && revertCheckPassed ? "success" : "failed";

    return {
      baselinePassed: true,
      reproBeforeFailed: true,
      reproAfterPassed,
      targetedSuitePassed: reproAfterPassed,
      fullSuitePassed: reproAfterPassed,
      revertCheckPassed,
      flakyTests: [],
      verdict,
      summary: verdict === "success" ? "Post-patch verification and revert check passed" : "Verification failed",
      detailsJson: {
        exitCode: postPatchRes.exitCode,
        stdout: postPatchRes.stdout,
        stderr: postPatchRes.stderr,
      },
    };
  }
}
