export interface AggregateEvaluationMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  resolutionRatePercent: number;
  averageCostPerTaskUsd: number;
  averageLatencySeconds: number;
  reproductionSuccessRatePercent: number;
  failureCategories: Record<string, number>;
}

export class EvaluationService {
  calculateMetrics(runsData: Array<{ state: string; failureCategory?: string | null; totalCostUsd?: number | null; durationMs?: number | null; reproSuccess?: boolean }>): AggregateEvaluationMetrics {
    const totalRuns = runsData.length;
    if (totalRuns === 0) {
      return {
        totalRuns: 0,
        completedRuns: 0,
        failedRuns: 0,
        resolutionRatePercent: 0,
        averageCostPerTaskUsd: 0,
        averageLatencySeconds: 0,
        reproductionSuccessRatePercent: 0,
        failureCategories: {},
      };
    }

    let completedRuns = 0;
    let failedRuns = 0;
    let totalCostUsd = 0;
    let totalDurationMs = 0;
    let reproSuccesses = 0;
    const failureCategories: Record<string, number> = {};

    for (const run of runsData) {
      if (run.state === "done") {
        completedRuns++;
      } else if (run.state === "failed") {
        failedRuns++;
      }

      totalCostUsd += run.totalCostUsd ?? 0;
      totalDurationMs += run.durationMs ?? 0;

      if (run.reproSuccess) {
        reproSuccesses++;
      }

      if (run.failureCategory) {
        failureCategories[run.failureCategory] = (failureCategories[run.failureCategory] ?? 0) + 1;
      }
    }

    return {
      totalRuns,
      completedRuns,
      failedRuns,
      resolutionRatePercent: (completedRuns / totalRuns) * 100,
      averageCostPerTaskUsd: totalCostUsd / totalRuns,
      averageLatencySeconds: totalDurationMs / totalRuns / 1000,
      reproductionSuccessRatePercent: (reproSuccesses / totalRuns) * 100,
      failureCategories,
    };
  }
}
