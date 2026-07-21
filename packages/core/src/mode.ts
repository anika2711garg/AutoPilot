import { z } from "zod";

/**
 * Configurable strictness of the reproduction gate.
 *
 * - strict: no strong reproduction → halt with a typed failure report.
 * - permissive (default): continue, but carry the confidence label forward.
 * - vibes: skip reproduction, patch, and claim. Ablation baseline only.
 */
export const modes = ["strict", "permissive", "vibes"] as const;

export const ModeSchema = z.enum(modes);
export type Mode = z.infer<typeof ModeSchema>;

export const DEFAULT_MODE: Mode = "permissive";
