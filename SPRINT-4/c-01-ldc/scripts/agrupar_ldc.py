"""Agrupa la salida por archivo de cloc (cloc-por-archivo.csv) por ambito, capa y modulo.

Uso: python3 -I agrupar_ldc.py <cloc-por-archivo.csv> <directorio-de-salida>

Genera en el directorio de salida:
  agrupado-por-modulo.csv      una fila por (ambito, capa, grupo, lenguaje)
  detalle-compartido.csv       desglose de lo compartido y de la raiz
  valores.json                 cifras clave que usa el informe
  tablas.md                    las tablas del informe, ya calculadas
  verificacion.txt             comparacion contra los totales que calcula cloc directamente

Reglas de clasificacion (ruta relativa a la raiz del repositorio):
  - backend/app/**            produccion, backend (modulo = backend/app/modules/<modulo>/)
  - backend/scripts/**        herramientas
  - backend/tests/**          pruebas, backend
  - frontend/src/test/**      pruebas, frontend (infraestructura de pruebas)
  - frontend/src/**/*.test.ts y *.test.tsx   pruebas, frontend
  - resto de frontend/src/**  produccion, frontend (modulo = frontend/src/modules/<modulo>/)
"""

import csv
import json
import os
import sys
from collections import defaultdict

MODULOS = [
    ("M1", "productos", "Productos y Carta"),
    ("M2", "menus", "Menús y Promociones"),
    ("M3", "salon", "Salón y Mozos"),
    ("M4", "atencion", "Atención al Público"),
    ("M5", "reservas", "Reservas"),
    ("M6", "pagos", "Pagos"),
]
NOMBRES_MODULO = {c: (m, n) for m, c, n in MODULOS}


def clasificar(ruta):
    """Devuelve (ambito, capa, grupo, subgrupo) para una ruta del repositorio."""
    p = ruta.split("/")
    if p[0] == "backend":
        if p[1] == "app":
            if p[2] == "modules":
                return "produccion", "backend", p[3], "/".join(p[3:])
            if p[2] == "shared":
                return "produccion", "backend", "compartido", "app/shared/" + (p[3] if len(p) > 4 else p[3])
            return "produccion", "backend", "compartido", "app/*.py (" + p[2] + ")"
        if p[1] == "scripts":
            return "herramientas", "backend", "scripts", ruta
        if p[1] == "tests":
            if p[2] == "modules":
                return "pruebas", "backend", p[3], ruta
            if p[2] == "scripts":
                return "pruebas", "backend", "scripts (pruebas de las herramientas)", "tests/scripts"
            if p[2] == "shared":
                return "pruebas", "backend", "compartido", "tests/shared"
            return "pruebas", "backend", "compartido", "tests/ raíz (conftest.py y pruebas de app/*.py)"
    if p[0] == "frontend" and p[1] == "src":
        es_prueba = p[2] == "test" or ruta.endswith(".test.ts") or ruta.endswith(".test.tsx")
        ambito = "pruebas" if es_prueba else "produccion"
        if p[2] == "test":
            return ambito, "frontend", "compartido", "src/test (infraestructura de pruebas)"
        if p[2] == "modules":
            return ambito, "frontend", p[3], "/".join(p[3:])
        if p[2] == "shared":
            if len(p) > 5 and p[3] == "components":
                sub = "shared/components/" + p[4]
            elif len(p) > 4 and p[3] == "components":
                sub = "shared/components/*.tsx"
            else:
                sub = "shared/" + p[3]
            return ambito, "frontend", "compartido", sub
        return ambito, "frontend", "compartido", "src/ raíz (" + p[2] + ")"
    raise ValueError("ruta fuera del alcance: " + ruta)


def leer(ruta_csv):
    filas = []
    with open(ruta_csv, encoding="utf-8", newline="") as f:
        lector = csv.reader(f)
        next(lector)  # encabezado
        for r in lector:
            if not r or r[0] == "SUM":
                continue
            lang, archivo, blank, comment, code = r[0], r[1], int(r[2]), int(r[3]), int(r[4])
            filas.append((lang, archivo, blank, comment, code))
    return filas


def sumar(filas, filtro):
    n = b = c = k = 0
    for lang, archivo, blank, comment, code in filas:
        amb, capa, grupo, sub = clasificar(archivo)
        if filtro(lang, amb, capa, grupo, sub, archivo):
            n += 1
            b += blank
            c += comment
            k += code
    return {"archivos": n, "blank": b, "comment": c, "code": k, "no_vacias": c + k}


def fmt(n):
    return f"{n:,}".replace(",", ".")


def main(ruta_csv, salida):
    filas = leer(ruta_csv)
    os.makedirs(salida, exist_ok=True)

    # 1. Agrupado largo
    acum = defaultdict(lambda: {"archivos": 0, "blank": 0, "comment": 0, "code": 0})
    for lang, archivo, blank, comment, code in filas:
        amb, capa, grupo, _ = clasificar(archivo)
        a = acum[(amb, capa, grupo, lang)]
        a["archivos"] += 1
        a["blank"] += blank
        a["comment"] += comment
        a["code"] += code
    with open(os.path.join(salida, "agrupado-por-modulo.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ambito", "capa", "grupo", "lenguaje", "archivos_con_lineas", "blank", "comment", "code", "no_vacias"])
        for k in sorted(acum):
            a = acum[k]
            w.writerow([*k, a["archivos"], a["blank"], a["comment"], a["code"], a["comment"] + a["code"]])

    # 2. Detalle de lo compartido
    det = defaultdict(lambda: {"archivos": 0, "blank": 0, "comment": 0, "code": 0})
    for lang, archivo, blank, comment, code in filas:
        amb, capa, grupo, sub = clasificar(archivo)
        if grupo == "compartido":
            a = det[(amb, capa, sub, lang)]
            a["archivos"] += 1
            a["blank"] += blank
            a["comment"] += comment
            a["code"] += code
    with open(os.path.join(salida, "detalle-compartido.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ambito", "capa", "subgrupo", "lenguaje", "archivos_con_lineas", "blank", "comment", "code", "no_vacias"])
        for k in sorted(det):
            a = det[k]
            w.writerow([*k, a["archivos"], a["blank"], a["comment"], a["code"], a["comment"] + a["code"]])

    # 3. Cifras clave
    def prod(capa, grupo=None, lang=None):
        return sumar(
            filas,
            lambda l, am, cp, gr, sb, ar: am == "produccion"
            and cp == capa
            and (grupo is None or gr == grupo)
            and (lang is None or l == lang),
        )

    def pru(capa, grupo=None):
        return sumar(filas, lambda l, am, cp, gr, sb, ar: am == "pruebas" and cp == capa and (grupo is None or gr == grupo))

    v = {}
    v["fe_ts"] = prod("frontend", lang="TypeScript")
    v["fe_css"] = prod("frontend", lang="CSS")
    v["be_py"] = prod("backend", lang="Python")
    v["herramientas"] = sumar(filas, lambda l, am, cp, gr, sb, ar: am == "herramientas")
    v["pruebas_fe"] = pru("frontend")
    v["pruebas_be"] = pru("backend")
    v["prod_total_sin_css"] = {
        k: v["fe_ts"][k] + v["be_py"][k] for k in ("archivos", "blank", "comment", "code", "no_vacias")
    }
    v["prod_total_con_css"] = {
        k: v["prod_total_sin_css"][k] + v["fe_css"][k] for k in ("archivos", "blank", "comment", "code", "no_vacias")
    }
    v["pruebas_total"] = {k: v["pruebas_fe"][k] + v["pruebas_be"][k] for k in ("archivos", "blank", "comment", "code", "no_vacias")}
    v["total_archivos_cloc"] = len(filas)

    # Modelos de datos (capa "base de datos" del documento de estimacion): models.py de cada modulo y app/shared/models
    v["be_modelos"] = sumar(
        filas,
        lambda l, am, cp, gr, sb, ar: am == "produccion"
        and cp == "backend"
        and (ar.endswith("/models.py") or "/shared/models/" in ar),
    )
    v["be_sin_modelos"] = {k: v["be_py"][k] - v["be_modelos"][k] for k in ("archivos", "blank", "comment", "code", "no_vacias")}

    por_modulo = {}
    for m, c, n in MODULOS:
        por_modulo[c] = {
            "id": m,
            "nombre": n,
            "fe": prod("frontend", c, "TypeScript"),
            "be": prod("backend", c, "Python"),
            "pr_fe": pru("frontend", c),
            "pr_be": pru("backend", c),
        }
    por_modulo["usuarios"] = {
        "id": "-",
        "nombre": "Usuarios (autenticación y roles)",
        "fe": prod("frontend", "usuarios", "TypeScript"),
        "be": prod("backend", "usuarios", "Python"),
        "pr_fe": pru("frontend", "usuarios"),
        "pr_be": pru("backend", "usuarios"),
    }
    v["por_modulo"] = por_modulo
    v["compartido"] = {
        "fe": prod("frontend", "compartido", "TypeScript"),
        "css": prod("frontend", "compartido", "CSS"),
        "be": prod("backend", "compartido", "Python"),
        "pr_fe": pru("frontend", "compartido"),
        "pr_be": pru("backend", "compartido"),
    }
    # Modulos no esperados (carpetas que no estan en la lista M1-M6 ni son usuarios/compartido)
    esperados = {c for _, c, _ in MODULOS} | {"usuarios", "compartido", "scripts", "scripts (pruebas de las herramientas)"}
    otros = sorted({clasificar(a)[2] for _, a, *_ in filas} - esperados)
    v["otros_grupos"] = otros

    with open(os.path.join(salida, "valores.json"), "w", encoding="utf-8") as f:
        json.dump(v, f, ensure_ascii=False, indent=2)

    # 4. Verificacion contra los controles de cloc (se leen de los archivos que genero medir-ldc.sh)
    dir_crudos = os.path.dirname(os.path.abspath(ruta_csv))

    def control(nombre, lang="SUM:"):
        with open(os.path.join(dir_crudos, nombre), encoding="utf-8") as f:
            for linea in f:
                partes = linea.split()
                if partes and linea.startswith(lang):
                    return int(partes[-1])
        raise ValueError(f"{lang} no encontrado en {nombre}")

    def es_prueba_test(ar):
        return ar.endswith(".test.ts") or ar.endswith(".test.tsx")

    solo_test = sumar(filas, lambda l, am, cp, gr, sb, ar: cp == "frontend" and es_prueba_test(ar))["code"]
    infra = sumar(filas, lambda l, am, cp, gr, sb, ar: ar.startswith("frontend/src/test/"))["code"]
    total_fe = sumar(filas, lambda l, am, cp, gr, sb, ar: cp == "frontend")["code"]
    ctl = {
        "backend produccion (backend/app)": (v["be_py"]["code"], control("cloc-control-backend-produccion.txt")),
        "backend herramientas (backend/scripts)": (v["herramientas"]["code"], control("cloc-control-backend-herramientas.txt")),
        "backend pruebas (backend/tests)": (v["pruebas_be"]["code"], control("cloc-control-backend-pruebas.txt")),
        "frontend produccion TypeScript": (v["fe_ts"]["code"], control("cloc-control-frontend-produccion.txt", "TypeScript")),
        "frontend produccion CSS": (v["fe_css"]["code"], control("cloc-control-frontend-produccion.txt", "CSS")),
        "frontend pruebas *.test.ts(x)": (solo_test, control("cloc-control-frontend-pruebas-test-tsx.txt")),
        "frontend src/test (infraestructura; incluye setup.test.tsx)": (infra, control("cloc-control-frontend-infraestructura-de-pruebas.txt")),
        "frontend src total (produccion + pruebas)": (total_fe, control("cloc-control-frontend-total.txt")),
    }
    lineas = ["Comparación de la agrupación (agrupar_ldc.py) contra los totales de los controles de cloc (líneas de código):", ""]
    ok = True
    for nombre, (calculado, ctrl) in ctl.items():
        estado = "OK" if calculado == ctrl else "DIFIERE"
        ok = ok and calculado == ctrl
        lineas.append(f"{estado:8} {nombre}: agrupación={calculado} control_cloc={ctrl}")
    lineas.append("")
    lineas.append("RESULTADO: " + ("todas las cifras coinciden" if ok else "HAY DIFERENCIAS"))
    with open(os.path.join(salida, "verificacion.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(lineas) + "\n")
    print("\n".join(lineas))
    print("grupos no esperados:", otros)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
