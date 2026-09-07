import re
import sys
import zipfile

path, sheet_xml, *refs = sys.argv[1:]
with zipfile.ZipFile(path) as zf:
    xml = zf.read(sheet_xml).decode("utf-8")
for ref in refs:
    match = re.search(r'<c[^>]* r="' + re.escape(ref) + r'"[\s\S]*?</c>', xml)
    print("---", ref)
    print(match.group(0) if match else "missing")
