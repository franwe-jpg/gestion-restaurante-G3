"""Conteos complementarios sobre el arbol exportado (no son LDC; sirven para acotar los casos que cloc no distingue).

Uso: python3 -I contar_extras.py <arbol-exportado> <salida.json>
"""
import json
import os
import re
import sys


def archivos(raiz, sub, extensiones):
    for d, _, fs in os.walk(os.path.join(raiz, sub)):
        for n in fs:
            if n.endswith(extensiones):
                yield os.path.join(d, n)


def es_prueba_fe(ruta):
    return ruta.endswith((".test.ts", ".test.tsx")) or "/frontend/src/test/" in ruta


def main(arbol, salida):
    r = {}
    fe = [p for p in archivos(arbol, "frontend/src", (".ts", ".tsx")) if not es_prueba_fe(p)]
    r["fe_prod_archivos_ts"] = len(fe)
    clase = [len(re.findall(r"className=", open(p, encoding="utf-8").read())) for p in fe]
    r["className_ocurrencias_prod"] = sum(clase)
    r["className_archivos_prod"] = sum(1 for c in clase if c)
    r["comentarios_jsx_prod"] = sum(len(re.findall(r"\{/\*", open(p, encoding="utf-8").read())) for p in fe)
    py_app = list(archivos(arbol, "backend/app", (".py",)))
    r["py_app_archivos"] = len(py_app)
    r["py_app_lineas_que_abren_docstring"] = sum(
        len(re.findall(r'^\s*"""', open(p, encoding="utf-8").read(), re.M)) for p in py_app
    )
    r["py_app_asignaciones_triple_comilla"] = sum(
        len(re.findall(r'(=|\()\s*[rfb]?"""', open(p, encoding="utf-8").read())) for p in py_app
    )
    marcas = re.compile(r"generated|DO NOT EDIT", re.I)
    r["archivos_con_marca_de_codigo_generado"] = [
        os.path.relpath(p, arbol)
        for p in [*archivos(arbol, "backend/app", (".py",)), *archivos(arbol, "frontend/src", (".ts", ".tsx", ".css"))]
        if marcas.search(open(p, encoding="utf-8").read())
    ]
    ambito = [p for sub, ext in (("backend/app", ".py"), ("backend/scripts", ".py"), ("backend/tests", ".py"),
                                 ("frontend/src", (".ts", ".tsx", ".css"))) for p in archivos(arbol, sub, ext)]
    r["archivos_de_codigo_en_alcance"] = len(ambito)
    r["archivos_de_codigo_vacios_no_contados"] = sum(1 for p in ambito if os.path.getsize(p) == 0)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(r, f, ensure_ascii=False, indent=1)
    print(json.dumps(r, ensure_ascii=False, indent=1))


main(sys.argv[1], sys.argv[2])
