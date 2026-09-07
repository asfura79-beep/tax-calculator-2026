import json
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
import zipfile


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


def qname(ns, tag):
    return f"{{{NS[ns]}}}{tag}"


def col_to_num(col):
    total = 0
    for ch in col:
        total = total * 26 + ord(ch) - 64
    return total


def cell_key(ref):
    match = re.match(r"^([A-Z]+)(\d+)$", ref)
    if not match:
        return (10**9, 10**9)
    return (int(match.group(2)), col_to_num(match.group(1)))


def text_of(element):
    return "".join(element.itertext()) if element is not None else ""


def dependencies(formula):
    if not formula:
        return []
    clean = re.sub(r'"[^"]*"', "", formula)
    refs = set()
    pattern = re.compile(
        r"(?:(?:'([^']+)'|([A-Za-zА-Яа-я0-9_ ]+))!)?\$?([A-Z]{1,3})\$?(\d+)(?::\$?([A-Z]{1,3})\$?(\d+))?"
    )
    for match in pattern.finditer(clean):
        sheet = match.group(1) or match.group(2)
        ref = f"{match.group(3)}{match.group(4)}"
        if match.group(5):
            ref += f":{match.group(5)}{match.group(6)}"
        refs.add(f"{sheet}!{ref}" if sheet else ref)
    return sorted(refs)


def load_shared_strings(zf):
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [text_of(si) for si in root.findall(qname("main", "si"))]


def load_sheets(zf):
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall(qname("pkgrel", "Relationship"))
    }
    sheets = []
    for sheet in workbook.find(qname("main", "sheets")):
        rid = sheet.attrib[qname("rel", "id")]
        target = rel_targets[rid]
        sheets.append(
            {
                "name": sheet.attrib["name"],
                "id": sheet.attrib["sheetId"],
                "target": posixpath.normpath(posixpath.join("xl", target)),
            }
        )
    return sheets


def cell_value(cell, shared_strings):
    cell_type = cell.attrib.get("t")
    value_node = cell.find(qname("main", "v"))
    if cell_type == "s" and value_node is not None:
        return shared_strings[int(value_node.text)]
    if cell_type == "inlineStr":
        return text_of(cell)
    return value_node.text if value_node is not None else ""


def analyze(workbook_path):
    with zipfile.ZipFile(workbook_path) as zf:
        shared_strings = load_shared_strings(zf)
        output = []
        for sheet in load_sheets(zf):
            root = ET.fromstring(zf.read(sheet["target"]))
            cells = []
            for cell in root.findall(".//main:c", NS):
                formula_node = cell.find(qname("main", "f"))
                formula = formula_node.text if formula_node is not None and formula_node.text else ""
                cells.append(
                    {
                        "ref": cell.attrib.get("r"),
                        "type": cell.attrib.get("t", ""),
                        "value": cell_value(cell, shared_strings),
                        "formula": formula,
                        "dependencies": dependencies(formula),
                    }
                )
            cells.sort(key=lambda item: cell_key(item["ref"]))
            output.append(
                {
                    "sheet": sheet["name"],
                    "target": sheet["target"],
                    "cellCount": len(cells),
                    "formulaCount": sum(1 for cell in cells if cell["formula"]),
                    "cells": cells,
                }
            )
    return output


def main():
    workbook_path = sys.argv[1]
    print(json.dumps(analyze(workbook_path), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
