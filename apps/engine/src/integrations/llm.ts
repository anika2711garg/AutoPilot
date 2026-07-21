import { assertBudget, type BudgetState } from "@issue-to-pr/core";
import type { Config } from "../config";
import { z } from "zod";

export type LLMRole = "cheap" | "strong";

export interface LLMCallParams<T> {
  role: LLMRole;
  stage: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  budget: BudgetState;
  estimatedCostUsd?: number;
}

export interface LLMCallResult<T> {
  data: T;
  rawText: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
}

export class LLMStructuredOutputError extends Error {
  constructor(message: string, public rawOutput: string) {
    super(message);
    this.name = "LLMStructuredOutputError";
  }
}

export class LLMClient {
  constructor(private config: Config) {}

  getModelForRole(role: LLMRole): string {
    return role === "strong" ? this.config.llmModelStrong : this.config.llmModelCheap;
  }

  async call<T>(params: LLMCallParams<T>): Promise<LLMCallResult<T>> {
    // Check hard budget ceiling before making the call
    assertBudget(params.budget, params.estimatedCostUsd ?? 0.005);

    const model = this.getModelForRole(params.role);
    const startTime = Date.now();

    // If no API key is provided, use deterministic mock response generation
    if (!this.config.openrouterApiKey) {
      return this.generateMockResponse(params, model, startTime);
    }

    const payload = {
      model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API call failed (${response.status}): ${errText}`);
    }

    const resJson = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const rawText = resJson.choices?.[0]?.message?.content ?? "";
    const tokensIn = resJson.usage?.prompt_tokens ?? 100;
    const tokensOut = resJson.usage?.completion_tokens ?? 50;

    // Approximate OpenRouter pricing
    const costUsd = (tokensIn * 0.000003) + (tokensOut * 0.000015);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new LLMStructuredOutputError("Response was not valid JSON", rawText);
    }

    const parsed = params.schema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new LLMStructuredOutputError(
        `Response failed schema validation: ${parsed.error.message}`,
        rawText,
      );
    }

    return {
      data: parsed.data,
      rawText,
      model,
      tokensIn,
      tokensOut,
      costUsd,
      latencyMs,
    };
  }

  private generateMockResponse<T>(
    params: LLMCallParams<T>,
    model: string,
    startTime: number,
  ): LLMCallResult<T> {
    const latencyMs = Date.now() - startTime;
    const mockData = this.buildMockDataForStage(params.stage);
    const parsed = params.schema.safeParse(mockData);

    if (!parsed.success) {
      throw new Error(`Mock data generation failed schema validation: ${parsed.error.message}`);
    }

    return {
      data: parsed.data,
      rawText: JSON.stringify(mockData),
      model: `${model}-mock`,
      tokensIn: 150,
      tokensOut: 75,
      costUsd: 0.001,
      latencyMs,
    };
  }

  private buildMockDataForStage(stage: string): Record<string, unknown> {
    switch (stage) {
      case "ingesting":
        return {
          repositoryFullName: "owner/repo",
          issueNumber: 1,
          title: "Mock issue title",
          body: "Mock issue body detailing Python bug",
          labels: ["bug"],
          comments: [],
          stackTraceLocations: [{ file: "calculator.py", line: 10, functionName: "add" }],
          expectedBehavior: "Return 5",
          actualBehavior: "Returns 4",
          injectionDetected: false,
          injectionScore: 0,
        };
      case "localizing":
        return {
          candidateFiles: ["calculator.py"],
          candidates: [{ filePath: "calculator.py", symbolName: "add", confidence: 0.95, reasoning: "Stack trace points to add()" }],
          evidence: "Function add() returns wrong result",
          overallConfidence: 0.95,
          queriesPerformed: ["def add"],
          filesExamined: ["calculator.py"],
        };
      case "reproducing":
        return {
          testFilePath: "tests/test_calculator.py",
          testCode: "def test_add_bug():\n    from calculator import add\n    assert add(2, 3) == 5\n",
          description: "Reproduction test verifying 2 + 3 == 5",
          expectedSymptom: "AssertionError: assert 4 == 5",
        };
      case "patching":
        return {
          explanation: "Fix addition calculation logic in add()",
          edits: [
            {
              filePath: "calculator.py",
              targetContent: "return a + b - 1",
              replacementContent: "return a + b",
            },
          ],
          patchDigest: "sha256_mock_patch_digest",
          canonicalDiff: "--- a/calculator.py\n+++ b/calculator.py\n@@ -10,1 +10,1 @@\n-    return a + b - 1\n+    return a + b\n",
          changedFiles: ["calculator.py"],
          sensitiveFiles: [],
          isHighRisk: false,
        };
      default:
        return {};
    }
  }
}
