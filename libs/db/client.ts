import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

/**
 * Create a Drizzle client over a postgres.js connection.
 *
 * The engine passes its DIRECT (unpooled) URL; the web app passes the POOLED
 * URL. On local Docker Postgres they're the same string; on Neon they differ.
 */
export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { max: options.max ?? 10 });
  return drizzle(sql, { schema });
}
