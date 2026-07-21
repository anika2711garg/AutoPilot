export function redactSecrets(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return data
      .replace(/ghp_[a-zA-Z0-9]{36,255}/g, "[REDACTED_GITHUB_PAT]")
      .replace(/github_pat_[a-zA-Z0-9_]{30,255}/g, "[REDACTED_GITHUB_PAT]")
      .replace(/sk-or-v1-[a-f0-9]{64}/g, "[REDACTED_OPENROUTER_KEY]")
      .replace(/sk-[a-zA-Z0-9]{32,255}/g, "[REDACTED_API_KEY]")
      .replace(/postgres(ql)?:\/\/[^:]+:([^@]+)@/g, "postgres://user:[REDACTED_DB_PASSWORD]@")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]");
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item));
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("authorization")
      ) {
        redacted[key] = "[REDACTED_SECRET]";
      } else {
        redacted[key] = redactSecrets(value);
      }
    }
    return redacted;
  }

  return data;
}
