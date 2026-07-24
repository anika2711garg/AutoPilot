import { NextResponse } from "next/server";

const mockRuns: any[] = [
  {
    id: 1,
    repoId: 1,
    issueNumber: 42,
    state: "awaiting_human",
    mode: "strict",
    dollarBudgetUsd: 10,
    totalCostUsd: 0.12,
    repoOwner: "anika2711garg",
    repoName: "AutoPilot",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ runs: mockRuns });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newRun = {
      id: mockRuns.length + 1,
      repoId: body.repoId ?? 1,
      issueNumber: body.issueNumber ?? 42,
      state: "created",
      mode: body.mode ?? "strict",
      dollarBudgetUsd: body.dollarBudgetUsd ?? 10,
      totalCostUsd: 0,
      repoOwner: body.repoOwner ?? "anika2711garg",
      repoName: body.repoName ?? "AutoPilot",
      createdAt: new Date().toISOString(),
    };
    mockRuns.push(newRun);
    return NextResponse.json(newRun, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : String(err) } },
      { status: 400 }
    );
  }
}
