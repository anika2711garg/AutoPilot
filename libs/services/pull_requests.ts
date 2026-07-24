import type { GitHubClient, CreateDraftPRResult } from "../integrations/github";
import type { ApprovalsService } from "./approvals";
import type {
  ApprovalRecord,
  Confidence,
  CreatePRPayload,
  IssueIngestionResult,
  StructuredPatch,
  VerificationReport,
} from "@libs/core";
import crypto from "node:crypto";

export class PullRequestService {
  constructor(
    private githubClient: GitHubClient,
    private approvalsService: ApprovalsService,
  ) {}

  generateIdempotencyKey(runId: number, patchDigest: string): string {
    return crypto
      .createHash("sha256")
      .update(`run_${runId}_patch_${patchDigest}`)
      .digest("hex");
  }

  generatePRBody(
    runId: number,
    ingestion: IssueIngestionResult,
    patch: StructuredPatch,
    verification: VerificationReport,
    confidence: Confidence,
    approver?: string,
  ): string {
    const isWeak = confidence === "weak" || confidence === "unreproduced";
    const confidenceBadge = confidence === "strong" ? "🟢 STRONG" : isWeak ? "🟡 WEAK" : "🔴 UNREPRODUCED";

    return `## 🤖 DIG AI — Issue-to-PR Fix

**Issue Reference**: #${ingestion.issueNumber} (${ingestion.title})
**Run ID**: \`${runId}\`
**Reproduction Confidence**: ${confidenceBadge}
**Approved By**: \`${approver ?? "Human Reviewer"}\`

### Summary
${patch.explanation}

### Verification Evidence
- **Baseline Suite**: ${verification.baselinePassed ? "PASSED" : "FAILED"}
- **Pre-patch Reproduction Test**: ${verification.reproBeforeFailed ? "FAILED (Expected)" : "PASSED"}
- **Post-patch Reproduction Test**: ${verification.reproAfterPassed ? "PASSED" : "FAILED"}
- **Revert Check**: ${verification.revertCheckPassed ? "VERIFIED (Repro failed on revert)" : "FAILED"}
- **Final Verdict**: **${verification.verdict.toUpperCase()}**

### Changed Files
${patch.changedFiles.map((f) => `- \`${f}\``).join("\n")}

${patch.sensitiveFiles.length > 0 ? `\n> ⚠️ **Warning**: High-risk sensitive files modified:\n${patch.sensitiveFiles.map((f) => `> - \`${f}\``).join("\n")}` : ""}

---
*Created automatically by DIG AI Headless Engine after deterministic verification and human gate approval.*
`;
  }

  async createDraftPR(
    payload: CreatePRPayload,
    approval: ApprovalRecord,
    patch: StructuredPatch,
    reproDigest: string,
    owner: string,
    repo: string,
    issueNumber: number,
    ingestion: IssueIngestionResult,
    verification: VerificationReport,
    confidence: Confidence,
  ): Promise<CreateDraftPRResult> {
    // 1. Verify human approval digest binding
    const valid = this.approvalsService.validateApprovalDigest(approval, patch.patchDigest, reproDigest);
    if (!valid) {
      throw new Error("Cannot create PR: Approval digests do not match current patch or reproduction digests");
    }

    // 2. Build rich PR body
    const body = this.generatePRBody(payload.runId, ingestion, patch, verification, confidence, approval.reviewerIdentifier);

    // 3. Delegate to GitHub client with idempotency key
    return this.githubClient.createDraftPR({
      repoOwner: owner,
      repoName: repo,
      issueNumber,
      title: `fix(#${issueNumber}): ${ingestion.title}`,
      body,
      headBranch: payload.headBranch || `dig-ai/fix-issue-${issueNumber}`,
      baseBranch: payload.baseBranch || "main",
      idempotencyKey: payload.idempotencyKey,
    });
  }
}
