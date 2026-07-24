import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    tools: [
      { name: "get_issue", description: "Fetch GitHub issue payload" },
      { name: "search_code", description: "Search repository code content" },
      { name: "read_file", description: "Read repository file content" },
      { name: "run_tests", description: "Execute test suite in isolated sandbox" },
      { name: "approve_run", description: "Submit human approval" },
      { name: "open_pull_request", description: "Create draft PR" },
      { name: "resolve_issue", description: "Enqueue complete issue resolution run" },
    ],
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json({
      tool: body.tool,
      status: "success",
      result: { executed: true, params: body.params },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : String(err) } },
      { status: 400 }
    );
  }
}
