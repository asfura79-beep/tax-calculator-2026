import { calculateAllRegimes } from "./taxCalculations.js";
import { getApplicability } from "./applicability.js";

export function buildComparison(input, config) {
  const applicability = getApplicability(input, config);
  const allResults = calculateAllRegimes(input, config).filter((result) =>
    applicability.calculated.includes(result.id),
  );
  const sorted = [...allResults].sort((a, b) => b.netProfit - a.netProfit);
  const best = sorted[0] ?? null;

  return {
    best,
    results: sorted.map((result) => ({
      ...result,
      differenceFromBest: best ? result.netProfit - best.netProfit : 0,
    })),
    applicability,
  };
}
