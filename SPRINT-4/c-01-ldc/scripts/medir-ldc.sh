#!/usr/bin/env bash
# Mide las LDC del commit indicado con cloc 2.12, dentro de un sandbox sin red.
# Uso: medir-ldc.sh <hash-del-commit> <ruta-del-repo> <directorio-de-trabajo-vacio> <directorio-de-salida>
# Requisitos: git, tar, perl, curl, sha256sum y bubblewrap (bwrap). Sin bwrap, ver "Cómo repetir" en el informe.
set -euo pipefail

COMMIT="${1:?falta el hash del commit}"
REPO="${2:?falta la ruta del repositorio}"
WORK="${3:?falta el directorio de trabajo}"
OUT="${4:?falta el directorio de salida}"
CLOC_VERSION="2.12"
CLOC_SHA256="621592d34f835ef178115a1643f15ebc8e73ec1d47b5484c46376fc15b78f03e"

mkdir -p "$WORK/arbol" "$WORK/herramienta" "$OUT"

# 1. Exporta el commit (no el directorio de trabajo) sin tocar el repositorio.
git -C "$REPO" archive "$COMMIT" | tar -x -C "$WORK/arbol"

# 2. Descarga cloc y verifica su suma SHA-256 (es la publicada por GitHub para esa version).
if [ ! -f "$WORK/herramienta/cloc-$CLOC_VERSION.pl" ]; then
  curl -sSL -o "$WORK/herramienta/cloc-$CLOC_VERSION.pl" \
    "https://github.com/AlDanial/cloc/releases/download/v$CLOC_VERSION/cloc-$CLOC_VERSION.pl"
fi
echo "$CLOC_SHA256  $WORK/herramienta/cloc-$CLOC_VERSION.pl" | sha256sum -c -

# 3. Sandbox sin red: solo lectura sobre el arbol y la herramienta; escritura solo en /salida.
cloc() {
  bwrap --ro-bind /usr /usr --symlink usr/bin /bin --symlink usr/lib /lib --symlink usr/lib64 /lib64 \
    --proc /proc --dev /dev --tmpfs /tmp --unshare-all --die-with-parent \
    --ro-bind "$WORK/arbol" /arbol --ro-bind "$WORK/herramienta" /herr --bind "$OUT" /salida \
    --chdir /arbol perl "/herr/cloc-$CLOC_VERSION.pl" "$@"
}

COMUN=(--quiet --skip-uniqueness --exclude-dir=node_modules,.venv,dist,build,__pycache__)
LANGS=(--include-lang=Python,TypeScript,CSS)

cloc --version > "$OUT/cloc-version.txt"

# 4. Medicion principal: una fila por archivo (la agrupacion por modulo se hace con agrupar_ldc.py).
cloc "${COMUN[@]}" "${LANGS[@]}" --by-file --csv --report-file=/salida/cloc-por-archivo.csv \
  backend/app backend/scripts backend/tests frontend/src

# 5. Contraverificacion: totales calculados por cloc directamente, sin pasar por la agrupacion.
cloc "${COMUN[@]}" "${LANGS[@]}" --report-file=/salida/cloc-control-backend-produccion.txt backend/app
cloc "${COMUN[@]}" "${LANGS[@]}" --report-file=/salida/cloc-control-backend-herramientas.txt backend/scripts
cloc "${COMUN[@]}" "${LANGS[@]}" --report-file=/salida/cloc-control-backend-pruebas.txt backend/tests
cloc "${COMUN[@]}" "${LANGS[@]}" --exclude-dir=test --not-match-f='\.test\.tsx?$' \
  --report-file=/salida/cloc-control-frontend-produccion.txt frontend/src
cloc "${COMUN[@]}" "${LANGS[@]}" --match-f='\.test\.tsx?$' \
  --report-file=/salida/cloc-control-frontend-pruebas-test-tsx.txt frontend/src
cloc "${COMUN[@]}" "${LANGS[@]}" --report-file=/salida/cloc-control-frontend-infraestructura-de-pruebas.txt frontend/src/test
cloc "${COMUN[@]}" "${LANGS[@]}" --report-file=/salida/cloc-control-frontend-total.txt frontend/src

# 6. Dato informativo (NO entra en la comparacion): migraciones de Alembic, excluidas por regla.
cloc "${COMUN[@]}" --include-lang=Python --report-file=/salida/cloc-informativo-migraciones-alembic.txt backend/alembic/versions

# 7. Cantidad de archivos del arbol por extension en el alcance (para el inventario).
echo "commit medido: $COMMIT" > "$OUT/commit.txt"
