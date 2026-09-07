import sys
import json
import re

from analyze_xlsx import analyze, cell_key


def col_to_num(col):
    total = 0
    for ch in col:
        total = total * 26 + ord(ch) - 64
    return total


def split_ref(ref):
    match = re.match(r"^([A-Z]+)(\d+)$", ref)
    return match.group(1), int(match.group(2))


def main():
    workbook_path = sys.argv[1]
    for sheet in analyze(workbook_path):
            cells = {item["ref"]: item for item in sheet["cells"]}
            formulas = [item for item in sheet["cells"] if item["formula"]]
            print(f"SHEET {sheet['sheet']} cells={len(cells)} formulas={len(formulas)}")
            for item in sorted(formulas, key=lambda x: cell_key(x["ref"])):
                col, row = split_ref(item["ref"])
                labels = []
                for offset in range(1, 4):
                    label_col_num = col_to_num(col) - offset
                    if label_col_num <= 0:
                        continue
                    n = label_col_num
                    label_col = ""
                    while n:
                        n, rem = divmod(n - 1, 26)
                        label_col = chr(65 + rem) + label_col
                    value = cells.get(f"{label_col}{row}", {}).get("value")
                    if value:
                        labels.append(value)
                print(
                    json.dumps(
                        {
                            "cell": item["ref"],
                            "labelsLeft": labels,
                            "value": item["value"],
                            "formula": item["formula"],
                            "dependencies": item["dependencies"],
                        },
                        ensure_ascii=False,
                    )
                )


if __name__ == "__main__":
    main()
