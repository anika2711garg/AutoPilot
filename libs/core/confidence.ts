import { z } from "zod";

/**
 * Reproduction confidence. The grade rides on the run, the PR body, and the eval
 * results — permanently. No laundering weak evidence into confident claims.
 *
 * - strong: the test fails AND its failure matches the reported symptom.
 * - weak: the test fails but the symptom match is uncertain.
 * - unreproduced: no valid failing test tied to the reported bug.
 */
export const confidences = ["strong", "weak", "unreproduced"] as const;

export const ConfidenceSchema = z.enum(confidences);
export type Confidence = z.infer<typeof ConfidenceSchema>;
