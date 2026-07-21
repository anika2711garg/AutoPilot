/**
 * Prompt injection screening for untrusted user inputs (issue titles, bodies, comments).
 *
 * Untrusted data is NEVER concatenated into system instructions.
 * Injection screening flags suspicious prompt overrides, system role manipulations,
 * or secret extraction attempts before invoking LLM capabilities.
 */

const SUSPICIOUS_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior\s+prompts/i,
  /you\s+are\s+now\s+a\s+system\s+administrator/i,
  /override\s+system\s+prompt/i,
  /print\s+(your\s+)?(system\s+prompt|instructions|env|secrets|api\s+key)/i,
  /expose\s+(github_token|openrouter_api_key|e2b_api_key|password)/i,
  /cat\s+\/etc\/passwd/i,
  /sudo\s+rm\s+-rf/i,
  /curl\s+-X\s+POST\s+http/i,
];

export interface InjectionCheckResult {
  detected: boolean;
  score: number; // 0.0 - 1.0
  reason?: string;
}

export function checkPromptInjection(text: string, threshold = 0.5): InjectionCheckResult {
  if (!text || text.trim().length === 0) {
    return { detected: false, score: 0.0 };
  }

  let matchedCount = 0;
  const matchedReasons: string[] = [];

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(text)) {
      matchedCount++;
      matchedReasons.push(pattern.source);
    }
  }

  const score = Math.min(1.0, matchedCount * 0.4);
  const detected = score >= threshold;

  return {
    detected,
    score,
    reason: detected ? `Matched injection patterns: ${matchedReasons.join(", ")}` : undefined,
  };
}
