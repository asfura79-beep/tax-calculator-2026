import { legislation } from "./config.js";

const round0 = (value) => Math.round(value);

export function normalizeRates(input) {
  return {
    usnIncomeRate: (input.usnIncomeRate ?? 6) / 100,
    usnIncomeExpenseRate: (input.usnIncomeExpenseRate ?? 15) / 100,
  };
}

export function calculateCommon(input, config = legislation) {
  const model = config.excelModel;
  const outputVat22 = (input.revenue * model.vat22Numerator) / model.vat22Denominator;
  const inputVat22 = (input.vatPurchases * model.vat22Numerator) / model.vat22Denominator;
  const vatPayable22 = outputVat22 - inputVat22;
  const reducedVat =
    input.revenue < model.reducedVatThreshold
      ? (input.revenue * model.reducedVatLowNumerator) / model.reducedVatLowDenominator
      : (input.revenue * model.reducedVatHighNumerator) / model.reducedVatHighDenominator;
  const expenseBase = input.totalExpenses - input.employeeContributions;

  return {
    income: input.revenue,
    expenseBase,
    outputVat22,
    inputVat22,
    vatPayable22,
    reducedVat,
  };
}

export function calculateIpOnePercent(base, config = legislation) {
  return Math.min(
    Math.max((base - config.ipContributions.variableThreshold) * config.ipContributions.variableRate, 0),
    config.ipContributions.variableMax,
  );
}

export function calculateProgressiveNdfl(income, config = legislation) {
  if (income <= 0) return 0;
  const bracket = config.personalIncomeTax.find((item) => income <= item.upTo);
  return bracket.accumulated + (income - bracket.base) * bracket.rate;
}

export function excelUsnIncomeDeduction(accruedTax, contributions, hasEmployees) {
  const deductible = Math.min(accruedTax, contributions);
  if (!hasEmployees) return deductible;
  return contributions >= accruedTax / 2 ? deductible / 2 : deductible;
}

function buildResult(data) {
  const totalTaxes = data.totalPayment;
  const netProfit = data.income - data.expenseBase - data.totalPayment;
  return {
    ...data,
    totalTaxes,
    netProfit,
    taxBurden: data.income ? data.totalPayment / data.income : 0,
    pnl: {
      revenueNet: data.taxableIncome ?? data.income,
      expenses: {
        variableVat: 0,
        variableNoVat: data.expenseBase,
        fixedVat: 0,
        fixedNoVat: 0,
      },
      grossProfit: data.income - data.expenseBase,
      operatingProfit: data.income - data.expenseBase,
      outputVat: data.vatAccrued,
      inputVat: data.vatDeductible,
      vatPayable: data.vatPayable,
    },
    details: {
      income: data.income,
      expenseBase: data.expenseBase,
      taxableIncome: data.taxableIncome,
      taxableExpense: data.taxableExpense,
      taxBase: data.taxBase,
      accruedTax: data.accruedTax,
      deduction: data.deduction,
      minimumTax: data.minimumTax,
      regularTax: data.regularTax,
      fixedIpContributions: data.fixedIpContributions,
      ipOnePercent: data.ipOnePercent,
      employeeContributions: data.employeeContributions,
      accidentContributions: data.accidentContributions,
      contributions: data.contributions,
      vatAccrued: data.vatAccrued,
      vatDeductible: data.vatDeductible,
      vatPayable: data.vatPayable,
      regimeTax: data.regimeTax,
      totalPayment: data.totalPayment,
    },
  };
}

function contributionBlock(input, variant, mode, common, config) {
  const isIp = input.entityType === "ip";
  const employeeContributions = input.employeeContributions;
  const fixedIpContributions = isIp ? config.ipContributions.fixedPart : 0;
  let ipOnePercent = 0;

  if (isIp && mode === "income" && variant === "standard") {
    ipOnePercent = calculateIpOnePercent(input.revenue - common.outputVat22, config);
  }
  if (isIp && mode === "income" && variant === "reduced") {
    ipOnePercent = calculateIpOnePercent(input.revenue - common.reducedVat, config);
  }
  if (isIp && mode !== "income" && variant === "standard") {
    ipOnePercent = calculateIpOnePercent(
      input.revenue -
        common.outputVat22 -
        (common.expenseBase - common.inputVat22) -
        fixedIpContributions -
        employeeContributions,
      config,
    );
  }
  if (isIp && mode !== "income" && variant === "reduced") {
    ipOnePercent = calculateIpOnePercent(
      input.revenue - common.reducedVat - common.expenseBase - fixedIpContributions - employeeContributions,
      config,
    );
  }

  return {
    employeeContributions,
    fixedIpContributions,
    ipOnePercent,
    contributions: employeeContributions + fixedIpContributions + ipOnePercent,
  };
}

export function calculateUsnIncome(input, vatVariant, config = legislation) {
  const common = calculateCommon(input, config);
  const rates = normalizeRates(input);
  const contributions = contributionBlock(input, vatVariant, "income", common, config);
  const isStandard = vatVariant === "standard";
  const vatAccrued = isStandard ? common.outputVat22 : common.reducedVat;
  const vatDeductible = isStandard ? common.inputVat22 : 0;
  const vatPayable = isStandard ? common.vatPayable22 : common.reducedVat;
  const taxableIncome = input.revenue - vatAccrued;
  const accruedTax = taxableIncome * rates.usnIncomeRate;
  const deduction =
    input.entityType === "ooo" && vatVariant === "reduced"
      ? Math.min(contributions.contributions, accruedTax / 2)
      : excelUsnIncomeDeduction(accruedTax, contributions.contributions, input.hasEmployees);
  const regimeTax = accruedTax - deduction;
  const totalPayment = contributions.contributions + regimeTax + vatPayable;

  return buildResult({
    id: `usn-income-${vatVariant}`,
    regime: "УСН Доходы",
    vatLabel: isStandard ? "22%" : "5% / 7%",
    vatType: vatVariant,
    income: input.revenue,
    expenseBase: common.expenseBase,
    taxableIncome,
    accruedTax,
    deduction,
    regimeTax,
    vatAccrued,
    vatDeductible,
    vatPayable,
    totalPayment,
    ...contributions,
  });
}

export function calculateUsnIncomeExpense(input, vatVariant, config = legislation) {
  const common = calculateCommon(input, config);
  const rates = normalizeRates(input);
  const contributions = contributionBlock(input, vatVariant, "incomeExpense", common, config);
  const isStandard = vatVariant === "standard";
  const vatAccrued = isStandard ? common.outputVat22 : common.reducedVat;
  const vatDeductible = isStandard ? common.inputVat22 : 0;
  const vatPayable = isStandard ? common.vatPayable22 : common.reducedVat;
  const taxableIncome = input.revenue - vatAccrued;
  const taxExpenseContributions =
    isStandard && input.entityType === "ip"
      ? contributionBlock(input, "reduced", "incomeExpense", common, config).contributions
      : contributions.contributions;
  const taxableExpense = isStandard
    ? Math.min(common.expenseBase + taxExpenseContributions - common.inputVat22, input.revenue)
    : Math.min(common.expenseBase + taxExpenseContributions, input.revenue);
  const minimumTax = taxableIncome * config.usn.profitMinimumIncomeRate;
  const regularTax = (taxableIncome - taxableExpense) * rates.usnIncomeExpenseRate;
  const regimeTax = Math.max(regularTax, minimumTax);
  const totalPayment = contributions.contributions + regimeTax + vatPayable;

  return buildResult({
    id: `usn-profit-${vatVariant}`,
    regime: "УСН Доходы минус расходы",
    vatLabel: isStandard ? "22%" : "5% / 7%",
    vatType: vatVariant,
    income: input.revenue,
    expenseBase: common.expenseBase,
    taxableIncome,
    taxableExpense,
    taxBase: taxableIncome - taxableExpense,
    regularTax,
    minimumTax,
    regimeTax,
    vatAccrued,
    vatDeductible,
    vatPayable,
    totalPayment,
    ...contributions,
  });
}

export function calculateOsno(input, config = legislation) {
  const common = calculateCommon(input, config);
  const contributions = contributionBlock(input, "standard", "osno", common, config);
  const taxableIncome = input.revenue - common.outputVat22;
  const taxableExpense = common.expenseBase - common.inputVat22 + contributions.contributions;
  const taxBase = taxableIncome - taxableExpense;
  const regimeTax =
    input.entityType === "ooo"
      ? Math.max(taxBase * config.osno.corporateProfitRate, 0)
      : round0(calculateProgressiveNdfl(taxBase, config));
  const totalPayment = contributions.contributions + common.vatPayable22 + regimeTax;

  return buildResult({
    id: "osno-standard",
    regime: input.entityType === "ooo" ? "ОСНО Налог на прибыль" : "ОСНО НДФЛ ИП",
    vatLabel: "22%",
    vatType: "standard",
    income: input.revenue,
    expenseBase: common.expenseBase,
    taxableIncome,
    taxableExpense,
    taxBase,
    regimeTax,
    vatAccrued: common.outputVat22,
    vatDeductible: common.inputVat22,
    vatPayable: common.vatPayable22,
    totalPayment,
    ...contributions,
  });
}

export function calculateAusnIncome(input, config = legislation) {
  const income = input.revenue > config.excelModel.ausnRevenueLimit ? 0 : input.revenue;
  const expenseBase = input.revenue > config.excelModel.ausnRevenueLimit ? 0 : input.totalExpenses;
  const contributions = input.accidentContributions;
  const taxableIncome = income;
  const accruedTax = taxableIncome * config.ausn.incomeRate;
  const regimeTax = accruedTax;
  const totalPayment = contributions + regimeTax;

  return buildResult({
    id: "ausn-income-none",
    regime: "АУСН Доходы",
    vatLabel: "Без НДС",
    vatType: "none",
    income,
    expenseBase,
    taxableIncome,
    accruedTax,
    regimeTax,
    vatAccrued: 0,
    vatDeductible: 0,
    vatPayable: 0,
    totalPayment,
    accidentContributions: contributions,
    employeeContributions: 0,
    fixedIpContributions: 0,
    ipOnePercent: 0,
    contributions,
  });
}

export function calculateAusnIncomeExpense(input, config = legislation) {
  const income = input.revenue > config.excelModel.ausnRevenueLimit ? 0 : input.revenue;
  const expenseBase = input.revenue > config.excelModel.ausnRevenueLimit ? 0 : input.totalExpenses;
  const contributions = input.accidentContributions;
  const taxableIncome = income;
  const taxableExpense = Math.min(expenseBase, income);
  const minimumTax = taxableIncome * config.ausn.profitMinimumIncomeRate;
  const regularTax = (taxableIncome - taxableExpense) * config.ausn.profitRate;
  const regimeTax = Math.max(regularTax, minimumTax);
  const totalPayment = contributions + regimeTax;

  return buildResult({
    id: "ausn-profit-none",
    regime: "АУСН Доходы минус расходы",
    vatLabel: "Без НДС",
    vatType: "none",
    income,
    expenseBase,
    taxableIncome,
    taxableExpense,
    taxBase: taxableIncome - taxableExpense,
    regularTax,
    minimumTax,
    regimeTax,
    vatAccrued: 0,
    vatDeductible: 0,
    vatPayable: 0,
    totalPayment,
    accidentContributions: contributions,
    employeeContributions: 0,
    fixedIpContributions: 0,
    ipOnePercent: 0,
    contributions,
  });
}

export function calculateAllRegimes(input, config = legislation) {
  return [
    calculateUsnIncome(input, "standard", config),
    calculateUsnIncome(input, "reduced", config),
    calculateUsnIncomeExpense(input, "standard", config),
    calculateUsnIncomeExpense(input, "reduced", config),
    calculateOsno(input, config),
    calculateAusnIncome(input, config),
    calculateAusnIncomeExpense(input, config),
  ];
}

export function vatTypeToLabel(vatType) {
  if (vatType === "reduced") return "5% / 7%";
  if (vatType === "standard") return "22%";
  return "Без НДС";
}

export const calculateBasePnl = calculateCommon;
export const calculateReducedVatPnl = calculateCommon;
export const calculateStandardVatPnl = calculateCommon;
export const calculateIpContributions = (revenue, config = legislation) =>
  config.ipContributions.fixedPart + calculateIpOnePercent(revenue, config);
export const calculatePersonalIncomeTax = calculateProgressiveNdfl;
