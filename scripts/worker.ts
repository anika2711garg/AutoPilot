/**
 * The long-running agent worker.
 *
 * This is the engine's process entry point — it claims runs from Postgres
 * (FOR UPDATE SKIP LOCKED) and drives each through the state machine, minutes at
 * a time. It runs as a plain Node process (`pnpm worker`), NOT a Next.js route,
 * because routes time out. The Next app in `src/app` only views and triggers runs.
 *
 * Wired up in Phase 1.
 */

async function main(): Promise<void> {
  console.log("[worker] not implemented yet — Phase 1 will start the claim loop.");
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exitCode = 1;
});
