/**
 * Secret Redaction Utility.
 * Redacts sensitive credentials (tokens, keys, database passwords, auth headers)
 * before persisting traces, events, or sending log entries.
 */

export function redactSecrets(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    let sanitized = data;
    // Database URL password redaction
    sanitized = sanitized.replace(/postgres(ql)?:\/\/([^:]+):([^@]+)@/g, "postgres://$2:[REDACTED]@");
    sanitized = sanitized.replace(/ghp_[a-zA-Z0-9]{36,255}/g, "[REDACTED_GITHUB_TOKEN]");
    sanitized = sanitized.replace(/github_pat_[a-zA-Z0-9_]{30,255}/g, "[REDACTED_GITHUB_PAT]");
    sanitized = sanitized.replace(/sk-or-v1-[a-f0-9]{64}/g, "[REDACTED_OPENROUTER_KEY]");
    sanitized = sanitized.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED_TOKEN]");
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map(redactSecrets);
  }

  if (typeof data === "object") {
    const redactedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("authorization")
      ) {
        redactedObj[key] = "[REDACTED]";
      } else {
        redactedObj[key] = redactSecrets(val);
      }
    }
    return redactedObj;
  }

  return data;
}
