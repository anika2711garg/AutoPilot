/**
 * Build the base pytest sandbox template in E2B's cloud (no local Docker).
 *   set -a; source .env; set +a; npx tsx scripts/build-template.ts
 *
 * Produces a cached template `issue-to-pr-pytest` = python:3.11 + pytest, so
 * per-run sandboxes start in seconds and run tests fully network-off. Per-repo
 * templates (deps baked in) extend this in later phases.
 */
import { PYTEST_TEMPLATE } from "@libs/integrations/e2b";
import { Template, defaultBuildLogger } from "e2b";

async function main() {
  const apiKey = process.env.E2B_API_KEY;
  if (!apiKey) throw new Error("E2B_API_KEY is required");

  const template = Template()
    .fromPythonImage("3.11")
    .pipInstall(["pytest==8.3.4"]);

  const info = await Template.build(template, PYTEST_TEMPLATE, {
    apiKey,
    onBuildLogs: defaultBuildLogger({ minLevel: "info" }),
  });

  console.log(`\n✓ built template '${info.name}'  templateId=${info.templateId}  build=${info.buildId}`);
}

main().catch((err) => {
  console.error("template build failed:", err);
  process.exit(1);
});
