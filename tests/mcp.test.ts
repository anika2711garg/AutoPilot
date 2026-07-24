import { describe, expect, it } from "vitest";
import { loadConfig } from "@util/config";
import { GitHubClient } from "@libs/integrations/github";
import { SandboxRunner } from "@libs/integrations/sandbox";
import { MCPServer } from "@libs/mcp/server";

describe("MCP Server Tools", () => {
  const config = loadConfig({
    DATABASE_URL_DIRECT: "postgresql://localhost:5432/db",
    DATABASE_URL_POOLED: "postgresql://localhost:5432/db",
    E2B_API_KEY: "e2b_test_key",
    GITHUB_WRITES_ENABLED: "true",
  });

  const githubClient = new GitHubClient(config);
  const sandboxRunner = new SandboxRunner();

  const mcpServer = new MCPServer(
    githubClient,
    sandboxRunner,
  );

  it("lists all required MCP tools", () => {
    const list = mcpServer.getToolList();
    const names = list.map((t) => t.name);

    expect(names).toContain("get_issue");
    expect(names).toContain("search_code");
    expect(names).toContain("read_file");
    expect(names).toContain("run_tests");
    expect(names).toContain("approve_run");
    expect(names).toContain("open_pull_request");
    expect(names).toContain("resolve_issue");
  });

  it("executes get_issue tool successfully", async () => {
    const res = (await mcpServer.callTool("get_issue", {
      owner: "owner",
      repo: "repo",
      issueNumber: 1,
    })) as { issueNumber: number; title: string };

    expect(res.issueNumber).toBe(1);
    expect(res.title).toContain("owner/repo #1");
  });

  it("executes approve_run tool successfully", async () => {
    const res = (await mcpServer.callTool("approve_run", {
      runId: 42,
      patchDigest: "sha_patch",
      reproDigest: "sha_repro",
      reviewer: "lead_dev",
    })) as { status: string; approvedPatchDigest: string };

    expect(res.status).toBe("approved");
    expect(res.approvedPatchDigest).toBe("sha_patch");
  });
});
