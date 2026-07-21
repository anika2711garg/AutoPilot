import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id, 10);
  return NextResponse.json({
    runId: id,
    status: "pending",
    requiredPatchDigest: "sha256_e2e_patch_digest",
    requiredReproDigest: "sha256_repro_test_digest",
  });
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = parseInt(params.id, 10);
    const body = await req.json();

    if (body.action === "reject") {
      return NextResponse.json({
        runId: id,
        status: "rejected",
        rejectedBy: body.approvedBy || "human_reviewer",
        rejectedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      runId: id,
      status: "approved",
      approvedBy: body.approvedBy || "human_reviewer",
      approvedAt: new Date().toISOString(),
      approvedPatchDigest: body.approvedPatchDigest || "sha256_e2e_patch_digest",
      approvedReproductionDigest: body.approvedReproductionDigest || "sha256_repro_test_digest",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : String(err) } },
      { status: 400 }
    );
  }
}
