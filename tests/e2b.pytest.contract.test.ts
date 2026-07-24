import { E2BSandbox, PYTEST_TEMPLATE } from "@libs/integrations/e2b";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * The Phase-0 exit proof: a real Python test suite runs in the sandbox on the
 * pre-baked pytest template, fully NETWORK-OFF, and produces a structured
 * TestReport — red when the code is buggy, green when it's fixed. This is the
 * foundation the reproducer and verifier stand on.
 *
 * Live E2B calls → auto-skips without E2B_API_KEY. Requires the template built
 * once via `scripts/build-template.ts`.
 */
const hasKey = Boolean(process.env.E2B_API_KEY);

const TEST = "from calc import add\n\n\ndef test_add():\n    assert add(2, 3) == 5\n";
const BUGGY = "def add(a, b):\n    return a + b - 1\n";
const FIXED = "def add(a, b):\n    return a + b\n";

describe.skipIf(!hasKey)("E2B pytest template — runTests (live, network-off)", () => {
  let sandbox: E2BSandbox;
  beforeAll(() => {
    sandbox = new E2BSandbox();
  });

  it("RED: buggy code produces a failing TestReport (reproduction)", async () => {
    const r = await sandbox.run({
      template: PYTEST_TEMPLATE,
      networkEnabled: false,
      files: { "calc.py": BUGGY, "test_calc.py": TEST },
      command: "pytest -q",
    });
    expect(r.timedOut).toBe(false);
    expect(r.report).toBeDefined();
    expect(r.report!.tests).toBe(1);
    expect(r.report!.failures).toBe(1);
    const f = r.report!.cases[0]!;
    expect(f.status).toBe("failed");
    expect(`${f.message ?? ""} ${f.details ?? ""}`).toMatch(/assert/i);
  }, 90_000);

  it("GREEN: fixed code produces a passing TestReport (verification)", async () => {
    const r = await sandbox.run({
      template: PYTEST_TEMPLATE,
      networkEnabled: false,
      files: { "calc.py": FIXED, "test_calc.py": TEST },
      command: "pytest -q",
    });
    expect(r.exitCode).toBe(0);
    expect(r.report).toBeDefined();
    expect(r.report!.tests).toBe(1);
    expect(r.report!.passed).toBe(1);
    expect(r.report!.failures).toBe(0);
  }, 90_000);
});
