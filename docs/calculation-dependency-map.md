# Карта зависимостей расчетов по Excel

Источник: `Калькулятор_налоговой_нагрузки_2026.xlsx`.

## Входные данные

Все режимы получают единый объект входов:

- `entityType`: `ip` или `ooo`
- `revenue`: лист `Вводные`, `B1`, доходы за 2025 год, включая НДС
- `totalExpenses`: `B2`, общие расходы
- `vatPurchases`: `B3`, покупки у поставщиков с НДС
- `employeeContributions`: `B4`, страховые взносы за сотрудников, кроме ИП за себя и 1% ИП
- `accidentContributions`: `B5`, взносы от несчастных случаев для АУСН
- `hasEmployees`: `B6`, влияет на ограничение вычета УСН
- `usnIncomeRate`: `B7`, региональная ставка УСН Доходы, в процентах
- `usnIncomeExpenseRate`: `B8`, региональная ставка УСН Доходы минус расходы, в процентах

## Общие параметры Excel

- НДС 22%: `outputVat22 = revenue * 22 / 122`
- Входящий НДС 22%: `inputVat22 = vatPurchases * 22 / 122`
- НДС 22% к уплате: `vatPayable22 = outputVat22 - inputVat22`
- НДС 5/7%: если `revenue < 250 000 000`, то `revenue * 5 / 105`, иначе `revenue * 7 / 107`
- Фиксированные взносы ИП за себя: `57 390`
- 1% ИП: максимум `321 818`
- АУСН применяется только при доходе не выше `60 000 000`; в Excel доход АУСН обнуляется через `IF(K4>60000000,0,K4)`

## УСН Доходы, НДС 22%

1. `income = revenue`
2. `employeeContributions = input.employeeContributions`
3. Для ИП:
   - `fixedIpContributions = 57 390`
   - `ipOnePercent22 = min(max((income - outputVat22 - 300000) * 1%, 0), 321818)`
   - `contributions22 = employeeContributions + fixedIpContributions + ipOnePercent22`
   Для ООО:
   - `contributions22 = employeeContributions`
4. `expenseBase = totalExpenses - employeeContributions`
5. `taxableIncome22 = income - outputVat22`
6. `accruedTax22 = taxableIncome22 * usnIncomeRate`
7. `deduction22 = excelUsnIncomeDeduction(accruedTax22, contributions22, hasEmployees)`
8. `regimeTax22 = accruedTax22 - deduction22`
9. `totalPayment22 = contributions22 + regimeTax22 + vatPayable22`
10. `netProfit22 = income - expenseBase - totalPayment22`

## УСН Доходы, НДС 5/7%

1. `income = revenue`
2. `vatPayable57 = reducedVat`
3. Для ИП:
   - `ipOnePercent57 = min(max((income - reducedVat - 300000) * 1%, 0), 321818)`
   - `contributions57 = employeeContributions + 57390 + ipOnePercent57`
   Для ООО:
   - `contributions57 = employeeContributions`
4. `expenseBase = totalExpenses - employeeContributions`
5. `taxableIncome57 = income - reducedVat`
6. `accruedTax57 = taxableIncome57 * usnIncomeRate`
7. Для ИП: `deduction57 = excelUsnIncomeDeduction(accruedTax57, contributions57, hasEmployees)`
   Для ООО: `deduction57 = min(contributions57, accruedTax57 / 2)`
8. `regimeTax57 = accruedTax57 - deduction57`
9. `totalPayment57 = contributions57 + regimeTax57 + reducedVat`
10. `netProfit57 = income - expenseBase - totalPayment57`

## УСН Доходы минус расходы, НДС 22%

1. `income = revenue`
2. `taxableIncome22 = income - outputVat22`
3. Для ИП:
   - `ipOnePercent22 = min(max((income - outputVat22 - (totalExpenses - inputVat22) - 57390 - employeeContributions - 300000) * 1%, 0), 321818)`
   - `contributions22 = employeeContributions + 57390 + ipOnePercent22`
   - для строки расходов Excel использует `contributions57` из блока НДС 5/7% (`G16 = G5 + G7 - G26`)
   Для ООО:
   - `contributions22 = employeeContributions`
4. `expenseBase = totalExpenses - employeeContributions`
5. `taxableExpense22 = min(expenseBase + contributions57 - inputVat22, income)` для ИП, `min(expenseBase + contributions22 - inputVat22, income)` для ООО
6. `minimumTax22 = taxableIncome22 * 1%`
7. `regularTax22 = (taxableIncome22 - taxableExpense22) * usnIncomeExpenseRate`
8. `regimeTax22 = max(regularTax22, minimumTax22)`
9. `totalPayment22 = contributions22 + regimeTax22 + vatPayable22`
10. `netProfit22 = income - expenseBase - totalPayment22`

## УСН Доходы минус расходы, НДС 5/7%

1. `income = revenue`
2. `taxableIncome57 = income - reducedVat`
3. Для ИП:
   - `ipOnePercent57 = min(max((income - reducedVat - totalExpenses - 57390 - employeeContributions - 300000) * 1%, 0), 321818)`
   - `contributions57 = employeeContributions + 57390 + ipOnePercent57`
   Для ООО:
   - `contributions57 = employeeContributions`
4. `expenseBase = totalExpenses - employeeContributions`
5. `taxableExpense57 = min(expenseBase + contributions57, income)`
6. `minimumTax57 = taxableIncome57 * 1%`
7. `regularTax57 = (taxableIncome57 - taxableExpense57) * usnIncomeExpenseRate`
8. `regimeTax57 = max(regularTax57, minimumTax57)`
9. `totalPayment57 = contributions57 + regimeTax57 + reducedVat`
10. `netProfit57 = income - expenseBase - totalPayment57`

## ОСНО

1. `income = revenue`
2. `taxableIncome = income - outputVat22`
3. Для ИП:
   - `ipOnePercent22 = min(max((taxableIncome - (totalExpenses - inputVat22) - 57390 - employeeContributions - 300000) * 1%, 0), 321818)`
   - `contributions = employeeContributions + 57390 + ipOnePercent22`
   Для ООО:
   - `contributions = employeeContributions`
4. `expenseBase = totalExpenses - employeeContributions`
5. `taxableExpense = expenseBase - inputVat22 + contributions`
6. `taxBase = taxableIncome - taxableExpense`
7. Для ИП: `regimeTax = round(progressiveNdfl(taxBase), 0)`
   Для ООО: `regimeTax = max(taxBase * 25%, 0)`
8. `totalPayment = contributions + vatPayable22 + regimeTax`
9. `netProfit = income - expenseBase - totalPayment`

## АУСН Доходы

1. Если `revenue > 60 000 000`, режим неприменим.
2. `income = revenue`
3. `expenseBase = totalExpenses`
4. `contributions = accidentContributions`
5. `regimeTax = income * 8%`
6. `totalPayment = contributions + regimeTax`
7. `netProfit = income - expenseBase - totalPayment`

## АУСН Доходы минус расходы

1. Если `revenue > 60 000 000`, режим неприменим.
2. `income = revenue`
3. `expenseBase = totalExpenses`
4. `contributions = accidentContributions`
5. `taxableIncome = income`
6. `taxableExpense = min(totalExpenses, income)`
7. `minimumTax = taxableIncome * 3%`
8. `regularTax = (taxableIncome - taxableExpense) * 20%`
9. `regimeTax = max(regularTax, minimumTax)`
10. `totalPayment = contributions + regimeTax`
11. `netProfit = income - expenseBase - totalPayment`

## Функция вычета УСН Доходы из Excel

Excel использует не классический `min(contributions, accruedTax * 50%)` во всех случаях.
Для ячеек ИП `C17`, `C22` и ООО `C15` логика такая:

```text
если есть сотрудники:
  если contributions >= accruedTax / 2:
    deduction = min(accruedTax, contributions) / 2
  иначе:
    deduction = min(accruedTax, contributions)
иначе:
  deduction = min(accruedTax, contributions)
```

Для ООО при НДС 5/7% ячейка `C20` использует:

```text
deduction = min(contributions, accruedTax / 2)
```

## Контрольные результаты из Excel при исходных данных файла

Входы: доход `21 000 000`, расходы `5 000 000`, покупки с НДС `5 000 000`, взносы сотрудников `0`, травматизм `2 959`, сотрудников нет, УСН `6%` и `15%`.

### ИП

- УСН Доходы 22%: всего к уплате `3 918 032.787`
- УСН Доходы 5/7%: всего к уплате `2 200 000`
- УСН Доходы минус расходы 22%: всего к уплате `5 006 850.242`
- УСН Доходы минус расходы 5/7%: всего к уплате `3 423 243.685`
- ОСНО 22%: всего к уплате `5 199 571.543`
- АУСН Доходы: всего к уплате `1 682 959`
- АУСН Доходы минус расходы: всего к уплате `3 202 959`

### ООО

- УСН Доходы 22%: всего к уплате `3 918 032.787`
- УСН Доходы 5/7%: всего к уплате `2 200 000`
- УСН Доходы минус расходы 22%: всего к уплате `4 852 459.016`
- УСН Доходы минус расходы 5/7%: всего к уплате `3 250 000`
- ОСНО 22%: всего к уплате `6 163 934.426`
- АУСН Доходы: всего к уплате `1 682 959`
- АУСН Доходы минус расходы: всего к уплате `3 202 959`
