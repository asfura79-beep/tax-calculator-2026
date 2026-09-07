import assert from "node:assert/strict";
import { legislation } from "../src/config.js";
import {
  calculateAllRegimes,
  calculateAusnIncome,
  calculateIpOnePercent,
  calculateProgressiveNdfl,
  calculateUsnIncome,
} from "../src/taxCalculations.js";
import { buildComparison } from "../src/results.js";

const excelInput = {
  entityType: "ip",
  hasEmployees: false,
  revenue: 21_000_000,
  totalExpenses: 5_000_000,
  vatPurchases: 5_000_000,
  employeeContributions: 0,
  accidentContributions: 2_959,
  usnIncomeRate: 6,
  usnIncomeExpenseRate: 15,
};

function approx(actual, expected, tolerance = 1) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
}

{
  const results = Object.fromEntries(calculateAllRegimes(excelInput).map((item) => [item.id, item]));
  approx(results["usn-income-standard"].totalPayment, 3_918_032.787);
  approx(results["usn-income-reduced"].totalPayment, 2_200_000);
  approx(results["usn-profit-standard"].totalPayment, 5_006_850.242);
  approx(results["usn-profit-reduced"].totalPayment, 3_423_243.685);
  approx(results["osno-standard"].totalPayment, 5_199_571.543);
  approx(results["ausn-income-none"].totalPayment, 1_682_959);
  approx(results["ausn-profit-none"].totalPayment, 3_202_959);
}

{
  const results = Object.fromEntries(
    calculateAllRegimes({ ...excelInput, entityType: "ooo" }).map((item) => [item.id, item]),
  );
  approx(results["usn-income-standard"].totalPayment, 3_918_032.787);
  approx(results["usn-income-reduced"].totalPayment, 2_200_000);
  approx(results["usn-profit-standard"].totalPayment, 4_852_459.016);
  approx(results["usn-profit-reduced"].totalPayment, 3_250_000);
  approx(results["osno-standard"].totalPayment, 6_163_934.426);
  approx(results["ausn-income-none"].totalPayment, 1_682_959);
  approx(results["ausn-profit-none"].totalPayment, 3_202_959);
}

{
  assert.equal(calculateIpOnePercent(300_000), 0);
  assert.equal(calculateIpOnePercent(301_000), 10);
  assert.equal(calculateIpOnePercent(100_000_000), legislation.ipContributions.variableMax);
}

{
  assert.equal(calculateProgressiveNdfl(0), 0);
  assert.equal(calculateProgressiveNdfl(2_400_000), 312_000);
  assert.equal(calculateProgressiveNdfl(2_400_001), 312_000.15);
  assert.equal(calculateProgressiveNdfl(5_000_000), 702_000);
  assert.equal(calculateProgressiveNdfl(20_000_000), 3_402_000);
  assert.equal(calculateProgressiveNdfl(50_000_000), 9_402_000);
  assert.equal(calculateProgressiveNdfl(50_000_001), 9_402_000.22);
}

{
  const before = calculateUsnIncome({ ...excelInput, revenue: 249_999_999 }, "reduced");
  const at = calculateUsnIncome({ ...excelInput, revenue: 250_000_000 }, "reduced");
  const after = calculateUsnIncome({ ...excelInput, revenue: 250_000_001 }, "reduced");
  assert.ok(before.vatPayable < at.vatPayable);
  assert.ok(at.vatPayable < after.vatPayable);
}

{
  const ausnAllowed = calculateAusnIncome({ ...excelInput, revenue: 60_000_000 });
  const ausnBlocked = buildComparison({ ...excelInput, revenue: 60_000_001 }, legislation);
  assert.equal(ausnAllowed.income, 60_000_000);
  assert.ok(!ausnBlocked.results.some((item) => item.id.startsWith("ausn")));
  assert.ok(ausnBlocked.applicability.inapplicable.some((item) => item.id === "ausn-limit"));
}

{
  const comparison = buildComparison(excelInput, legislation);
  assert.equal(comparison.results[0].netProfit, Math.max(...comparison.results.map((item) => item.netProfit)));
}

console.log("All tax calculation tests passed.");
