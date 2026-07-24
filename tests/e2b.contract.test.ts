import { E2BSandbox } from "@libs/integrations/e2b";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Contract tests for the real E2B sandbox. These make live cloud calls (each
 * spins up + tears down a sandbox), so they auto-SKIP unless E2B_API_KEY is set.
 * Run them with the env loaded:  set -a; source .env; set +a; pnpm test:e2b
 */
const hasKey = Boolean(process.env.E2B_API_KEY);

describe.skipIf(!hasKey)("E2B sandbox — contract (live)", () => {
  // Lazily constructed so collection (which runs even for skipped blocks) never
  // touches the E2B key when there isn't one.
  let sandbox: E2BSandbox;
  beforeAll(() => {
    sandbox = new E2BSandbox();
  });

  it("runs a command and returns stdout + exit 0", async () => {
    const r = await sandbox.run({ command: "echo hello-sandbox" });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("hello-sandbox");
    expect(r.timedOut).toBe(false);
  }, 60_000);

  it("blocks network egress by default (network-off)", async () => {
    const r = await sandbox.run({ command: "curl -sS -m 8 https://example.com -o /dev/null" });
    expect(r.exitCode).not.toBe(0); // egress blocked → curl fails
  }, 60_000);

  it("allows egress only when explicitly enabled (control for the test above)", async () => {
    const r = await sandbox.run({
      command: "curl -sS -m 15 https://example.com -o /dev/null",
      networkEnabled: true,
    });
    expect(r.exitCode).toBe(0);
  }, 60_000);

  it("enforces the command timeout", async () => {
    const r = await sandbox.run({ command: "sleep 30", timeoutMs: 5_000 });
    expect(r.timedOut).toBe(true);
  }, 60_000);

  it("is ephemeral — no state leaks between runs", async () => {
    await sandbox.run({ command: "echo marker > /tmp/leak.txt" });
    const r = await sandbox.run({ command: "cat /tmp/leak.txt" });
    expect(r.exitCode).not.toBe(0); // fresh sandbox: the file is gone
  }, 90_000);

  it("writes files and reads back a parsed JUnit report", async () => {
    const xml =
      '<testsuite tests="2" failures="1">' +
      '<testcase classname="c" name="ok" time="0.1"/>' +
      '<testcase classname="c" name="bad" time="0.2">' +
      '<failure message="boom" type="AssertionError">E   boom</failure></testcase>' +
      "</testsuite>";
    const r = await sandbox.run({
      files: { "given.xml": xml },
      command: "cp given.xml .junit.xml",
    });
    expect(r.exitCode).toBe(0);
    expect(r.report?.tests).toBe(2);
    expect(r.report?.failures).toBe(1);
  }, 60_000);

  it("strips secrets from the sandbox environment", async () => {
    const r = await sandbox.run({
      command: "printenv GITHUB_TOKEN || echo ABSENT",
      env: { GITHUB_TOKEN: "should-not-be-here" },
    });
    expect(r.stdout).toContain("ABSENT");
    expect(r.stdout).not.toContain("should-not-be-here");
  }, 60_000);
});
