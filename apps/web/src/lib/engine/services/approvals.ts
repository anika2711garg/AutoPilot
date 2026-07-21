import type { StructuredPatch, HumanApprovalRecord } from "@issue-to-pr/core";
import crypto from "node:crypto";

export interface ValidateApprovalParams {
  approvedPatchDigest: string;
  approvedReproductionDigest: string;
  currentPatch: StructuredPatch;
  currentReproTestCode: string;
  approvedBy: string;
}

export class ApprovalMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApprovalMismatchError";
  }
}

export class ApprovalsService {
  validateAndRecordApproval(params: ValidateApprovalParams): HumanApprovalRecord {
    // Verify patch digest matches current patch
    if (params.approvedPatchDigest !== params.currentPatch.patchDigest) {
      throw new ApprovalMismatchError(
        `Patch digest mismatch: approved digest (${params.approvedPatchDigest}) does not match current patch digest (${params.currentPatch.patchDigest})`
      );
    }

    // Verify reproduction digest matches current repro test code
    const currentReproDigest = crypto.createHash("sha256").update(params.currentReproTestCode).digest("hex");
    if (params.approvedReproductionDigest !== currentReproDigest) {
      throw new ApprovalMismatchError(
        `Reproduction digest mismatch: approved repro digest (${params.approvedReproductionDigest}) does not match current repro digest (${currentReproDigest})`
      );
    }

    return {
      runId: 1,
      status: "approved",
      reviewerIdentifier: params.approvedBy,
      decidedAt: new Date().toISOString(),
      approvedPatchDigest: params.approvedPatchDigest,
      approvedReproductionDigest: params.approvedReproductionDigest,
    };
  }
}
