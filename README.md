# Issue-to-PR Agent

An MCP-native agent that reads a GitHub bug report, **writes a failing test to prove the bug
exists**, patches the code, verifies the fix in a **network-off sandbox**, and opens a **draft
PR — only after a human approves**.

The signature idea: editing code is easy for an LLM; *proving the edit fixed the reported bug*
is the engineering problem. A failing-test-turned-passing is objective proof.

```
ISSUE → LOCALIZE → REPRODUCE → PATCH → VERIFY → APPROVE → PR
```

## The five rules we never break

1. **Persist before side effect** — write the state change to Postgres, then do the work.
2. **The model proposes, code disposes** — the LLM writes tests/patches; deterministic code
   moves states, runs sandboxes, parses results, applies edits, calls GitHub.
3. **No secrets in the sandbox** — the GitHub token and LLM key never enter a container.
4. **Every external write is idempotent** — an idempotency-key row goes in before the API call.
5. **Failures are typed, never free text** — every dead run lands in one taxonomy category.

## Layout (single Next.js app)

```
src/app/        # Next.js App Router — the ONLY routing surface (UI + API routes)
libs/           # the agent + shared code (framework-free; never imports React/Next)
  core/         #   state machine · failure taxonomy · confidence · budget · schemas
  db/           #   Drizzle schema + client + migrations
  orchestrator/ #   state-machine driver + job loop
  services/     #   ingest · localize · reproduce · patch · verify · approvals · PRs
  integrations/ #   github · llm · e2b sandbox
  mcp/ security/ api/
util/           # small helpers (junit parser, config loader)
scripts/        # long-running agent worker (plain node/tsx, not a route)
tests/          # cross-cutting engine tests
```

One package, one `node_modules`. Import aliases: `@libs/*`, `@util/*`, `@/*` (→ `src`).
An ESLint rule keeps `libs/` + `util/` framework-free so the engine stays portable.
TypeScript strict. Vitest. pnpm 10 / Node 22 LTS. The heavy agent loop runs as a
**worker** (`pnpm worker`), because a Next route would time out.

## Build status

Following a phased plan — do not start phase N+1 until phase N's exit criteria pass.

- **Phase 0 — Foundations** *(in progress)*: the database (the board) and the network-off
  sandbox (the locked room). No agent logic yet.
- Phase 1 — the verified loop, headless (CLI): ingest → localize → reproduce → patch → verify.
- Phase 2 — eval harness (SWE-bench subset, calibration, taxonomy).
- Phase 3 — human gate + idempotent draft PRs + MCP server.
- Phase 4 — dashboard (five thin screens over the event log).
- Phase 5 — testing, CI, production, demo hardening.

## Dev setup

```bash
pnpm install
pnpm test          # Vitest across libs/ util/ tests/
pnpm typecheck     # tsc --noEmit
pnpm dev           # Next.js dashboard on :3000
pnpm worker        # the agent worker (Phase 1)
```

Sandbox execution runs on **E2B** (cloud, network-off) and the database on **Neon**
(Postgres) — no local Docker required. Fill `.env` from `.env.example`.
