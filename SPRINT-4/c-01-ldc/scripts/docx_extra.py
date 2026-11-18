"""Extrae ecuaciones (m:t), comentarios y metadatos de un .docx (solo lectura, stdlib).

Uso: python3 -I docx_extra.py <archivo.docx>
"""
import sys
import zipfile
import xml.etree.ElementTree as ET

M = "{http://schemas.openxmlformats.org/officeDocument/2006/math}"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

with zipfile.ZipFile(sys.argv[1]) as z:
    doc = ET.fromstring(z.read("word/document.xml"))
    print("== ECUACIONES (texto plano de m:oMath, en orden) ==")
    for i, om in enumerate(doc.iter(M + "oMath"), 1):
        print(i, "".join(t.text or "" for t in om.iter(M + "t")))
    print("== COMENTARIOS ==")
    c = ET.fromstring(z.read("word/comments.xml"))
    for com in c.iter(W + "comment"):
        txt = "".join(t.text or "" for t in com.iter(W + "t"))
        print(com.get(W + "author"), com.get(W + "date"), "|", txt)
    print("== core.xml ==")
    print(z.read("docProps/core.xml").decode("utf-8")[:1500])
    print("== ins/del (cambios con control) ==")
    print("ins:", len(list(doc.iter(W + "ins"))), "del:", len(list(doc.iter(W + "del"))))
