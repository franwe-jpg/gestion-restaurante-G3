"""Vuelca el contenido de un .xlsx a texto (solo lectura, stdlib). Uso: python3 -I xlsx_a_texto.py <archivo.xlsx> <salida.txt>"""
import sys, zipfile, re
import xml.etree.ElementTree as ET
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
def col(ref):
    s = re.match(r"[A-Z]+", ref).group(0); n = 0
    for ch in s: n = n * 26 + ord(ch) - 64
    return n
with zipfile.ZipFile(sys.argv[1]) as z:
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            ss.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    rid = {r.get("Id"): r.get("Target") for r in rels}
    out = []
    for sh in wb.find("m:sheets", NS):
        nombre = sh.get("name"); destino = rid[sh.get("{%s}id" % NS["r"])]
        ruta = "xl/" + destino.lstrip("/").replace("xl/", "")
        out.append(f"##### HOJA: {nombre}")
        root = ET.fromstring(z.read(ruta))
        for row in root.iter("{%s}row" % NS["m"]):
            celdas = {}
            for c in row.findall("m:c", NS):
                t = c.get("t"); v = c.find("m:v", NS)
                if t == "s" and v is not None: val = ss[int(v.text)]
                elif t == "inlineStr": val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                else: val = v.text if v is not None else ""
                if val != "": celdas[col(c.get("r"))] = val.replace("\n", " ")
            if celdas:
                out.append(" | ".join(celdas.get(i, "") for i in range(1, max(celdas) + 1)))
open(sys.argv[2], "w", encoding="utf-8").write("\n".join(out) + "\n")
print(len(out), "lineas")
