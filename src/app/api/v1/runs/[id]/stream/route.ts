export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id, 10);

  const encoder = new TextEncoder();

  const events = [
    { id: 1, type: "run.state_changed.created", stage: "created" },
    { id: 2, type: "run.state_changed.ingesting", stage: "ingest" },
    { id: 3, type: "run.state_changed.localizing", stage: "localize" },
    { id: 4, type: "run.state_changed.reproducing", stage: "reproduce" },
    { id: 5, type: "run.state_changed.patching", stage: "patch" },
    { id: 6, type: "run.state_changed.verifying", stage: "verify" },
    { id: 7, type: "run.state_changed.awaiting_human", stage: "awaiting_human" },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      for (const evt of events) {
        const payload = `id: ${evt.id}\nevent: ${evt.type}\ndata: ${JSON.stringify({ runId: id, ...evt })}\n\n`;
        controller.enqueue(encoder.encode(payload));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
