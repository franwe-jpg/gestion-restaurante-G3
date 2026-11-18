"""Genera las tablas y las cifras del informe a partir de los datos crudos.

Uso: python3 -I generar_tablas.py <directorio-crudos> <salida-bloques.json>

Lee agrupado-por-modulo.csv, detalle-compartido.csv, incrementos.json y los controles de cloc,
y escribe un JSON con bloques de texto (tablas en Markdown) y cifras formateadas en espanol
(punto para los miles, coma para los decimales). Tambien escribe tablas.md junto a los crudos.

Las cifras de la estimacion se transcriben del documento
`SPRINT-1/Estimación de Puntos de Función del proyecto (v2).docx`
(ver estimacion/estimacion-pf-v2.txt, tablas 7 y 9 y la formula de los PFA).
"""

import csv
import json
import os
import sys

# --- Estimacion previa (transcrita del documento; no se recalcula) ---------------------------
# Tabla 7 "Resumen de puntos de función": modulo, ILF, EIF, EI, EO, EQ, PFSA
TABLA_7 = [
    ("M1", "productos", "M1 – Carta", 2, 0, 12, 1, 2, 81),
    ("M2", "menus", "M2 – Menús y promociones", 2, 0, 9, 1, 0, 61),
    ("M3", "salon", "M3 – Sectores, mesas y mozos", 3, 0, 9, 1, 3, 83),
    ("M4", "atencion", "M4 – Clientes y comandas", 2, 0, 8, 1, 2, 65),
    ("M5", "reservas", "M5 – Reservas", 1, 0, 5, 1, 1, 39),
    ("M6", "pagos", "M6 – Facturación y cobros", 3, 0, 5, 1, 2, 63),
]
PFSA_TOTAL = 392
FI_TOTAL = 39
PFA_TOTAL = 407.68  # 392 x [0,65 + 0,01 x 39]
# Tabla 9 "Estimación de líneas de código": capa, reparto, PFA asignados (sin redondear = 45 %, 45 %, 10 %), LDC/PF, LDC
EST_FE, EST_BE, EST_BD = 8622.43, 5503.68, 611.52
EST_TOTAL = 14737.63  # el documento lo redondea a 14738
FACTOR_FE, FACTOR_BE, FACTOR_BD = 47, 30, 15
PFA_FE = PFA_TOTAL * 0.45
PFA_BE = PFA_TOTAL * 0.45
PFA_BD = PFA_TOTAL * 0.10

MODULOS = [("M1", "productos", "Productos y Carta"), ("M2", "menus", "Menús y Promociones"), ("M3", "salon", "Salón y Mozos"),
           ("M4", "atencion", "Atención al Público"), ("M5", "reservas", "Reservas"), ("M6", "pagos", "Pagos")]


# --- Formato ---------------------------------------------------------------------------------
def n(x):
    return f"{int(round(x)):,}".replace(",", ".")


def d(x, dec=1):
    s = f"{x:,.{dec}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".")


def sg(x):
    return ("+" if x >= 0 else "-") + n(abs(x))


def pct(x, dec=1):
    return ("+" if x >= 0 else "-") + d(abs(x), dec) + " %"


def fila(*celdas):
    return "| " + " | ".join(str(c) for c in celdas) + " |"


def tabla(encabezado, filas, alin=None):
    sep = ["---"] + ["---:" for _ in encabezado[1:]] if alin is None else alin
    return "\n".join([fila(*encabezado), fila(*sep), *[fila(*f) for f in filas]])


def main(crudos, salida):
    # --- Lectura -----------------------------------------------------------------------------
    datos = {}
    with open(os.path.join(crudos, "agrupado-por-modulo.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            datos[(r["ambito"], r["capa"], r["grupo"], r["lenguaje"])] = {k: int(r[k]) for k in ("archivos_con_lineas", "blank", "comment", "code", "no_vacias")}
    detalle = []
    with open(os.path.join(crudos, "detalle-compartido.csv"), encoding="utf-8") as f:
        for r in csv.DictReader(f):
            detalle.append(r)
    with open(os.path.join(crudos, "incrementos.json"), encoding="utf-8") as f:
        inc = {x["id"]: x for x in json.load(f)}

    def g(amb, capa, grupo, lang, campo="code"):
        return datos.get((amb, capa, grupo, lang), {}).get(campo, 0)

    def suma(amb, capa, lang, campo="code"):
        return sum(v[campo] for (a, c, _, l), v in datos.items() if a == amb and c == capa and l == lang)

    V = {}  # cifras formateadas para el texto
    B = {}  # bloques (tablas)
    C = {}  # cifras numericas (para verificacion)

    fe = suma("produccion", "frontend", "TypeScript")
    css = suma("produccion", "frontend", "CSS")
    be = suma("produccion", "backend", "Python")
    tot = fe + be
    tot_css = tot + css
    fe_nv, css_nv, be_nv = (suma("produccion", "frontend", "TypeScript", "no_vacias"), suma("produccion", "frontend", "CSS", "no_vacias"),
                            suma("produccion", "backend", "Python", "no_vacias"))
    pr_fe = suma("pruebas", "frontend", "TypeScript")
    pr_be = suma("pruebas", "backend", "Python")
    pr_tot = pr_fe + pr_be
    herr = g("herramientas", "backend", "scripts", "Python")
    C.update(fe=fe, css=css, be=be, tot=tot, tot_css=tot_css, pr_fe=pr_fe, pr_be=pr_be, pr_tot=pr_tot, herr=herr)

    # --- Tabla: LDC de produccion por modulo -------------------------------------------------
    filas = []
    for m, c, nombre in MODULOS:
        a, b = g("produccion", "frontend", c, "TypeScript"), g("produccion", "backend", c, "Python")
        filas.append((f"{m} {nombre} (`{c}/`)", n(a), n(b), n(a + b)))
    a, b = g("produccion", "frontend", "usuarios", "TypeScript"), g("produccion", "backend", "usuarios", "Python")
    filas.append(("Usuarios, inicio de sesión y roles (`usuarios/`, solo backend)", n(a), n(b), n(a + b)))
    a, b = g("produccion", "frontend", "compartido", "TypeScript"), g("produccion", "backend", "compartido", "Python")
    filas.append(("Compartido y raíz (`shared/`, `app/*.py`, `src/`)", n(a), n(b), n(a + b)))
    filas.append(("**Total de producción (Python y TypeScript/TSX)**", f"**{n(fe)}**", f"**{n(be)}**", f"**{n(tot)}**"))
    filas.append(("CSS (`frontend/src/index.css`), fila aparte", n(css), "-", n(css)))
    filas.append(("Total de producción incluyendo CSS", n(fe + css), n(be), n(tot_css)))
    B["t_modulos"] = tabla(("Módulo", "Frontend (TS/TSX)", "Backend (Python)", "Total"), filas)

    # --- Tabla: cifras por lenguaje y ambito ---------------------------------------------------
    def lin(nombre, amb, capa, lang):
        v = datos_ag(amb, capa, lang)
        return (nombre, n(v["archivos_con_lineas"]), n(v["blank"]), n(v["comment"]), n(v["code"]), n(v["no_vacias"]))

    def datos_ag(amb, capa, lang):
        out = {"archivos_con_lineas": 0, "blank": 0, "comment": 0, "code": 0, "no_vacias": 0}
        for (a, c, _, l), v in datos.items():
            if a == amb and c == capa and l == lang:
                for k in out:
                    out[k] += v[k]
        return out

    filas = [
        lin("Producción, frontend: TypeScript/TSX", "produccion", "frontend", "TypeScript"),
        lin("Producción, frontend: CSS", "produccion", "frontend", "CSS"),
        lin("Producción, backend: Python", "produccion", "backend", "Python"),
    ]
    tv = [datos_ag("produccion", "frontend", "TypeScript"), datos_ag("produccion", "backend", "Python")]
    filas.append(("**Producción, Python + TypeScript/TSX**", *[f"**{n(sum(x[k] for x in tv))}**" for k in ("archivos_con_lineas", "blank", "comment", "code", "no_vacias")]))
    filas += [
        lin("Herramientas, `backend/scripts/`: Python", "herramientas", "backend", "Python"),
        lin("Pruebas, frontend: TypeScript/TSX", "pruebas", "frontend", "TypeScript"),
        lin("Pruebas, backend: Python", "pruebas", "backend", "Python"),
    ]
    B["t_lenguaje"] = tabla(("Ámbito y lenguaje", "Archivos con líneas", "En blanco", "Comentarios", "Código (LDC)", "No vacías (comentarios + código)"), filas)

    # --- Tabla: desglose de lo compartido -----------------------------------------------------
    fe_sh = [(r["subgrupo"], int(r["archivos_con_lineas"]), int(r["code"])) for r in detalle if r["ambito"] == "produccion" and r["capa"] == "frontend" and r["lenguaje"] == "TypeScript"]
    # fila por area; la raiz de src se agrupa en una sola
    areas = {}
    for sub, a, c in fe_sh:
        clave = "Raíz de `src/` (`App.tsx`, `main.tsx`, `vite-env.d.ts`)" if sub.startswith("src/ raíz") else "`" + sub + "`"
        x = areas.setdefault(clave, [0, 0])
        x[0] += a
        x[1] += c
    descr = {
        "`shared/components/ui`": "biblioteca de componentes visuales (botón, tabla, diálogo, etc.)",
        "`shared/components/*.tsx`": "páginas y componentes comunes (`ComponentesPage`, `ReportesPage`, `Inicio`, páginas de error, etc.)",
        "`shared/components/inicio`": "página de inicio con plano del local y caja del día (S4-06)",
        "`shared/auth`": "inicio de sesión, sesión, guardas de ruta y permisos (HU-TR-01)",
        "`shared/components/layout`": "estructura general: barra superior, menú lateral, menú de sesión",
        "`shared/api`": "cliente HTTP común",
        "`shared/hooks`": "hooks comunes",
        "`shared/lib`": "utilidades",
        "`shared/types`": "tipos comunes",
    }
    filas = [(k, descr.get(k, "punto de entrada y configuración de la aplicación"), n(v[0]), n(v[1])) for k, v in sorted(areas.items(), key=lambda kv: -kv[1][1])]
    filas.append(("**Total frontend compartido (TS/TSX)**", "", f"**{n(sum(v[0] for v in areas.values()))}**", f"**{n(sum(v[1] for v in areas.values()))}**"))
    B["t_compartido_fe"] = tabla(("Carpeta", "Contenido", "Archivos con líneas", "LDC"), filas, ["---", "---", "---:", "---:"])
    be_sh = [(r["subgrupo"], int(r["archivos_con_lineas"]), int(r["code"])) for r in detalle if r["ambito"] == "produccion" and r["capa"] == "backend"]
    filas = [("`backend/" + s.replace("app/*.py (", "app/").replace(")", "") + "`" if s.startswith("app/*.py") else "`backend/" + s + "`", n(c) if c else "0 (solo comentarios)") for s, a, c in be_sh]
    filas.append(("**Total backend compartido**", f"**{n(sum(c for _, _, c in be_sh))}**"))
    B["t_compartido_be"] = tabla(("Archivo o carpeta", "LDC"), filas)

    # --- Tabla: pruebas por modulo -------------------------------------------------------------
    filas = []
    for m, c, nombre in MODULOS:
        a, b = g("pruebas", "frontend", c, "TypeScript"), g("pruebas", "backend", c, "Python")
        filas.append((f"{m} {nombre}", n(a), n(b), n(a + b)))
    a, b = g("pruebas", "frontend", "usuarios", "TypeScript"), g("pruebas", "backend", "usuarios", "Python")
    filas.append(("Usuarios, inicio de sesión y roles", n(a), n(b), n(a + b)))
    a, b = g("pruebas", "frontend", "compartido", "TypeScript"), g("pruebas", "backend", "compartido", "Python")
    filas.append(("Compartido y raíz (incluye `frontend/src/test/` y los `conftest.py`)", n(a), n(b), n(a + b)))
    b = g("pruebas", "backend", "scripts (pruebas de las herramientas)", "Python")
    filas.append(("Pruebas de las herramientas (`backend/tests/scripts/`)", "-", n(b), n(b)))
    filas.append(("**Total de pruebas**", f"**{n(pr_fe)}**", f"**{n(pr_be)}**", f"**{n(pr_tot)}**"))
    B["t_pruebas"] = tabla(("Módulo", "Frontend (`*.test.ts`, `*.test.tsx`)", "Backend (`tests/`)", "Total"), filas)

    # --- Herramientas ---------------------------------------------------------------------------
    B["t_herramientas_nota"] = f"`backend/scripts/`: 4 archivos con líneas (`cargar_datos_demo.py`, `crear_encargado.py`, `datos_demo.py`, `historial_demo.py`), {n(herr)} líneas de código."

    # --- Estimacion transcrita --------------------------------------------------------------------
    filas = [(nom, i, e, ei, eo, eq, pf) for _, _, nom, i, e, ei, eo, eq, pf in TABLA_7]
    filas.append(("**TOTAL**", "**13**", "**0**", "**48**", "**6**", "**10**", f"**{PFSA_TOTAL}**"))
    B["t_est_pf"] = tabla(("Módulo", "ILF", "EIF", "EI", "EO", "EQ", "PFSA"), filas)
    filas = [
        ("Frontend", "45 %", d(PFA_FE, 2), FACTOR_FE, d(EST_FE, 2)),
        ("Backend", "45 %", d(PFA_BE, 2), FACTOR_BE, d(EST_BE, 2)),
        ("Base de datos", "10 %", d(PFA_BD, 2), FACTOR_BD, d(EST_BD, 2)),
        ("**TOTAL**", "100 %", f"**{d(PFA_TOTAL, 2)}**", "", f"**{d(EST_TOTAL, 2)}**"),
    ]
    B["t_est_ldc"] = tabla(("Capa", "Reparto", "PFA asignados", "LDC/PF", "LDC"), filas)

    # --- Comparacion --------------------------------------------------------------------------------
    est_be_bd = EST_BE + EST_BD
    # modelos de datos del backend: models.py de cada modulo y app/shared/models (medidos en valores.json)
    with open(os.path.join(crudos, "valores.json"), encoding="utf-8") as f:
        val = json.load(f)
    models = val["be_modelos"]["code"]
    be_sin_modelos = be - models

    def comp(nombre, est, real):
        return (nombre, n(est), n(real), sg(real - est), pct((real - est) / est * 100))

    filas = [
        comp("Frontend (TypeScript/TSX) frente al 45 % del frontend", EST_FE, fe),
        comp("Backend (Python) frente al backend + la base de datos estimados", est_be_bd, be),
        comp("**Total de producción (Python + TypeScript/TSX)**", EST_TOTAL, tot),
        comp("Total de producción incluyendo CSS", EST_TOTAL, tot_css),
    ]
    B["t_comparacion"] = tabla(("Concepto", "LDC estimadas", "LDC finales (producción)", "Diferencia", "Variación"), filas)
    filas = [
        comp("Backend sin modelos de datos frente al backend estimado", EST_BE, be_sin_modelos),
        comp("Modelos de datos (`models.py`, `shared/models/`) frente a la base de datos estimada", EST_BD, models),
    ]
    B["t_comparacion_be"] = tabla(("Desglose informativo del backend", "LDC estimadas", "LDC finales", "Diferencia", "Variación"), filas)
    C.update(models=models, be_sin_modelos=be_sin_modelos)

    # --- Reparto y LDC por PF --------------------------------------------------------------------------
    filas = [
        ("Frontend", "45 %", d(fe / tot * 100) + " %"),
        ("Backend", "45 %", d(be / tot * 100) + " %"),
        ("Base de datos", "10 %", "no se mide aparte (los modelos están en el backend; ver nota)"),
    ]
    B["t_reparto"] = tabla(("Capa", "Reparto supuesto", "Reparto real (LDC de producción)"), filas, ["---", "---:", "---:"])
    filas = [
        ("Frontend (TypeScript/TSX)", FACTOR_FE, d(fe / PFA_FE), d(fe / PFA_FE / FACTOR_FE, 2) + "x"),
        ("Backend (Python), sobre el 45 % de los PFA", FACTOR_BE, d(be / PFA_BE), d(be / PFA_BE / FACTOR_BE, 2) + "x"),
        ("Backend + base de datos, sobre el 55 % de los PFA", d(est_be_bd / (PFA_BE + PFA_BD)), d(be / (PFA_BE + PFA_BD)), d(be / (PFA_BE + PFA_BD) / (est_be_bd / (PFA_BE + PFA_BD)), 2) + "x"),
        ("**Total (sobre 407,68 PFA)**", d(EST_TOTAL / PFA_TOTAL), d(tot / PFA_TOTAL), d(tot / PFA_TOTAL / (EST_TOTAL / PFA_TOTAL), 2) + "x"),
    ]
    B["t_ldc_pf"] = tabla(("Capa", "LDC/PF supuestas", "LDC/PF reales", "Real / supuesto"), filas)

    # --- Por modulo (cálculo propio, sin estimacion por modulo) -----------------------------------------
    filas = []
    for (m, c, nombre), (_, _, _, i, e, ei, eo, eq, pf) in zip(MODULOS, TABLA_7):
        pfa = pf * PFA_TOTAL / PFSA_TOTAL
        real = g("produccion", "frontend", c, "TypeScript") + g("produccion", "backend", c, "Python")
        filas.append((f"{m} {nombre}", pf, d(pfa, 2), n(real), d(real / pfa)))
    B["t_modulo_pf"] = tabla(("Módulo", "PFSA (documento)", "PFA (PFSA x 1,04)", "LDC de producción (frontend + backend del módulo)", "LDC por PFA"), filas)

    # --- Incrementos ---------------------------------------------------------------------------------------
    grupos = []
    orden = [
        ("Inicio de sesión y roles (HU-TR-01)", ["TR01-246", "TR01-249"], "issue #172; PR #246 y #249"),
        ("Página de inicio con plano del local y caja del día (S4-06)", ["S4-06-233"], "issue #213; PR #233"),
        ("Correcciones estéticas del frontend: estilo común, modo oscuro, menú de sesión, rediseño (S4-08)", ["S4-08-directos"], "issue #251; 12 commits directos en `develop`, sin PR"),
        ("Mozo en la comanda, selector y reasignación (S4-04)", ["S4-04-244", "S4-04-250"], "issue #225; PR #244 y #250"),
        ("Selectores en la comanda y enlaces entre pantallas (S4-03)", ["S4-03-232"], "issue #224; PR #232"),
        ("Producto listo en cocina (HU-M4-12)", ["M4-12-248"], "issue #242; PR #248"),
        ("Promociones aplicadas en la comanda y la factura (S4-02)", ["S4-02-235"], "issue #223; PR #235"),
        ("Panel de credenciales de prueba en el inicio de sesión", ["DEMO-86bb44f"], "commit directo `86bb44f`"),
    ]
    filas = []
    tot_py = tot_ts = tot_css_inc = 0
    ts_add = py_add = 0
    for nombre, ids, ev in orden:
        py = sum(inc[i]["py_neto"] for i in ids)
        ts = sum(inc[i]["ts_neto"] for i in ids)
        cs = sum(inc[i]["css_neto"] for i in ids)
        tot_py += py
        tot_ts += ts
        tot_css_inc += cs
        filas.append((nombre, n(ts), n(py), n(ts + py), ev))
    filas.append(("**Total del alcance no incluido**", f"**{n(tot_ts)}**", f"**{n(tot_py)}**", f"**{n(tot_ts + tot_py)}**", f"más {n(tot_css_inc)} de CSS (todas en S4-08)"))
    B["t_alcance"] = tabla(("Alcance no incluido en la estimación", "Frontend (TS/TSX)", "Backend (Python)", "Total", "Evidencia"), filas, ["---", "---:", "---:", "---:", "---"])
    C.update(add_ts=tot_ts, add_py=tot_py, add_css=tot_css_inc, add_tot=tot_ts + tot_py)

    reps = [("HU-M1-15 productos más vendidos", "REP-M1-15", "#220"), ("HU-M2-10 impacto de promociones", "REP-M2-10", "#237"),
            ("HU-M3-13 mesas atendidas y ventas por mozo", "REP-M3-13", "#234"), ("HU-M4-11 comandas y ticket promedio", "REP-M4-11", "#247"),
            ("HU-M5-07 reservas y ausentismo", "REP-M5-07", "#229"), ("HU-M6-08 recaudación y deuda pendiente", "REP-M6-08", "#241")]
    filas = []
    rt = rp = 0
    for nombre, i, pr in reps:
        ts, py = inc[i]["ts_neto"], inc[i]["py_neto"]
        rt += ts
        rp += py
        filas.append((nombre, pr, n(ts), n(py), n(ts + py)))
    filas.append(("**Total de los seis reportes**", "", f"**{n(rt)}**", f"**{n(rp)}**", f"**{n(rt + rp)}**"))
    B["t_reportes"] = tabla(("Reporte", "PR", "Frontend (TS/TSX)", "Backend (Python)", "Total"), filas)
    pfa_rep = 6 * 5 * PFA_TOTAL / PFSA_TOTAL
    C.update(rep_ts=rt, rep_py=rp, rep_tot=rt + rp, rep_pfa=pfa_rep)

    sk_be = inc["SNAP-S1-05"]["py_absoluto"]
    sk_fe = inc["SNAP-S1-06"]["ts_absoluto"]
    sk_css = inc["SNAP-S1-06"]["css_absoluto"]
    rest_fe = fe - sk_fe - tot_ts
    rest_be = be - sk_be - tot_py
    rest_css = css - sk_css - tot_css_inc
    filas = [
        ("Esqueleto integrado el 21/10 (PR #154 frontend, PR #153 backend), antes de la estimación", n(sk_fe), n(sk_be), n(sk_fe + sk_be)),
        ("Alcance no incluido en la estimación (tabla anterior)", n(tot_ts), n(tot_py), n(tot_ts + tot_py)),
        ("Resto, por diferencia (las HU estimadas, sus ajustes y los reportes)", n(rest_fe), n(rest_be), n(rest_fe + rest_be)),
        ("**Total de producción medido**", f"**{n(fe)}**", f"**{n(be)}**", f"**{n(tot)}**"),
    ]
    B["t_descomposicion"] = tabla(("Origen de las LDC de producción", "Frontend (TS/TSX)", "Backend (Python)", "Total"), filas)
    filas = [
        comp("Frontend: resto frente a la estimación del frontend", EST_FE, rest_fe),
        comp("Backend: resto frente a la estimación del backend + base de datos", est_be_bd, rest_be),
        comp("Total: resto frente a la estimación total", EST_TOTAL, rest_fe + rest_be),
    ]
    B["t_resto_vs_est"] = tabla(("Comparación solo del «resto»", "LDC estimadas", "LDC del resto", "Diferencia", "Variación"), filas)
    C.update(sk_fe=sk_fe, sk_be=sk_be, sk_css=sk_css, rest_fe=rest_fe, rest_be=rest_be, rest_css=rest_css)

    # --- Cifras en texto -------------------------------------------------------------------------------
    V.update(
        fe=n(fe), be=n(be), tot=n(tot), css=n(css), tot_css=n(tot_css), fe_nv=n(fe_nv), be_nv=n(be_nv), css_nv=n(css_nv), tot_nv=n(fe_nv + be_nv),
        pr_fe=n(pr_fe), pr_be=n(pr_be), pr_tot=n(pr_tot), herr=n(herr),
        est_total=n(EST_TOTAL), est_total_dec=d(EST_TOTAL, 2), est_fe=n(EST_FE), est_be=n(EST_BE), est_bd=n(EST_BD), est_be_bd=n(est_be_bd),
        dif_total=sg(tot - EST_TOTAL), pct_total=pct((tot - EST_TOTAL) / EST_TOTAL * 100), ratio_total=d(tot / EST_TOTAL, 2),
        dif_css=sg(tot_css - EST_TOTAL), pct_css=pct((tot_css - EST_TOTAL) / EST_TOTAL * 100),
        dif_fe=sg(fe - EST_FE), pct_fe=pct((fe - EST_FE) / EST_FE * 100), ratio_fe=d(fe / EST_FE, 2),
        dif_be=sg(be - est_be_bd), pct_be=pct((be - est_be_bd) / est_be_bd * 100),
        fe_pf=d(fe / PFA_FE), be_pf=d(be / PFA_BE), tot_pf=d(tot / PFA_TOTAL), est_pf=d(EST_TOTAL / PFA_TOTAL),
        rep_pf=d((rt + rp) / pfa_rep), rep_tot=n(rt + rp), rep_pfa=d(pfa_rep),
        add_tot=n(tot_ts + tot_py), add_ts=n(tot_ts), add_py=n(tot_py), add_css=n(tot_css_inc), add_pct=d((tot_ts + tot_py) / tot * 100),
        add_pct_fe=d(tot_ts / fe * 100), add_pct_gap=d((tot_ts + tot_py) / (tot - EST_TOTAL) * 100),
        sk_fe=n(sk_fe), sk_be=n(sk_be), sk_css=n(sk_css), rest_fe=n(rest_fe), rest_be=n(rest_be), rest_css=n(rest_css),
        rest_fe_pf=d(rest_fe / PFA_FE), rest_fe_pct=pct((rest_fe - EST_FE) / EST_FE * 100), rest_be_pct=pct((rest_be - est_be_bd) / est_be_bd * 100),
        rest_tot=n(rest_fe + rest_be), rest_tot_pct=pct((rest_fe + rest_be - EST_TOTAL) / EST_TOTAL * 100), rest_tot_dif=sg(rest_fe + rest_be - EST_TOTAL),
        models=n(models), be_sin_modelos=n(be_sin_modelos),
        share_fe=d(fe / tot * 100), share_be=d(be / tot * 100),
        tests_ratio=d(pr_tot / tot, 2), tests_ratio_fe=d(pr_fe / fe, 2), tests_ratio_be=d(pr_be / be, 2),
        files_fe=n(datos_ag("produccion", "frontend", "TypeScript")["archivos_con_lineas"]), files_be=n(datos_ag("produccion", "backend", "Python")["archivos_con_lineas"]),
        ldc_file_fe=d(fe / datos_ag("produccion", "frontend", "TypeScript")["archivos_con_lineas"], 0), ldc_file_be=d(be / datos_ag("produccion", "backend", "Python")["archivos_con_lineas"], 0),
        diff_resto_fe=sg(rest_fe - EST_FE), diff_resto_be=sg(rest_be - est_be_bd),
        abs_resto_fe=n(abs(rest_fe - EST_FE)), abs_resto_be=n(abs(rest_be - est_be_bd)),
    )
    with open(os.path.join(crudos, "conteos-complementarios.json"), encoding="utf-8") as f:
        ex = json.load(f)
    expl = sk_fe + sk_be + tot_ts + tot_py
    brecha = tot - EST_TOTAL
    com = datos_ag("produccion", "frontend", "TypeScript")["comment"] + datos_ag("produccion", "backend", "Python")["comment"]
    V.update(
        skel_tot=n(sk_fe + sk_be), expl_tot=n(expl), expl_pct=d(expl / brecha * 100), unexpl_tot=n(brecha - expl), unexpl_pct=d((brecha - expl) / brecha * 100),
        brecha=n(brecha), comentarios=n(com), comentarios_pct=d(com / tot * 100),
        tot_con_pruebas=n(tot + pr_tot), ratio_con_pruebas=d((tot + pr_tot) / EST_TOTAL, 2),
        class_n=n(ex["className_ocurrencias_prod"]), class_files=n(ex["className_archivos_prod"]), jsx_com=n(ex["comentarios_jsx_prod"]),
        docstr=n(ex["py_app_lineas_que_abren_docstring"]), vacios=n(ex["archivos_de_codigo_vacios_no_contados"]), archivos_alcance=n(ex["archivos_de_codigo_en_alcance"]),
        ratio_fe_vs_be_real=d((fe / PFA_FE) / (be / PFA_BE), 1), ratio_fe_vs_be_sup=d(FACTOR_FE / FACTOR_BE, 1),
        rest_share_fe=d(rest_fe / (rest_fe + rest_be) * 100), rest_share_be=d(rest_be / (rest_fe + rest_be) * 100),
        fe_shared=n(g("produccion", "frontend", "compartido", "TypeScript")), fe_shared_pct=d(g("produccion", "frontend", "compartido", "TypeScript") / fe * 100),
        be_bd_pf=d(be / (PFA_BE + PFA_BD)), est_be_bd_pf=d(est_be_bd / (PFA_BE + PFA_BD)), be_extra=n(sk_be + tot_py),
        tot_nv_css=n(fe_nv + be_nv + css_nv), fe_gap_pct=d((fe - EST_FE) / (tot - EST_TOTAL) * 100),
    )
    C.update(expl=expl, brecha=brecha)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump({"V": V, "B": B, "C": C}, f, ensure_ascii=False, indent=1)
    with open(os.path.join(crudos, "tablas.md"), "w", encoding="utf-8") as f:
        for k, v in B.items():
            f.write(f"<!-- {k} -->\n{v}\n\n")
    print(json.dumps(C, ensure_ascii=False))
    print(json.dumps(V, ensure_ascii=False, indent=0)[:3000])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
