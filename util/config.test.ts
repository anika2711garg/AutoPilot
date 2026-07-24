import { describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "./config";

const validEnv = (): Record<string, string | undefined> => ({
  DATABASE_URL_DIRECT: "postgresql://u:p@host.neon.tech/db?sslmode=require",
  DATABASE_URL_POOLED: "postgresql://u:p@host-pooler.neon.tech/db?sslmode=require",
  E2B_API_KEY: "e2b_test_key",
});

describe("loadConfig — happy path & defaults", () => {
  it("parses a minimal valid env and applies defaults", () => {
    const cfg = loadConfig(validEnv());
    expect(cfg.e2bApiKey).toBe("e2b_test_key");
    expect(cfg.budgetUsdPerRun).toBe(2);
    expect(cfg.maxAttempts).toBe(3);
    expect(cfg.wallClockSeconds).toBe(1800);
    expect(cfg.defaultMode).toBe("permissive");
    expect(cfg.githubWritesEnabled).toBe(true);
    expect(cfg.llmModelStrong).toContain("claude");
  });

  it("coerces numeric budgets from strings", () => {
    const cfg = loadConfig({ ...validEnv(), BUDGET_USD_PER_RUN: "2.50", MAX_ATTEMPTS: "5" });
    expect(cfg.budgetUsdPerRun).toBe(2.5);
    expect(cfg.maxAttempts).toBe(5);
  });

  it.each([
    ["true", true],
    ["1", true],
    ["yes", true],
    ["false", false],
    ["0", false],
    ["", false],
  ])("parses GITHUB_WRITES_ENABLED=%s → %s", (raw, expected) => {
    expect(loadConfig({ ...validEnv(), GITHUB_WRITES_ENABLED: raw }).githubWritesEnabled).toBe(
      expected,
    );
  });
});

describe("loadConfig — rejects bad input (fail loud at startup)", () => {
  it("throws ConfigError when E2B_API_KEY is missing", () => {
    const env = validEnv();
    delete env.E2B_API_KEY;
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it("throws ConfigError when a database URL is missing", () => {
    const env = validEnv();
    delete env.DATABASE_URL_DIRECT;
    expect(() => loadConfig(env)).toThrow(/DATABASE_URL_DIRECT|databaseUrlDirect/);
  });

  it("rejects a non-postgres database URL", () => {
    expect(() => loadConfig({ ...validEnv(), DATABASE_URL_DIRECT: "mysql://u:p@h/db" })).toThrow(
      ConfigError,
    );
  });

  it("rejects an unknown strictness mode", () => {
    expect(() => loadConfig({ ...validEnv(), DEFAULT_MODE: "yolo" })).toThrow(ConfigError);
  });

  it("rejects a non-positive budget", () => {
    expect(() => loadConfig({ ...validEnv(), BUDGET_USD_PER_RUN: "-1" })).toThrow(ConfigError);
  });

  it("rejects a non-integer attempt cap", () => {
    expect(() => loadConfig({ ...validEnv(), MAX_ATTEMPTS: "3.5" })).toThrow(ConfigError);
  });

  it("reports every problem at once", () => {
    try {
      loadConfig({ E2B_API_KEY: "", DATABASE_URL_DIRECT: "nope" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      const msg = (err as ConfigError).message;
      expect(msg).toMatch(/e2bApiKey/);
      expect(msg).toMatch(/databaseUrl/);
    }
  });
});
