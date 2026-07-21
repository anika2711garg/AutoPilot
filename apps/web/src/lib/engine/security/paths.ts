import path from "node:path";

export interface PathValidationResult {
  valid: boolean;
  normalizedRelativePath: string;
  isHighRiskSensitivePath: boolean;
  reason?: string;
}

const SENSITIVE_PATTERNS = [
  /\.github\/workflows\//i,
  /\.github\/actions\//i,
  /\.env(\.|$)/i,
  /secrets/i,
  /id_rsa/i,
  /\.pem$/i,
  /credentials/i,
  /ci\/.*config/i,
];

export function validateAndNormalizePath(repoRoot: string, targetPath: string): PathValidationResult {
  if (path.isAbsolute(targetPath)) {
    return {
      valid: false,
      normalizedRelativePath: targetPath,
      isHighRiskSensitivePath: false,
      reason: "Absolute paths are strictly forbidden",
    };
  }

  const normalized = path.normalize(targetPath).replace(/\\/g, "/");

  if (normalized.startsWith("../") || normalized === ".." || normalized.includes("/../")) {
    return {
      valid: false,
      normalizedRelativePath: normalized,
      isHighRiskSensitivePath: false,
      reason: "Directory traversal (..) outside repository root is strictly forbidden",
    };
  }

  const resolvedAbs = path.resolve(repoRoot, normalized);
  const resolvedRepoRoot = path.resolve(repoRoot);

  if (!resolvedAbs.startsWith(resolvedRepoRoot)) {
    return {
      valid: false,
      normalizedRelativePath: normalized,
      isHighRiskSensitivePath: false,
      reason: "Path escapes repository root boundaries",
    };
  }

  const isHighRiskSensitivePath = SENSITIVE_PATTERNS.some((pattern) => pattern.test(normalized));

  return {
    valid: true,
    normalizedRelativePath: normalized,
    isHighRiskSensitivePath,
  };
}
