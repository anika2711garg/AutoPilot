import type { Config } from "../config";

export interface GitHubIssuePayload {
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  user?: { login: string };
  labels?: Array<{ name: string }>;
}

export interface GitHubCommentPayload {
  id: number;
  body: string;
  user?: { login: string };
  created_at: string;
}

export interface CreateDraftPRParams {
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  title: string;
  body: string;
  headBranch: string;
  baseBranch: string;
  idempotencyKey: string;
}

export interface CreateDraftPRResult {
  prNumber: number;
  prId: string;
  url: string;
  headBranch: string;
  baseBranch: string;
}

export class GitHubKillSwitchError extends Error {
  constructor() {
    super("GitHub write operations are currently disabled by the kill switch (GITHUB_WRITES_ENABLED=false)");
    this.name = "GitHubKillSwitchError";
  }
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubClient {
  private prCache = new Map<string, CreateDraftPRResult>();

  constructor(private config: Config) {}

  /** Asserts kill switch permits external writes. */
  private assertWritesEnabled(): void {
    if (!this.config.githubWritesEnabled) {
      throw new GitHubKillSwitchError();
    }
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "DIG-AI-IssueToPRAgent/1.0",
    };
    if (this.config.githubToken) {
      headers["Authorization"] = `token ${this.config.githubToken}`;
    }
    return headers;
  }

  async fetchIssue(owner: string, repo: string, issueNumber: number): Promise<GitHubIssuePayload> {
    if (!this.config.githubToken) {
      // Mock / fallback if no token provided in dev mode
      return {
        number: issueNumber,
        title: `Bug in ${owner}/${repo} #${issueNumber}`,
        body: `Reported issue #${issueNumber} in ${owner}/${repo}`,
        state: "open",
        html_url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
        user: { login: "reporter" },
        labels: [{ name: "bug" }],
      };
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      throw new GitHubApiError(`Failed to fetch issue: ${res.statusText}`, res.status);
    }
    return (await res.json()) as GitHubIssuePayload;
  }

  async fetchComments(owner: string, repo: string, issueNumber: number): Promise<GitHubCommentPayload[]> {
    if (!this.config.githubToken) {
      return [];
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      return [];
    }
    return (await res.json()) as GitHubCommentPayload[];
  }

  async createDraftPR(params: CreateDraftPRParams): Promise<CreateDraftPRResult> {
    this.assertWritesEnabled();

    if (this.prCache.has(params.idempotencyKey)) {
      return this.prCache.get(params.idempotencyKey)!;
    }

    let result: CreateDraftPRResult;

    if (!this.config.githubToken) {
      // Mock PR creation for local testing/fixtures without GitHub token
      const mockPrNumber = Math.floor(100 + Math.random() * 900);
      result = {
        prNumber: mockPrNumber,
        prId: `PR_${mockPrNumber}`,
        url: `https://github.com/${params.repoOwner}/${params.repoName}/pull/${mockPrNumber}`,
        headBranch: params.headBranch,
        baseBranch: params.baseBranch,
      };
    } else {
      const url = `https://api.github.com/repos/${params.repoOwner}/${params.repoName}/pulls`;
      const bodyPayload = {
        title: params.title,
        body: params.body,
        head: params.headBranch,
        base: params.baseBranch,
        draft: true,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new GitHubApiError(`Failed to create draft PR: ${errorText}`, res.status);
      }

      const data = (await res.json()) as { number: number; id: number; html_url: string };
      result = {
        prNumber: data.number,
        prId: String(data.id),
        url: data.html_url,
        headBranch: params.headBranch,
        baseBranch: params.baseBranch,
      };
    }

    this.prCache.set(params.idempotencyKey, result);
    return result;
  }
}
