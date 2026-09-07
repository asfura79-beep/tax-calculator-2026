import re
import sys

from analyze_xlsx import analyze


def col_to_num(col):
    total = 0
    for ch in col:
        total = total * 26 + ord(ch) - 64
    return total


def num_to_col(num):
    col = ""
    while num:
        num, rem = divmod(num - 1, 26)
        col = chr(65 + rem) + col
    return col


def split_ref(ref):
    match = re.match(r"^([A-Z]+)(\d+)$", ref)
    return match.group(1), int(match.group(2))


def main():
    workbook_path, sheet_name, range_spec = sys.argv[1:4]
    start, end = range_spec.split(":")
    start_col, start_row = split_ref(start)
    end_col, end_row = split_ref(end)
    sheets = {sheet["sheet"]: sheet for sheet in analyze(workbook_path)}
    sheet = sheets[sheet_name]
    cells = {item["ref"]: item for item in sheet["cells"]}
    columns = [num_to_col(i) for i in range(col_to_num(start_col), col_to_num(end_col) + 1)]
    print("\t".join(["row", *columns]))
    for row in range(start_row, end_row + 1):
        values = []
        for col in columns:
            item = cells.get(f"{col}{row}", {})
            formula = item.get("formula")
            value = item.get("value", "")
            text = f"={formula}" if formula else str(value or "")
            values.append(text.replace("\n", " "))
        print("\t".join([str(row), *values]))


if __name__ == "__main__":
    main()
