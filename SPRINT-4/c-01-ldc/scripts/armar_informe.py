"""Arma el informe a partir de la plantilla y de los bloques calculados (todas las cifras salen de la medicion).

Uso: python3 -I armar_informe.py <plantilla.md> <bloques.json> <informe.md>
Cada marcador {{V.clave}} o {{B.clave}} de la plantilla se reemplaza por el valor calculado por generar_tablas.py.
Falla si algun marcador no existe o si queda alguno sin reemplazar.
"""
import json
import re
import sys

plantilla, bloques, salida = sys.argv[1:4]
datos = json.load(open(bloques, encoding="utf-8"))
texto = open(plantilla, encoding="utf-8").read()


def sustituir(m):
    grupo, clave = m.group(1), m.group(2)
    if clave not in datos[grupo]:
        raise SystemExit(f"marcador sin valor: {{{{{grupo}.{clave}}}}}")
    return str(datos[grupo][clave])


texto = re.sub(r"\{\{([VB])\.([A-Za-z0-9_]+)\}\}", sustituir, texto)
if "{{" in texto:
    raise SystemExit("quedan marcadores sin reemplazar")
open(salida, "w", encoding="utf-8").write(texto)
print("informe escrito:", salida, len(texto.splitlines()), "lineas")
