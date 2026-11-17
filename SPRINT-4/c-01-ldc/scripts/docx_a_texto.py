"""Extrae el texto (parrafos y tablas) de un .docx usando solo la biblioteca estandar.

Uso: python3 -I docx_a_texto.py <archivo.docx> <salida.txt>
No ejecuta macros ni nada del documento: solo lee word/document.xml.
"""
import sys
import zipfile
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def texto_parrafo(p):
    partes = []
    for el in p.iter():
        if el.tag == W + "t" and el.text:
            partes.append(el.text)
        elif el.tag == W + "tab":
            partes.append("\t")
        elif el.tag == W + "br":
            partes.append("\n")
    return "".join(partes)


def main(ruta, salida):
    with zipfile.ZipFile(ruta) as z:
        nombres = z.namelist()
        raiz = ET.fromstring(z.read("word/document.xml"))
    cuerpo = raiz.find(W + "body")
    out = ["# Partes del zip: " + ", ".join(nombres), ""]
    n_tabla = 0
    for hijo in cuerpo:
        if hijo.tag == W + "p":
            t = texto_parrafo(hijo)
            if t.strip():
                out.append(t)
        elif hijo.tag == W + "tbl":
            n_tabla += 1
            out.append(f"[TABLA {n_tabla}]")
            for fila in hijo.iter(W + "tr"):
                celdas = []
                for c in fila.findall(W + "tc"):
                    celdas.append(" / ".join(texto_parrafo(p).strip() for p in c.iter(W + "p") if texto_parrafo(p).strip()))
                out.append(" | ".join(celdas))
            out.append(f"[FIN TABLA {n_tabla}]")
    with open(salida, "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print(f"tablas: {n_tabla}, lineas: {len(out)}")


main(sys.argv[1], sys.argv[2])
