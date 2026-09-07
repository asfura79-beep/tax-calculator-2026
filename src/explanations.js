export function explainBestResult(comparison, input) {
  const [best, second] = comparison.results;
  if (!best) return "Недостаточно данных для расчета применимых вариантов.";

  const expenseShare = input.revenue > 0 ? input.totalExpenses / input.revenue : 0;
  const fragments = [];
  const advantage = second ? best.netProfit - second.netProfit : 0;

  if (best.regime.includes("минус расходы")) {
    fragments.push(
      expenseShare >= 0.45
        ? "Расходы занимают заметную долю выручки, поэтому режим с учетом расходов сохраняет больше прибыли."
        : "Даже при заданной доле расходов этот режим дал максимальную расчетную чистую прибыль после применения минимального налога.",
    );
  } else if (best.regime.includes("Доходы")) {
    fragments.push(
      expenseShare < 0.45
        ? "Расходы относительно выручки невысокие, поэтому расчет от доходов оказался выгоднее вариантов с налогом на прибыль."
        : "После учета вычетов и налоговой базы этот режим дал лучший расчетный результат среди применимых вариантов.",
    );
  } else {
    fragments.push("По этой структуре выручки, расходов и НДС общий налоговый результат на ОСНО оказался сильнее альтернатив.");
  }

  if (best.vatType === "reduced") {
    fragments.push(
      "Пониженный НДС 5/7% в Excel считается с дохода без принятия входящего НДС к вычету.",
    );
  }

  if (best.vatType === "standard") {
    fragments.push("Стандартный НДС уменьшает выручку, но позволяет принять входящий НДС к вычету по расходам с НДС.");
  }

  if (second) {
    fragments.push(
      `В результате этот вариант оставляет на ${formatRub(adjustMoney(advantage))} больше, чем ближайшая альтернатива.`,
    );
  }

  return fragments.join(" ");
}

function adjustMoney(value) {
  return Math.max(value, 0);
}

function formatRub(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}
