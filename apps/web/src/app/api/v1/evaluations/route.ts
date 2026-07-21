import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    metrics: {
      totalRuns: 12,
      completedRuns: 10,
      failedRuns: 2,
      resolutionRatePercent: 83.3,
      averageCostPerTaskUsd: 0.14,
      averageLatencySeconds: 42.5,
      reproductionSuccessRatePercent: 91.6,
      failureCategories: {
        sandbox_timeout: 1,
        unreproduced: 1,
      },
    },
  });
}
