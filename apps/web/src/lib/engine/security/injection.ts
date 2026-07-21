export interface PromptInjectionScreeningResult {
  detected: boolean;
  score: number;
  reason?: string;
  sanitizedText: string;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+above\s+instructions/i,
  /system\s+prompt\s+override/i,
  /you\s+are\s+now\s+DAN/i,
  /bypass\s+security\s+checks/i,
  /do\s+not\s+run\s+tests/i,
  /skip\s+verification/i,
  /secret_key/i,
  /send\s+token\s+to/i,
  /http:\/\/[^\s]+\/exfiltrate/i,
];

export function screenPromptInjection(text: string): PromptInjectionScreeningResult {
  let score = 0;
  const matchedReasons: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      score += 0.35;
      matchedReasons.push(`Matched suspicious pattern: ${pattern.source}`);
    }
  }

  const detected = score >= 0.5;

  let sanitizedText = text;
  if (detected) {
    sanitizedText = text.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "[REMOVED_SCRIPT]");
  }

  return {
    detected,
    score: Math.min(score, 1.0),
    reason: detected ? matchedReasons.join("; ") : undefined,
    sanitizedText,
  };
}
