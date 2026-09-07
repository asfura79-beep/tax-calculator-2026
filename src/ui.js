import { legislation, moneyFields } from "./config.js";
import { buildComparison } from "./results.js";
import { explainBestResult } from "./explanations.js";

const form = document.querySelector("#calculator-form");
const emptyState = document.querySelector("#empty-state");
const resultsNode = document.querySelector("#results");
const comparisonBody = document.querySelector("#comparison-body");
const detailSelect = document.querySelector("#detail-select");
const detailsContent = document.querySelector("#details-content");
const toggleDetails = document.querySelector("#toggle-details");

let currentComparison = null;

const formatRub = (value) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const formatPercent = (value) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value * 100) + "%";

function parseMoney(value) {
  const normalized = String(value).replace(/[^\d,.-]/g, "").replace(",", ".");
  return Number(normalized || 0);
}

function formatMoneyInput(input) {
  const value = parseMoney(input.value);
  input.value = Number.isFinite(value) ? new Intl.NumberFormat("ru-RU").format(value) : "";
}

function readInput() {
  return {
    entityType: new FormData(form).get("entityType"),
    hasEmployees: new FormData(form).get("hasEmployees") === "true",
    revenue: parseMoney(form.elements.revenue.value),
    totalExpenses: parseMoney(form.elements.totalExpenses.value),
    vatPurchases: parseMoney(form.elements.vatPurchases.value),
    employeeContributions: parseMoney(form.elements.employeeContributions.value),
    accidentContributions: parseMoney(form.elements.accidentContributions.value),
    usnIncomeRate: parseMoney(form.elements.usnIncomeRate.value),
    usnIncomeExpenseRate: parseMoney(form.elements.usnIncomeExpenseRate.value),
  };
}

function validate(input) {
  const errors = {};
  for (const key of moneyFields) {
    if (!Number.isFinite(input[key]) || input[key] < 0) errors[key] = "Введите сумму не меньше нуля";
  }
  if (input.vatPurchases > input.totalExpenses) {
    errors.vatPurchases = "Покупки с НДС не должны быть больше общих расходов";
  }
  if (input.employeeContributions > input.totalExpenses) {
    errors.employeeContributions = "Взносы сотрудников не должны быть больше общих расходов";
  }
  if (input.totalExpenses > input.revenue && input.revenue > 0) {
    errors.totalExpenses = "Расходы выше выручки: расчет возможен, но проверьте ввод";
  }
  if (input.usnIncomeRate < 0 || input.usnIncomeExpenseRate < 0) {
    errors.usnIncomeRate = "Ставка не может быть отрицательной";
  }
  return errors;
}

function showErrors(errors) {
  document.querySelectorAll("[data-error-for]").forEach((node) => {
    const field = node.dataset.errorFor;
    node.textContent = errors[field] ?? "";
  });
}

function renderComparison(comparison, input) {
  currentComparison = comparison;
  emptyState.classList.add("hidden");
  resultsNode.classList.remove("hidden");

  const [best, second] = comparison.results;
  document.querySelector("#best-title").textContent = `${best.regime} + ${best.vatLabel}`;
  document.querySelector("#best-profit").textContent = formatRub(best.netProfit);
  document.querySelector("#best-taxes").textContent = formatRub(best.totalTaxes);
  document.querySelector("#best-delta").textContent = second
    ? `На ${formatRub(best.netProfit - second.netProfit)} больше прибыли, чем при следующем варианте.`
    : "Это единственный рассчитанный применимый вариант.";
  document.querySelector("#best-explanation").textContent = explainBestResult(comparison, input);

  comparisonBody.replaceChildren(
    ...comparison.results.map((result, index) => {
      const row = document.createElement("tr");
      if (index === 0) row.className = "is-best";
      row.innerHTML = `
        <td>${result.regime}</td>
        <td>${result.vatLabel}</td>
        <td>${formatRub(result.totalTaxes)}</td>
        <td><strong>${formatRub(result.netProfit)}</strong></td>
        <td>${index === 0 ? "Лучший" : "− " + formatRub(Math.abs(result.differenceFromBest))}</td>
      `;
      return row;
    }),
  );

  renderChart(comparison.results);
  renderDetailSelect(comparison.results);
  renderPnl(comparison.results[0]);
  renderLimitations(comparison.applicability);
}

function renderChart(results) {
  const chart = document.querySelector("#profit-chart");
  const maxAbs = Math.max(...results.map((item) => Math.abs(item.netProfit)), 1);
  chart.replaceChildren(
    ...results.map((result) => {
      const item = document.createElement("div");
      item.className = "bar-row";
      const width = Math.max((Math.abs(result.netProfit) / maxAbs) * 100, 2);
      item.innerHTML = `
        <span>${result.regime}<small>${result.vatLabel}</small></span>
        <div class="bar-track"><div class="bar ${result.netProfit < 0 ? "negative" : ""}" style="width:${width}%"></div></div>
        <strong>${formatRub(result.netProfit)}</strong>
      `;
      return item;
    }),
  );
}

function renderDetailSelect(results) {
  detailSelect.replaceChildren(
    ...results.map((result) => {
      const option = document.createElement("option");
      option.value = result.id;
      option.textContent = `${result.regime} + ${result.vatLabel}`;
      return option;
    }),
  );
}

function renderPnl(result) {
  const rows = [
    ["Доход", result.details.income],
    ["Расходы для чистой прибыли", -result.details.expenseBase],
    ["Налоговая база доходов", result.details.taxableIncome],
    ["Налоговая база расходов", result.details.taxableExpense],
    ["Начисленный налог", result.details.accruedTax],
    ["Вычет", -result.details.deduction],
    ["Минимальный налог", result.details.minimumTax],
    ["Регулярный налог", result.details.regularTax],
    ["НДС начисленный", result.details.vatAccrued],
    ["НДС к вычету", -result.details.vatDeductible],
    ["НДС к уплате", -result.details.vatPayable],
    ["Страховые взносы", -result.details.contributions],
    ["Налог по режиму", -result.details.regimeTax],
    ["Итого к уплате", -result.details.totalPayment],
    ["Чистая прибыль", result.netProfit],
  ].filter(([, value]) => value !== undefined);

  document.querySelector("#pnl-table").innerHTML = `
    <table>
      <thead><tr><th>Строка P&L</th><th>Сумма</th><th>% от выручки</th></tr></thead>
      <tbody>
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td>${label}</td>
                <td>${formatRub(value)}</td>
                <td>${result.income ? formatPercent(value / result.income) : "0%"}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderLimitations(applicability) {
  const limitations = document.querySelector("#limitations");
  const items = [...applicability.inapplicable, ...applicability.insufficient];
  limitations.replaceChildren(
    ...items.map((item) => {
      const details = document.createElement("details");
      details.innerHTML = `<summary>${item.title}</summary><p>${item.reason}</p>`;
      return details;
    }),
  );
}

function calculate(event) {
  event?.preventDefault();
  const input = readInput();
  const errors = validate(input);
  showErrors(errors);
  if (Object.values(errors).some((message) => message.startsWith("Введите"))) return;
  renderComparison(buildComparison(input, legislation), input);
}

form.addEventListener("submit", calculate);
detailSelect.addEventListener("change", () => {
  const result = currentComparison.results.find((item) => item.id === detailSelect.value);
  renderPnl(result);
});

toggleDetails.addEventListener("click", () => {
  const hidden = detailsContent.classList.toggle("hidden");
  toggleDetails.textContent = hidden ? "Посмотреть подробный расчет" : "Скрыть подробный расчет";
});

moneyFields.forEach((field) => {
  form.elements[field].addEventListener("blur", () => formatMoneyInput(form.elements[field]));
});
