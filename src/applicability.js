import { legislation } from "./config.js";

export function getApplicability(input, config = legislation) {
  const calculated = [
    "usn-income-standard",
    "usn-income-reduced",
    "usn-profit-standard",
    "usn-profit-reduced",
    "osno-standard",
    "ausn-income-none",
    "ausn-profit-none",
  ];

  const insufficient = [
    {
      id: "legal-limitations",
      title: "Юридические ограничения режимов",
      reason:
        "ТЗ не содержит входных данных для проверки видов деятельности, численности, долей участия, специальных лимитов и других условий применения.",
    },
  ];

  if (input.revenue < 0) {
    return {
      calculated: [],
      inapplicable: [{ id: "negative-revenue", title: "Все режимы", reason: "Выручка не может быть отрицательной." }],
      insufficient,
    };
  }

  const inapplicable = [];
  const nextCalculated = [...calculated];
  if (input.revenue > config.excelModel.ausnRevenueLimit) {
    inapplicable.push({
      id: "ausn-limit",
      title: "АУСН",
      reason: "В Excel для АУСН доход обнуляется при выручке выше 60 000 000 ₽, поэтому режим не участвует в сравнении.",
    });
    for (const id of ["ausn-income-none", "ausn-profit-none"]) {
      const index = nextCalculated.indexOf(id);
      if (index >= 0) nextCalculated.splice(index, 1);
    }
  }

  return { calculated: nextCalculated, inapplicable, insufficient };
}
