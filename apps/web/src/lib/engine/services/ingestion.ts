import type { GitHubClient } from "../integrations/github";
import type { LLMClient } from "../integrations/llm";
import type { Config } from "../config";
import { screenPromptInjection } from "../security/injection";
import { IssueIngestionResultSchema, type IssueIngestionResult, type StackTraceLocation, type BudgetState } from "@issue-to-pr/core";
import { z } from "zod";

export interface IngestIssueParams {
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  budgetState: BudgetState;
}

export class IngestionService {
  constructor(
    private config: Config,
    private githubClient: GitHubClient,
    private llmClient: LLMClient
  ) {}

  async ingestIssue(params: IngestIssueParams): Promise<IssueIngestionResult> {
    const issue = await this.githubClient.fetchIssue(params.repoOwner, params.repoName, params.issueNumber);
    const comments = await this.githubClient.fetchComments(params.repoOwner, params.repoName, params.issueNumber);

    const fullIssueText = `${issue.title}\n\n${issue.body}\n\nComments:\n` + comments.map((c) => c.body).join("\n---\n");

    const injectionCheck = screenPromptInjection(fullIssueText);

    const stackTraceLocations: StackTraceLocation[] = [];
    const stackTraceRegex = /(?:File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+([^\s]+))?|([a-zA-Z0-9_\-\.\/]+\.py):(\d+))/g;
    let match: RegExpExecArray | null;

    while ((match = stackTraceRegex.exec(fullIssueText)) !== null) {
      const file = match[1] || match[4];
      const lineStr = match[2] || match[5];
      const fn = match[3];

      if (file) {
        stackTraceLocations.push({
          file,
          line: lineStr ? parseInt(lineStr, 10) : undefined,
          functionName: fn,
        });
      }
    }

    const llmRes = await this.llmClient.generateStructured({
      role: "cheap",
      systemPrompt: "You are an expert software engineer. Analyze the GitHub issue and extract stack trace locations and problem summaries.",
      userPrompt: `Issue #${issue.number}: ${issue.title}\n\nBody:\n${issue.body}`,
      schema: z.object({
        problemSummary: z.string(),
        stackTraceLocations: z.array(
          z.object({
            file: z.string(),
            line: z.number().optional(),
            functionName: z.string().optional(),
            snippet: z.string().optional(),
          })
        ).optional(),
      }),
      budgetState: params.budgetState,
      mockFallback: {
        problemSummary: `Extracted issue analysis for ${issue.title}`,
        stackTraceLocations: stackTraceLocations,
      },
    });

    return IssueIngestionResultSchema.parse({
      issueNumber: issue.number,
      title: issue.title,
      body: issue.body,
      labels: issue.labels?.map((l) => l.name) ?? [],
      comments: comments.map((c) => ({ author: c.user?.login ?? "anonymous", body: c.body, createdAt: c.created_at })),
      stackTraceLocations: stackTraceLocations.length > 0 ? stackTraceLocations : (llmRes.data.stackTraceLocations ?? []),
      injectionDetected: injectionCheck.detected,
      injectionScore: injectionCheck.score,
      injectionReason: injectionCheck.reason,
    });
  }
}
