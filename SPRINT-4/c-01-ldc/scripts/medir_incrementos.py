"""Mide, con cloc 2.12, cuantas lineas de codigo de produccion sumo cada cambio de alcance.

Uso: python3 -I medir_incrementos.py <repo> <directorio-de-trabajo> <directorio-de-salida>

Para cada cambio de la lista INCREMENTOS exporta dos arboles con `git archive` (el commit base y
el commit final), corre `cloc --diff` dentro de un sandbox sin red (bubblewrap) y calcula el
crecimiento neto = lineas de codigo agregadas - lineas de codigo quitadas. Como control, repite el
calculo restando dos conteos absolutos (cloc sobre cada arbol) y comprueba que coinciden.

El filtro es el mismo que en medir-ldc.sh: solo backend/app y frontend/src, sin archivos
*.test.ts(x) ni la carpeta frontend/src/test, solo Python, TypeScript y CSS.
Cada fila toma el commit base como el primer padre del commit de integracion (merge) del PR.
"""

import csv
import json
import os
import shutil
import subprocess
import sys

CLOC = "cloc-2.12.pl"
FILTRO = [
    "--quiet",
    "--skip-uniqueness",
    "--json",
    "--include-lang=Python,TypeScript,CSS",
    r"--match-d=/(backend/app|frontend/src)(/|$)",
    r"--not-match-f=\.test\.tsx?$",
    "--exclude-dir=test,node_modules,.venv,dist,build,__pycache__",
]

# (id, grupo, descripcion, base, final)   base vacia = conteo absoluto del commit final
INCREMENTOS = [
    # Alcance agregado despues de la estimacion (no esta entre las 64 HU del Story Map)
    ("TR01-246", "Inicio de sesión y roles (HU-TR-01)", "PR #246 inicio de sesión y control de acceso por rol", "103bfae", "2799d58"),
    ("TR01-249", "Inicio de sesión y roles (HU-TR-01)", "PR #249 cualquier usuario con sesión lista los mozos", "e148aef", "0152156"),
    ("M4-12-248", "Producto listo en cocina (HU-M4-12)", "PR #248 marcar un producto como listo en cocina", "42a00a7", "e148aef"),
    ("S4-06-233", "Página de inicio (S4-06)", "PR #233 página de inicio con plano del local y caja del día", "1111dd1", "d77771f"),
    ("S4-03-232", "Selectores y enlaces de la comanda (S4-03)", "PR #232 selectores en la comanda y enlaces entre pantallas", "a145adb", "00ab5da"),
    ("S4-02-235", "Promociones en comanda y factura (S4-02)", "PR #235 aplica promociones en la comanda y la factura", "d77771f", "d88ce0d"),
    ("S4-04-244", "Mozo en la comanda (S4-04)", "PR #244 registrar el mozo en comandas", "66e416c", "103bfae"),
    ("S4-04-250", "Mozo en la comanda (S4-04)", "PR #250 cambiar el mozo de una comanda desde el listado", "0152156", "3b79713"),
    ("S4-08-directos", "Correcciones estéticas del frontend (S4-08)", "12 commits directos en develop (13/11): estilo común, modo oscuro, menú de sesión, rediseño", "3b79713", "2a218fb"),
    ("DEMO-9dfb249", "Datos de prueba y panel de credenciales", "commit directo: datos de prueba y reinicio de la base al levantar con Docker", "2407da2", "9dfb249"),
    ("DEMO-86bb44f", "Datos de prueba y panel de credenciales", "commit directo: panel de credenciales de prueba en el inicio de sesión", "9dfb249", "86bb44f"),
    # Los seis reportes (cada uno es un EO de 5 PF en la estimacion)
    ("REP-M1-15", "Reportes (6 EO estimados)", "PR #220 reporte productos más vendidos (HU-M1-15)", "9fed30b", "d3d05ff"),
    ("REP-M2-10", "Reportes (6 EO estimados)", "PR #237 reporte de impacto de promociones (HU-M2-10)", "d88ce0d", "e1c0a57"),
    ("REP-M3-13", "Reportes (6 EO estimados)", "PR #234 reporte de mesas atendidas y ventas por mozo (HU-M3-13)", "00ab5da", "1111dd1"),
    ("REP-M4-11", "Reportes (6 EO estimados)", "PR #247 reporte de comandas y ticket promedio (HU-M4-11)", "2799d58", "42a00a7"),
    ("REP-M5-07", "Reportes (6 EO estimados)", "PR #229 reporte de reservas y ausentismo (HU-M5-07)", "c2399f7", "79cff1b"),
    ("REP-M6-08", "Reportes (6 EO estimados)", "PR #241 reporte de recaudación y deuda pendiente (HU-M6-08)", "e0f4d24", "7cd2554"),
    # Conteos absolutos (base vacia)
    ("SNAP-S1-05", "Esqueletos", "esqueleto del backend integrado el 21/10 (merge del PR #153)", "", "7da27ca"),
    ("SNAP-S1-06", "Esqueletos", "esqueleto del frontend integrado el 21/10 (merge del PR #154)", "", "cfe670c"),
    ("SNAP-FINAL", "Control", "commit medido (origin/develop): debe coincidir con la medición principal", "", "86bb44f6fab07eac6c84a073fb165cde2c012e34"),
]


def correr(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def exportar(repo, rev, destino):
    os.makedirs(destino, exist_ok=True)
    # En los primeros commits todavia no existe una de las dos carpetas: se exporta solo la que haya.
    rutas = [r for r in ("backend", "frontend/src") if subprocess.run(["git", "-C", repo, "cat-file", "-e", f"{rev}:{r}"], capture_output=True).returncode == 0]
    git = subprocess.Popen(["git", "-C", repo, "archive", rev, "--", *rutas], stdout=subprocess.PIPE)
    subprocess.run(["tar", "-x", "-C", destino], stdin=git.stdout, check=True)
    git.stdout.close()
    if git.wait() != 0:
        raise RuntimeError("git archive fallo para " + rev)


def cloc(trabajo, herr, cwd, args):
    cmd = [
        "bwrap", "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin", "--symlink", "usr/lib", "/lib",
        "--symlink", "usr/lib64", "/lib64", "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
        "--unshare-all", "--die-with-parent", "--ro-bind", cwd, "/w", "--ro-bind", herr, "/herr",
        "--chdir", "/w", "perl", "/herr/" + CLOC, *args,
    ]
    return json.loads(correr(cmd).stdout)


def code(d, lang):
    return d.get(lang, {}).get("code", 0)


def main(repo, trabajo, salida):
    herr = os.path.join(trabajo, "herramienta")
    os.makedirs(os.path.join(salida, "incrementos"), exist_ok=True)
    filas = []
    for ident, grupo, desc, base, final in INCREMENTOS:
        raiz = os.path.join(trabajo, "inc", ident)
        shutil.rmtree(raiz, ignore_errors=True)
        exportar(repo, final, os.path.join(raiz, "head"))
        fila = {"id": ident, "grupo": grupo, "descripcion": desc, "base": base, "final": final}
        if base:
            exportar(repo, base, os.path.join(raiz, "base"))
            diff = cloc(trabajo, herr, raiz, [*FILTRO, "--diff", "base", "head"])
            abs_h = cloc(trabajo, herr, raiz, [*FILTRO, "head"])
            abs_b = cloc(trabajo, herr, raiz, [*FILTRO, "base"])
            with open(os.path.join(salida, "incrementos", ident + ".json"), "w", encoding="utf-8") as f:
                json.dump({"diff": diff, "absoluto_head": abs_h, "absoluto_base": abs_b}, f, ensure_ascii=False, indent=1)
            for lang, clave in (("Python", "py"), ("TypeScript", "ts"), ("CSS", "css")):
                agregadas = code(diff["added"], lang)
                quitadas = code(diff["removed"], lang)
                fila[clave + "_agregadas"] = agregadas
                fila[clave + "_quitadas"] = quitadas
                fila[clave + "_neto"] = agregadas - quitadas
                fila[clave + "_control_abs"] = code(abs_h, lang) - code(abs_b, lang)
        else:
            abs_h = cloc(trabajo, herr, raiz, [*FILTRO, "head"])
            with open(os.path.join(salida, "incrementos", ident + ".json"), "w", encoding="utf-8") as f:
                json.dump({"absoluto_head": abs_h}, f, ensure_ascii=False, indent=1)
            for lang, clave in (("Python", "py"), ("TypeScript", "ts"), ("CSS", "css")):
                fila[clave + "_absoluto"] = code(abs_h, lang)
        shutil.rmtree(raiz, ignore_errors=True)
        filas.append(fila)
        print(ident, {k: v for k, v in fila.items() if k not in ("grupo", "descripcion")})

    with open(os.path.join(salida, "incrementos.json"), "w", encoding="utf-8") as f:
        json.dump(filas, f, ensure_ascii=False, indent=1)

    # control: el neto por diff debe coincidir con la resta de conteos absolutos
    dif = [f["id"] for f in filas if "py_neto" in f and any(f[k + "_neto"] != f[k + "_control_abs"] for k in ("py", "ts", "css"))]
    with open(os.path.join(salida, "incrementos-verificacion.txt"), "w", encoding="utf-8") as f:
        f.write("Control: crecimiento neto por `cloc --diff` (agregadas - quitadas) frente a la resta de conteos absolutos.\n")
        f.write("Cambios con diferencia: " + (", ".join(dif) if dif else "ninguno (coinciden en Python, TypeScript y CSS)") + "\n")
        fin = next(x for x in filas if x["id"] == "SNAP-FINAL")
        f.write(f"Commit medido con el filtro de incrementos: Python={fin['py_absoluto']} TypeScript={fin['ts_absoluto']} CSS={fin['css_absoluto']}\n")
    print(open(os.path.join(salida, "incrementos-verificacion.txt"), encoding="utf-8").read())


if __name__ == "__main__":
    main(*sys.argv[1:4])
