import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id, 10);
  return NextResponse.json({
    id,
    repoId: 1,
    issueNumber: 42,
    state: "awaiting_human",
    mode: "strict",
    dollarBudgetUsd: 10,
    totalCostUsd: 0.12,
    repoOwner: "anika2711garg",
    repoName: "AutoPilot",
    patchDigest: "sha256_e2e_patch_digest",
    reproDigest: "sha256_repro_test_digest",
    createdAt: new Date().toISOString(),
  });
}
