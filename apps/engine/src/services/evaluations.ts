import type { EvaluationMetrics } from "@issue-to-pr/core";

export interface SingleTaskEvalResult {
  taskId: string;
  repo: string;
  issueNumber: number;
  mode: "strict" | "permissive";
  resolved: boolean;
  failureType?: string;
  confidence?: string;
  costUsd: number;
  latencyMs: number;
  localizedCorrectly: boolean;
  reproducedSuccessfully: boolean;
}

export class EvaluationService {
  computeAggregateMetrics(tasks: SingleTaskEvalResult[]): EvaluationMetrics {
    if (tasks.length === 0) {
      return {
        totalTasks: 0,
        resolvedCount: 0,
        resolvedPercentage: 0,
        avgCostUsd: 0,
        avgCostPerResolvedTaskUsd: 0,
        avgLatencyMs: 0,
        localizationTop1Recall: 0,
        reproSuccessRate: 0,
        strictSuccessRate: 0,
        permissiveSuccessRate: 0,
        failureCounts: {},
      };
    }

    const totalTasks = tasks.length;
    const resolvedTasks = tasks.filter((t) => t.resolved);
    const resolvedCount = resolvedTasks.length;
    const resolvedPercentage = (resolvedCount / totalTasks) * 100;

    const totalCost = tasks.reduce((sum, t) => sum + t.costUsd, 0);
    const avgCostUsd = totalCost / totalTasks;

    const resolvedCost = resolvedTasks.reduce((sum, t) => sum + t.costUsd, 0);
    const avgCostPerResolvedTaskUsd = resolvedCount > 0 ? resolvedCost / resolvedCount : 0;

    const totalLatency = tasks.reduce((sum, t) => sum + t.latencyMs, 0);
    const avgLatencyMs = totalLatency / totalTasks;

    const localizedCount = tasks.filter((t) => t.localizedCorrectly).length;
    const localizationTop1Recall = (localizedCount / totalTasks) * 100;

    const reproCount = tasks.filter((t) => t.reproducedSuccessfully).length;
    const reproSuccessRate = (reproCount / totalTasks) * 100;

    const strictTasks = tasks.filter((t) => t.mode === "strict");
    const strictResolved = strictTasks.filter((t) => t.resolved).length;
    const strictSuccessRate = strictTasks.length > 0 ? (strictResolved / strictTasks.length) * 100 : 0;

    const permissiveTasks = tasks.filter((t) => t.mode === "permissive");
    const permissiveResolved = permissiveTasks.filter((t) => t.resolved).length;
    const permissiveSuccessRate = permissiveTasks.length > 0 ? (permissiveResolved / permissiveTasks.length) * 100 : 0;

    const failureCounts: Record<string, number> = {};
    for (const task of tasks) {
      if (task.failureType) {
        failureCounts[task.failureType] = (failureCounts[task.failureType] ?? 0) + 1;
      }
    }

    return {
      totalTasks,
      resolvedCount,
      resolvedPercentage,
      avgCostUsd,
      avgCostPerResolvedTaskUsd,
      avgLatencyMs,
      localizationTop1Recall,
      reproSuccessRate,
      strictSuccessRate,
      permissiveSuccessRate,
      failureCounts,
    };
  }
}
