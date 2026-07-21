import path from "node:path";

/**
 * Path safety verification & confinement.
 */

const SENSITIVE_PATH_PATTERNS = [
  /^\.github\/workflows\//i,
  /^\.circleci\//i,
  /^\.travis\.yml$/i,
  /^\.env(\..*)?$/i,
  /^secrets\//i,
  /^credentials\//i,
  /Dockerfile$/i,
  /docker-compose.*\.yml$/i,
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /poetry\.lock$/i,
];

export class PathTraversalError extends Error {
  constructor(pathStr: string, reason: string) {
    super(`Path safety violation for '${pathStr}': ${reason}`);
    this.name = "PathTraversalError";
  }
}

/**
 * Validates that `targetPath` is relative, contained inside `repoRoot`, and has no `..` traversal.
 * Returns the normalized relative path inside `repoRoot`.
 */
export function validateAndNormalizePath(targetPath: string, repoRoot = "/"): string {
  if (!targetPath || typeof targetPath !== "string") {
    throw new PathTraversalError(targetPath, "Empty path");
  }

  const normalizedInput = targetPath.replace(/\\/g, "/");

  // Reject absolute paths
  if (path.isAbsolute(normalizedInput) || normalizedInput.startsWith("/")) {
    throw new PathTraversalError(targetPath, "Absolute paths are not allowed");
  }

  // Reject traversal components
  const parts = normalizedInput.split("/");
  if (parts.includes("..")) {
    throw new PathTraversalError(targetPath, "Path traversal ('..') is strictly forbidden");
  }

  // Ensure resolved path stays inside repoRoot
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedTarget = path.resolve(resolvedRoot, normalizedInput);

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new PathTraversalError(targetPath, "Path resolves outside repository root");
  }

  return path.relative(resolvedRoot, resolvedTarget).replace(/\\/g, "/");
}

/**
 * Checks if a relative file path is classified as sensitive / high-risk.
 */
export function isSensitivePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\.\//, "");
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}
