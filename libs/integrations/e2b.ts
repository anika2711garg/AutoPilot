import { parseJUnitXml, type TestReport } from "@util/junit";
import { CommandExitError, Sandbox, TimeoutError } from "e2b";

/**
 * The network-off sandbox — the "locked room".
 *
 * Each {@link E2BSandbox.run} creates a fresh, ephemeral E2B sandbox, executes
 * ONE command with egress disabled by default, reads back a JUnit report if one
 * was produced, and tears the sandbox down. No state leaks between runs, no
 * secrets inside, host-enforced timeout. Model-written code runs here and only
 * here (Rule #3: no secrets in the sandbox).
 */
export interface SandboxRunOptions {
  /** Shell command to execute with cwd = workDir. */
  command: string;
  /** Files to materialize before running: path → contents. Relative paths sit under workDir. */
  files?: Record<string, string>;
  /** Working directory inside the sandbox. Default: /home/user/work. */
  workDir?: string;
  /** Per-command wall-clock timeout in ms. Default: 60_000. */
  timeoutMs?: number;
  /** Allow outbound network. Default: false (network-off — the safe default). */
  networkEnabled?: boolean;
  /** Extra env for the command. Known secrets are stripped defensively regardless. */
  env?: Record<string, string>;
  /** E2B template (pre-baked image). Default: the base template. */
  template?: string;
}

export interface SandboxRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  /** True if the command exceeded timeoutMs. */
  timedOut: boolean;
  /** Parsed JUnit report if the run wrote <workDir>/.junit.xml. */
  report?: TestReport;
}

/** Secrets that must never enter a sandbox, even if a caller passes them in `env`. */
const FORBIDDEN_ENV = [
  "E2B_API_KEY",
  "GITHUB_TOKEN",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "DATABASE_URL_DIRECT",
  "DATABASE_URL_POOLED",
];

/** Cached base template (python:3.11 + pytest), built via scripts/build-template.ts. */
export const PYTEST_TEMPLATE = "issue-to-pr-pytest";

const DEFAULT_WORKDIR = "/home/user/work";
const JUNIT_FILENAME = ".junit.xml";
/** Conventional exit code for a process killed by timeout. */
const TIMEOUT_EXIT_CODE = 124;

export class E2BSandbox {
  private readonly apiKey: string;

  constructor(apiKey: string = process.env.E2B_API_KEY ?? "") {
    if (!apiKey) throw new Error("E2B_API_KEY is required to create a sandbox");
    this.apiKey = apiKey;
  }

  async run(options: SandboxRunOptions): Promise<SandboxRunResult> {
    const workDir = options.workDir ?? DEFAULT_WORKDIR;
    const timeoutMs = options.timeoutMs ?? 60_000;
    const started = Date.now();

    const env: Record<string, string> = { ...(options.env ?? {}) };
    for (const key of FORBIDDEN_ENV) delete env[key];

    const sandbox = await Sandbox.create({
      apiKey: this.apiKey,
      ...(options.template ? { template: options.template } : {}),
      allowInternetAccess: options.networkEnabled ?? false,
      // Keep the sandbox alive a little longer than the command so teardown is clean.
      timeoutMs: timeoutMs + 30_000,
    });

    try {
      await sandbox.commands.run(`mkdir -p ${workDir}`);

      for (const [rel, contents] of Object.entries(options.files ?? {})) {
        const dest = rel.startsWith("/") ? rel : `${workDir}/${rel}`;
        await sandbox.files.write(dest, contents);
      }

      let command = options.command;
      const junitPath = `${workDir}/${JUNIT_FILENAME}`;
      if (command.includes("pytest") && !command.includes("--junitxml")) {
        command = `${command} --junitxml=${junitPath}`;
      }

      let exitCode = 0;
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      try {
        const result = await sandbox.commands.run(command, {
          cwd: workDir,
          envs: env,
          timeoutMs,
        });
        exitCode = result.exitCode;
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (err) {
        if (err instanceof CommandExitError) {
          // A non-zero exit is normal (e.g. pytest failures) — capture, don't throw.
          exitCode = err.exitCode;
          stdout = err.stdout;
          stderr = err.stderr;
        } else if (err instanceof TimeoutError) {
          timedOut = true;
          exitCode = TIMEOUT_EXIT_CODE;
          stderr = err.message;
        } else {
          throw err;
        }
      }

      const report = await this.tryReadJUnit(sandbox, junitPath);
      return { exitCode, stdout, stderr, durationMs: Date.now() - started, timedOut, report };
    } finally {
      // Best-effort teardown — a transient error here must not crash the run;
      // the sandbox also auto-expires via its own timeoutMs.
      await sandbox.kill().catch(() => undefined);
    }
  }

  private async tryReadJUnit(sandbox: Sandbox, path: string): Promise<TestReport | undefined> {
    try {
      const raw = await sandbox.files.read(path);
      const xml = typeof raw === "string" ? raw : new TextDecoder().decode(raw as Uint8Array);
      return parseJUnitXml(xml);
    } catch {
      return undefined; // no report produced
    }
  }
}
