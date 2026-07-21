import { z } from "zod";
import { ConfidenceSchema } from "./confidence";

// ─── Stack trace & Ingestion ──────────────────────────────────────────────────
export const StackTraceLocationSchema = z.object({
  file: z.string(),
  line: z.number().int().optional(),
  functionName: z.string().optional(),
  snippet: z.string().optional(),
});
export type StackTraceLocation = z.infer<typeof StackTraceLocationSchema>;

export const IssueIngestionResultSchema = z.object({
  repositoryFullName: z.string(),
  issueNumber: z.number().int(),
  title: z.string(),
  body: z.string(),
  author: z.string().optional(),
  labels: z.array(z.string()).default([]),
  comments: z.array(z.object({ author: z.string(), body: z.string(), createdAt: z.string().optional() })).default([]),
  stackTraceLocations: z.array(StackTraceLocationSchema).default([]),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  environmentInfo: z.string().optional(),
  injectionDetected: z.boolean().default(false),
  injectionScore: z.number().default(0),
  injectionReason: z.string().optional(),
});
export type IssueIngestionResult = z.infer<typeof IssueIngestionResultSchema>;

// ─── Localization ─────────────────────────────────────────────────────────────
export const LocalizationCandidateSchema = z.object({
  filePath: z.string(),
  symbolName: z.string().optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type LocalizationCandidate = z.infer<typeof LocalizationCandidateSchema>;

export const LocalizationResultSchema = z.object({
  candidateFiles: z.array(z.string()),
  candidates: z.array(LocalizationCandidateSchema),
  evidence: z.string(),
  overallConfidence: z.number().min(0).max(1),
  queriesPerformed: z.array(z.string()).default([]),
  filesExamined: z.array(z.string()).default([]),
});
export type LocalizationResult = z.infer<typeof LocalizationResultSchema>;

// ─── Reproduction ─────────────────────────────────────────────────────────────
export const ReproductionProposalSchema = z.object({
  testFilePath: z.string(),
  testCode: z.string(),
  description: z.string(),
  expectedSymptom: z.string(),
});
export type ReproductionProposal = z.infer<typeof ReproductionProposalSchema>;

export const ReproductionResultSchema = z.object({
  proposedTest: ReproductionProposalSchema,
  syntaxValid: z.boolean(),
  failedBeforePatch: z.boolean(),
  symptomMatched: z.boolean(),
  confidence: ConfidenceSchema,
  failureReason: z.string().optional(),
  rejectedReasons: z.array(z.string()).default([]),
  rawOutput: z.string().optional(),
});
export type ReproductionResult = z.infer<typeof ReproductionResultSchema>;

// ─── Patching ─────────────────────────────────────────────────────────────────
export const FileEditSchema = z.object({
  filePath: z.string(),
  originalDigest: z.string().optional(),
  replacementContent: z.string(),
  targetContent: z.string().optional(),
});
export type FileEdit = z.infer<typeof FileEditSchema>;

export const StructuredPatchSchema = z.object({
  explanation: z.string(),
  edits: z.array(FileEditSchema),
  patchDigest: z.string(),
  canonicalDiff: z.string(),
  changedFiles: z.array(z.string()),
  sensitiveFiles: z.array(z.string()).default([]),
  isHighRisk: z.boolean().default(false),
});
export type StructuredPatch = z.infer<typeof StructuredPatchSchema>;

// ─── Verification ─────────────────────────────────────────────────────────────
export const VerificationReportSchema = z.object({
  baselinePassed: z.boolean(),
  reproBeforeFailed: z.boolean(),
  reproAfterPassed: z.boolean(),
  targetedSuitePassed: z.boolean(),
  fullSuitePassed: z.boolean(),
  revertCheckPassed: z.boolean(),
  flakyTests: z.array(z.string()).default([]),
  verdict: z.enum(["success", "failed", "flaky", "revert_failed"]),
  summary: z.string(),
  detailsJson: z.record(z.unknown()).optional(),
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

// ─── Approvals & PRs ──────────────────────────────────────────────────────────
export const ApprovalStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const ApprovalRecordSchema = z.object({
  id: z.number().int().optional(),
  runId: z.number().int(),
  status: ApprovalStatusSchema,
  reviewerIdentifier: z.string().optional(),
  reviewerComment: z.string().optional(),
  approvedPatchDigest: z.string(),
  approvedReproductionDigest: z.string(),
  createdAt: z.string().optional(),
  decidedAt: z.string().optional(),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecordSchema>;
export type HumanApprovalRecord = ApprovalRecord;

export const CreatePRPayloadSchema = z.object({
  runId: z.number().int(),
  idempotencyKey: z.string(),
  title: z.string(),
  body: z.string(),
  headBranch: z.string(),
  baseBranch: z.string().default("main"),
  draft: z.boolean().default(true),
});
export type CreatePRPayload = z.infer<typeof CreatePRPayloadSchema>;

// ─── Jobs & Queue ──────────────────────────────────────────────────────────────
export const JobStageSchema = z.enum([
  "ingesting",
  "localizing",
  "reproducing",
  "patching",
  "verifying",
  "opening_pr",
]);
export type JobStage = z.infer<typeof JobStageSchema>;

export const JobStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

// ─── Evaluation ───────────────────────────────────────────────────────────────
export const EvaluationMetricsSchema = z.object({
  totalTasks: z.number().int(),
  resolvedCount: z.number().int(),
  resolvedPercentage: z.number(),
  avgCostUsd: z.number(),
  avgCostPerResolvedTaskUsd: z.number(),
  avgLatencyMs: z.number(),
  localizationTop1Recall: z.number(),
  reproSuccessRate: z.number(),
  strictSuccessRate: z.number(),
  permissiveSuccessRate: z.number(),
  failureCounts: z.record(z.number()),
});
export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;
