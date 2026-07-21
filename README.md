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

## Monorepo layout (pnpm workspaces)

```
apps/
  web/      # Next.js dashboard (App Router) — deferred until the backend is solid
  engine/   # Node worker loop, stages, sandbox, Hono server (SSE + MCP)
packages/
  core/     # Zod contracts, state enum, failure taxonomy, budget logic — shared types
  db/       # Drizzle schema + migrations + query helpers
images/     # Dockerfiles for pre-baked repo images
```

Strict TypeScript everywhere (`tsconfig.base.json`). Vitest per package. pnpm 10 / Node 22 LTS.

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
pnpm test                   # runs every package's Vitest suite
pnpm typecheck
```

Docker (Docker Desktop or colima) is required from the sandbox module onward.
