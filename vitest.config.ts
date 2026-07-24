import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Match the tsconfig path aliases so tests resolve @libs/* and @util/* the same
// way the app does. Order matters: @libs / @util before the bare @ alias.
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@libs": r("./libs"),
      "@util": r("./util"),
      "@": r("./src"),
    },
  },
  test: {
    environment: "node",
    include: ["libs/**/*.test.ts", "util/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
