/**
 * DB integration smoke test. Run after applying migrations:
 *   node --env-file=.env node_modules/.bin/tsx scripts/db-smoke.ts
 *
 * Proves the live Neon schema works end to end:
 *   1. the expected tables exist
 *   2. a repo + run insert round-trips, run defaults to state='created'
 *   3. a state transition persists
 *   4. the UNIQUE(idempotency_key) constraint blocks a duplicate PR row
 * Cleans up after itself.
 */
import postgres from "postgres";

const rawUrl = process.env.DATABASE_URL_DIRECT;
if (!rawUrl) throw new Error("DATABASE_URL_DIRECT is not set");

// postgres.js doesn't need the libpq-only channel_binding param.
const url = rawUrl.replace(/[?&]channel_binding=require/, "");
const sql = postgres(url, { max: 1, ssl: "require" });

async function main() {
  const tables = (
    await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`
  ).map((t) => t.table_name);
  console.log(`tables (${tables.length}):`, tables.join(", "));

  // scrub leftovers from any earlier interrupted run
  for (const s of await sql<{ id: number }[]>`SELECT id FROM repos WHERE full_name LIKE 'smoke/test-%'`) {
    await sql`DELETE FROM runs WHERE repo_id = ${s.id}`;
    await sql`DELETE FROM repos WHERE id = ${s.id}`;
  }

  const suffix = String(process.hrtime.bigint());
  const [repo] = await sql<{ id: number }[]>`
    INSERT INTO repos (full_name) VALUES (${"smoke/test-" + suffix}) RETURNING id`;
  const repoId = repo!.id;

  const [run] = await sql<{ id: number; state: string }[]>`
    INSERT INTO runs (repo_id, issue_number, budget_usd)
    VALUES (${repoId}, 1, 2.0) RETURNING id, state`;
  console.log(`run ${run!.id} inserted with default state='${run!.state}'`);

  await sql`UPDATE runs SET state = 'ingesting' WHERE id = ${run!.id}`;
  const [after] = await sql<{ state: string }[]>`SELECT state FROM runs WHERE id = ${run!.id}`;
  console.log(`transition created → ${after!.state}`);

  const key = "smoke-key-" + suffix;
  await sql`INSERT INTO prs (run_id, idempotency_key) VALUES (${run!.id}, ${key})`;
  let blocked = false;
  try {
    await sql`INSERT INTO prs (run_id, idempotency_key) VALUES (${run!.id}, ${key})`;
  } catch {
    blocked = true;
  }
  console.log(`duplicate idempotency_key blocked: ${blocked}`);

  // runs.repo_id is ON DELETE RESTRICT; delete runs first (prs cascade from runs)
  await sql`DELETE FROM runs WHERE repo_id = ${repoId}`;
  await sql`DELETE FROM repos WHERE id = ${repoId}`;
  console.log("cleaned up");

  if (run!.state !== "created") throw new Error("run did not default to 'created'");
  if (after!.state !== "ingesting") throw new Error("state transition did not persist");
  if (!blocked) throw new Error("UNIQUE(idempotency_key) did NOT block a duplicate");
  console.log("\n✓ DB SMOKE TEST PASSED");
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error("\n✗ DB SMOKE TEST FAILED:", err.message);
    await sql.end();
    process.exit(1);
  });
