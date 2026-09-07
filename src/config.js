export const legislation = {
  excelModel: {
    vat22Numerator: 22,
    vat22Denominator: 122,
    reducedVatThreshold: 250_000_000,
    reducedVatLowNumerator: 5,
    reducedVatLowDenominator: 105,
    reducedVatHighNumerator: 7,
    reducedVatHighDenominator: 107,
    ausnRevenueLimit: 60_000_000,
  },
  usn: {
    incomeRate: 0.06,
    profitRate: 0.15,
    profitMinimumIncomeRate: 0.01,
    maxContributionDeductionShare: 0.5,
  },
  ausn: {
    incomeRate: 0.08,
    profitRate: 0.2,
    profitMinimumIncomeRate: 0.03,
  },
  osno: {
    corporateProfitRate: 0.25,
  },
  personalIncomeTax: [
    { upTo: 2_400_000, rate: 0.13, accumulated: 0, base: 0 },
    { upTo: 5_000_000, rate: 0.15, accumulated: 312_000, base: 2_400_000 },
    { upTo: 20_000_000, rate: 0.18, accumulated: 702_000, base: 5_000_000 },
    { upTo: 50_000_000, rate: 0.2, accumulated: 3_402_000, base: 20_000_000 },
    { upTo: Infinity, rate: 0.22, accumulated: 9_402_000, base: 50_000_000 },
  ],
  ipContributions: {
    fixedPart: 57_390,
    variableThreshold: 300_000,
    variableRate: 0.01,
    variableMax: 321_818,
    totalMax: 379_208,
  },
};

export const moneyFields = [
  "revenue",
  "totalExpenses",
  "vatPurchases",
  "employeeContributions",
  "accidentContributions",
];
