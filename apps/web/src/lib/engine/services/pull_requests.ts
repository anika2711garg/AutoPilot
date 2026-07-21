import type { GitHubClient, CreateDraftPRResult } from "../integrations/github";
import type { ApprovalsService } from "./approvals";
import type { StructuredPatch, HumanApprovalRecord, VerificationReport, ReproductionResult, IssueIngestionResult } from "@issue-to-pr/core";
import crypto from "node:crypto";

export interface CreateDraftPullRequestParams {
  repoOwner: string;
  repoName: string;
  runId: number;
  issue: IssueIngestionResult;
  reproduction: ReproductionResult;
  patch: StructuredPatch;
  verification: VerificationReport;
  approval: HumanApprovalRecord;
  baseBranch?: string;
  headBranch?: string;
}

export class PullRequestService {
  constructor(
    private githubClient: GitHubClient,
    private approvalsService: ApprovalsService
  ) {}

  async createDraftPR(params: CreateDraftPullRequestParams): Promise<CreateDraftPRResult> {
    if (params.approval.status !== "approved") {
      throw new Error("Cannot create Draft PR without valid human approval");
    }

    const idempotencyRaw = `run_${params.runId}_patch_${params.patch.patchDigest}`;
    const idempotencyKey = crypto.createHash("sha256").update(idempotencyRaw).digest("hex");

    const baseBranch = params.baseBranch ?? "main";
    const headBranch = params.headBranch ?? `issue-to-pr/fix-issue-${params.issue.issueNumber}`;

    const title = `[DIG-AI Fix] #${params.issue.issueNumber}: ${params.issue.title}`;
    const body = this.generatePRBody(params);

    return this.githubClient.createDraftPR({
      repoOwner: params.repoOwner,
      repoName: params.repoName,
      baseBranch,
      headBranch,
      title,
      body,
      idempotencyKey,
    });
  }

  private generatePRBody(params: CreateDraftPullRequestParams): string {
    return `## 🤖 DIG AI Automated Issue Resolution

Fixes #${params.issue.issueNumber}

### 🔍 Issue Summary & Localization
- **Issue Title**: ${params.issue.title}
- **Stack Trace Locations**: ${params.issue.stackTraceLocations?.length ?? 0} found

### 🧪 Reproduction Test
- **Test File**: \`${params.reproduction.proposedTest.testFilePath}\`
- **Reproduction Confidence**: \`${params.reproduction.confidence.toUpperCase()}\`
- **Pre-patch Symptom Match**: ${params.reproduction.symptomMatched ? "✅ Matched" : "❌ Unreproduced"}

### 🛠️ Patch Explanation & Verification
${params.patch.explanation}

- **Patch Digest**: \`${params.patch.patchDigest}\`
- **Post-patch Test Run**: ${params.verification.reproAfterPassed ? "✅ Passed" : "❌ Failed"}
- **Revert Check**: ${params.verification.revertCheckPassed ? "✅ Passed (Fails on original code)" : "❌ Failed"}

### 🛡️ Human Approval Gate
- **Approved By**: ${params.approval.reviewerIdentifier ?? "human_reviewer"}
- **Approved At**: ${params.approval.decidedAt ?? new Date().toISOString()}
- **Approved Patch Digest**: \`${params.approval.approvedPatchDigest}\`

---
*Generated automatically by DIG AI Issue-to-PR Engine (Draft PR).*
`;
  }
}
