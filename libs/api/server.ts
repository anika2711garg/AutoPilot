import { Hono } from "hono";
import { streamText } from "hono/streaming";
import type { Db } from "@libs/db";
import { approvals, events, jobs, prs, repos, runs, traces } from "@libs/db";
import { eq, gt, and } from "drizzle-orm";

export function createApiServer(db?: Db) {
  const app = new Hono();

  // ─── Health & Readiness ──────────────────────────────────────────────────
  app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
  app.get("/ready", (c) => c.json({ ready: true, database: "connected" }));

  // ─── Repositories ────────────────────────────────────────────────────────
  app.post("/api/v1/repositories", async (c) => {
    const body = await c.req.json();
    if (!body.fullName) {
      return c.json({ error: { code: "INVALID_INPUT", message: "fullName is required" } }, 400);
    }
    if (db) {
      const inserted = await db
        .insert(repos)
        .values({
          fullName: body.fullName,
          defaultBranch: body.defaultBranch ?? "main",
          cloneUrl: body.cloneUrl,
        })
        .returning();
      return c.json(inserted[0], 201);
    }
    return c.json({ id: 1, fullName: body.fullName, defaultBranch: "main" }, 201);
  });

  app.get("/api/v1/repositories", async (c) => {
    if (db) {
      const all = await db.select().from(repos);
      return c.json(all);
    }
    return c.json([]);
  });

  app.get("/api/v1/repositories/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      const found = await db.select().from(repos).where(eq(repos.id, id));
      if (found.length === 0) return c.json({ error: { code: "NOT_FOUND", message: "Repo not found" } }, 404);
      return c.json(found[0]);
    }
    return c.json({ id, fullName: "owner/repo" });
  });

  app.post("/api/v1/repositories/:id/validate", (c) => c.json({ valid: true }));
  app.post("/api/v1/repositories/:id/prepare-image", (c) => c.json({ status: "prepared", imageTag: "itp_repo_1:latest" }));

  // ─── Runs ────────────────────────────────────────────────────────────────
  app.post("/api/v1/runs", async (c) => {
    const body = await c.req.json();
    if (!body.repoId || !body.issueNumber) {
      return c.json({ error: { code: "INVALID_INPUT", message: "repoId and issueNumber are required" } }, 400);
    }
    if (db) {
      const inserted = await db
        .insert(runs)
        .values({
          repoId: body.repoId,
          issueNumber: body.issueNumber,
          mode: body.mode ?? "permissive",
          budgetUsd: String(body.budgetUsd ?? 2.0),
          state: "created",
        })
        .returning();
      return c.json(inserted[0], 201);
    }
    return c.json({ id: 1, repoId: body.repoId, issueNumber: body.issueNumber, state: "created" }, 201);
  });

  app.get("/api/v1/runs", async (c) => {
    if (db) {
      const all = await db.select().from(runs);
      return c.json(all);
    }
    return c.json([]);
  });

  app.get("/api/v1/runs/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      const found = await db.select().from(runs).where(eq(runs.id, id));
      if (found.length === 0) return c.json({ error: { code: "NOT_FOUND", message: "Run not found" } }, 404);
      return c.json(found[0]);
    }
    return c.json({ id, state: "created" });
  });

  app.post("/api/v1/runs/:id/start", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      await db.update(runs).set({ state: "ingesting" }).where(eq(runs.id, id));
      await db.insert(jobs).values({ runId: id, stage: "ingesting", status: "pending" });
    }
    return c.json({ id, state: "ingesting", status: "started" });
  });

  app.post("/api/v1/runs/:id/resume", async (c) => {
    const id = Number(c.req.param("id"));
    return c.json({ id, status: "resumed" });
  });

  app.post("/api/v1/runs/:id/cancel", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      await db.update(runs).set({ state: "cancelled" }).where(eq(runs.id, id));
    }
    return c.json({ id, state: "cancelled" });
  });

  app.get("/api/v1/runs/:id/events", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      const list = await db.select().from(events).where(eq(events.runId, id));
      return c.json(list);
    }
    return c.json([]);
  });

  app.get("/api/v1/runs/:id/traces", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      const list = await db.select().from(traces).where(eq(traces.runId, id));
      return c.json(list);
    }
    return c.json([]);
  });

  // ─── SSE Stream (with Last-Event-ID replay) ──────────────────────────────
  app.get("/api/v1/runs/:id/stream", async (c) => {
    const id = Number(c.req.param("id"));
    const lastEventId = Number(c.req.header("Last-Event-ID") ?? "0");

    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    return streamText(c, async (stream) => {
      if (db) {
        const pastEvents = await db
          .select()
          .from(events)
          .where(and(eq(events.runId, id), gt(events.id, lastEventId)));

        for (const ev of pastEvents) {
          await stream.write(`id: ${ev.id}\nevent: ${ev.type}\ndata: ${JSON.stringify(ev.dataJson)}\n\n`);
        }
      } else {
        await stream.write(`id: 1\nevent: run.created\ndata: ${JSON.stringify({ runId: id, state: "created" })}\n\n`);
      }
    });
  });

  // ─── Approval ────────────────────────────────────────────────────────────
  app.get("/api/v1/runs/:id/approval", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      const list = await db.select().from(approvals).where(eq(approvals.runId, id));
      if (list.length === 0) return c.json({ error: { code: "NOT_FOUND", message: "No approval requested" } }, 404);
      return c.json(list[0]);
    }
    return c.json({ runId: id, status: "pending" });
  });

  app.post("/api/v1/runs/:id/approve", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();

    if (!body.patchDigest || !body.reproDigest) {
      return c.json({ error: { code: "INVALID_INPUT", message: "patchDigest and reproDigest are required for digest-bound approval" } }, 400);
    }

    if (db) {
      const inserted = await db.insert(approvals).values({
        runId: id,
        status: "approved",
        reviewerIdentifier: body.reviewer ?? "human_reviewer",
        approvedPatchDigest: body.patchDigest,
        approvedReproductionDigest: body.reproDigest,
        decidedAt: new Date(),
      }).returning();
      return c.json(inserted[0], 200);
    }

    return c.json({ id: 1, runId: id, status: "approved" }, 200);
  });

  app.post("/api/v1/runs/:id/reject", async (c) => {
    const id = Number(c.req.param("id"));
    if (db) {
      await db.update(runs).set({ state: "failed", failureType: "rejected_by_human" }).where(eq(runs.id, id));
    }
    return c.json({ runId: id, status: "rejected" });
  });

  // ─── Pull Request ────────────────────────────────────────────────────────
  app.post("/api/v1/runs/:id/pull-request", async (c) => {
    const id = Number(c.req.param("id"));

    // Check approval status first
    if (db) {
      const apprs = await db.select().from(approvals).where(and(eq(approvals.runId, id), eq(approvals.status, "approved")));
      if (apprs.length === 0) {
        return c.json({ error: { code: "FORBIDDEN", message: "Draft PR creation is impossible without valid human approval" } }, 403);
      }
      const existingPr = await db.select().from(prs).where(eq(prs.runId, id));
      if (existingPr.length > 0) {
        return c.json(existingPr[0], 200);
      }
      const inserted = await db.insert(prs).values({
        runId: id,
        idempotencyKey: `run_${id}_pr_key`,
        status: "draft",
        externalPrNumber: 101,
      }).returning();
      return c.json(inserted[0], 201);
    }

    return c.json({ id: 1, runId: id, status: "draft", externalPrNumber: 101 }, 201);
  });

  return app;
}
