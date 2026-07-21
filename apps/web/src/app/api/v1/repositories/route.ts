import { NextResponse } from "next/server";

const mockRepos = [
  {
    id: 1,
    repoOwner: "anika2711garg",
    repoName: "AutoPilot",
    cloneUrl: "https://github.com/anika2711garg/AutoPilot.git",
    defaultBranch: "main",
    language: "python",
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  return NextResponse.json({ repositories: mockRepos });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newRepo = {
      id: mockRepos.length + 1,
      repoOwner: body.repoOwner || "owner",
      repoName: body.repoName || "repo",
      cloneUrl: body.cloneUrl || "https://github.com/owner/repo.git",
      defaultBranch: body.defaultBranch || "main",
      language: body.language || "python",
      createdAt: new Date().toISOString(),
    };
    mockRepos.push(newRepo);
    return NextResponse.json(newRepo, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: err instanceof Error ? err.message : String(err) } },
      { status: 400 }
    );
  }
}
