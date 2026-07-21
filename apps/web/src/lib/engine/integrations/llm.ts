import { assertBudget, type BudgetState } from "@issue-to-pr/core";
import type { Config } from "../config";
import { z } from "zod";

export type LLMRole = "cheap" | "strong";

export interface LLMRequestOptions<T extends z.ZodTypeAny> {
  role: LLMRole;
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  budgetState: BudgetState;
  estimatedCostUsd?: number;
  mockFallback?: z.infer<T>;
}

export interface LLMResponse<T> {
  data: T;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  model: string;
}

export class LLMClient {
  constructor(private config: Config) {}

  async generateStructured<T extends z.ZodTypeAny>(
    options: LLMRequestOptions<T>
  ): Promise<LLMResponse<z.infer<T>>> {
    const costEstimate = options.estimatedCostUsd ?? (options.role === "cheap" ? 0.005 : 0.05);
    assertBudget(options.budgetState, costEstimate);

    const modelName =
      options.role === "cheap" ? this.config.OPENROUTER_CHEAP_MODEL : this.config.OPENROUTER_STRONG_MODEL;

    if (!this.config.OPENROUTER_API_KEY && options.mockFallback) {
      options.budgetState.spentUsd += costEstimate;
      return {
        data: options.mockFallback,
        promptTokens: 150,
        completionTokens: 250,
        costUsd: costEstimate,
        model: `${modelName}-mock`,
      };
    }

    if (!this.config.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured and no mockFallback was provided.");
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/issue-to-pr",
        "X-Title": "DIG-AI Issue to PR Agent",
      },
      body: JSON.stringify({
        model: modelName,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: options.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errText}`);
    }

    const payload = (await response.json()) as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const contentText = payload.choices[0]?.message.content ?? "{}";
    const rawJson = JSON.parse(contentText);
    const parsedData = options.schema.parse(rawJson);

    options.budgetState.spentUsd += costEstimate;

    return {
      data: parsedData,
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      costUsd: costEstimate,
      model: modelName,
    };
  }
}
