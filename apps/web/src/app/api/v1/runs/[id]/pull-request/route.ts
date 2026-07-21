import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const id = parseInt(params.id, 10);

    return NextResponse.json(
      {
        id: 1,
        runId: id,
        idempotencyKey: `run_${id}_pr_key`,
        status: "draft",
        externalPrNumber: 101,
        url: "https://github.com/anika2711garg/AutoPilot/pull/101",
        headBranch: "issue-to-pr/fix-issue-42",
        baseBranch: "main",
        createdAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : String(err) } },
      { status: 400 }
    );
  }
}
