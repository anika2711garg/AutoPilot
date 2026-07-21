import type { ApprovalRecord } from "@issue-to-pr/core";

export class ApprovalsService {
  /**
   * Validates if a proposed human approval matches current artifact digests.
   */
  validateApprovalDigest(
    approval: ApprovalRecord,
    currentPatchDigest: string,
    currentReproDigest: string,
  ): boolean {
    if (approval.status !== "approved") {
      return false;
    }
    return (
      approval.approvedPatchDigest === currentPatchDigest &&
      approval.approvedReproductionDigest === currentReproDigest
    );
  }
}
