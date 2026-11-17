# Parte 1. Métricas de LDC

Informe de cierre del Grupo 3 · ISFPP 2026 · Ingeniería de Software III, UNPSJB. Issue #228 (C-01), parte 1. Fecha de la medición: 17/11/2026.

La consigna de la cátedra pide «medir o calcular las Líneas de Código finales del software concluido, comparándolas con la estimación previa de PF/LDC y justificando las variaciones encontradas» (`material-catedra/propuesta-ISFPP-2026.pdf`, sección «Cierre y Evaluación Post-Desarrollo»).

## 1. Resumen

| Dato | Valor |
| --- | --- |
| Commit medido | `86bb44f6fab07eac6c84a073fb165cde2c012e34` (`origin/develop`, 14/11/2026 14:46 -03) |
| Herramienta | cloc 2.12 |
| LDC finales de producción, frontend (TypeScript/TSX) | 24.053 |
| LDC finales de producción, backend (Python) | 6.602 |
| **LDC finales de producción, total** | **30.655** |
| CSS, fila aparte | 206 |
| **LDC estimadas (documento de estimación v2)** | **14.738** (14.737,63 sin redondear; 407,68 PFA) |
| **Diferencia** | **+15.917 LDC (+108,0 %)**: el código final es 2,08 veces la estimación |
| Variación por capa | frontend +179,0 %; backend +8,0 % |
| Pruebas (aparte, no entran en la comparación) | 42.925 LDC |

La variación se concentra en el frontend. La evidencia disponible explica 11.528 de las 15.917 LDC de diferencia (72,4 %): 3.925 LDC del esqueleto compartido que ya existía el 21/10 y 7.603 LDC de alcance y refinamientos que no figuran en el conteo de PF (inicio de sesión y roles, página de inicio, rediseño estético, entre otros). Quedan 4.389 LDC (27,6 %) sin explicación comprobable: descontados el esqueleto y ese alcance, el frontend queda 4.956 LDC por encima de lo estimado y el backend 566 LDC por debajo. La sección 7 detalla cada punto y marca como «Hipótesis» lo que no se pudo comprobar.

## 2. Método y herramienta

### 2.1 Qué se midió

- Se midió el commit exacto de `origin/develop` (`git fetch origin` y `git rev-parse origin/develop` dieron `86bb44f6fab07eac6c84a073fb165cde2c012e34`), no el directorio de trabajo. El árbol se exportó con `git archive <hash> | tar -x` a un directorio temporal, sin tocar el repositorio.
- `origin/main` no tiene diferencias de código con ese commit en `backend/app/` ni `frontend/src/` (`git diff --stat origin/develop origin/main -- backend/app frontend/src` no devuelve cambios).
- Las **líneas de código** son la columna `code` de cloc: no incluyen líneas en blanco ni comentarios. Como dato aparte se informa el total de **líneas físicas no vacías** (comentarios más código).

### 2.2 Herramienta

- **cloc 2.12** (https://github.com/AlDanial/cloc), archivo `cloc-2.12.pl`, SHA-256 `621592d34f835ef178115a1643f15ebc8e73ec1d47b5484c46376fc15b78f03e`. Es la suma que GitHub publica para esa versión de la herramienta (publicada el 13/11/2026).
- En el equipo de trabajo no había `cloc` ni Docker utilizable (la integración de WSL con Docker Desktop no estaba activa), de modo que no se usó un contenedor. Para no instalar nada en el equipo, `cloc` se ejecutó como un único archivo Perl desde un directorio temporal, dentro de un entorno aislado de bubblewrap (`bwrap`): sin red, con el árbol y la herramienta montados en modo de solo lectura, y con escritura únicamente en el directorio de salida. Los comandos y la salida de cada paso están guardados en `c-01-ldc/`.

### 2.3 Comandos exactos

Medición principal (se ejecuta desde la raíz del árbol exportado; la línea completa, con el aislamiento, está en `c-01-ldc/scripts/medir-ldc.sh`):

```bash
perl cloc-2.12.pl --quiet --skip-uniqueness \
  --exclude-dir=node_modules,.venv,dist,build,__pycache__ \
  --include-lang=Python,TypeScript,CSS \
  --by-file --csv --report-file=cloc-por-archivo.csv \
  backend/app backend/scripts backend/tests frontend/src
```

- `--skip-uniqueness` hace que cloc cuente también los archivos con contenido idéntico (por omisión los ignora).
- La agrupación por ámbito (producción, herramientas, pruebas) y por módulo la hace `c-01-ldc/scripts/agrupar_ldc.py` a partir de esa salida, según la ruta de cada archivo.

Control independiente: `medir-ldc.sh` vuelve a correr cloc sobre cada ámbito y compara sus totales con la agrupación (por ejemplo, producción del frontend con `--exclude-dir=test --not-match-f='\.test\.tsx?$' frontend/src`). Todas las comparaciones coinciden (`c-01-ldc/crudos/verificacion.txt`).

### 2.4 Casos que la herramienta no distingue bien

- **Cadenas de documentación de Python (docstrings).** cloc las cuenta como comentarios. En `backend/app/` hay 448 líneas que abren un docstring. No hay cadenas de triple comilla asignadas a variables, que serían el caso ambiguo.
- **Comentarios JSX** (`{/* ... */}` dentro de un componente): cloc los cuenta como código. Hay 10 en el código de producción del frontend (menos del 0,1 % de las LDC).
- **TSX.** cloc cuenta los archivos `.tsx` dentro de «TypeScript»: no se pueden separar de los `.ts` sin otra regla. El informe los llama «TypeScript/TSX».
- **Archivos vacíos.** 20 archivos Python (en su mayoría `__init__.py`) tienen cero líneas y no aparecen en la salida de cloc. De los 690 archivos de código del alcance, el resto sí figura.
- **Código generado.** No hay marcas de código generado (`generated`, `DO NOT EDIT`) en `backend/app/` ni en `frontend/src/` (`c-01-ldc/crudos/conteos-complementarios.json`).

## 3. Alcance y exclusiones

### 3.1 Qué se cuenta

| Ámbito | Carpetas | Tratamiento |
| --- | --- | --- |
| Producción, backend | `backend/app/` | Por módulo (`backend/app/modules/<módulo>/`); lo compartido es `backend/app/shared/` y `backend/app/*.py`. |
| Producción, frontend | `frontend/src/` sin pruebas | Por módulo (`frontend/src/modules/<módulo>/`); lo compartido es `frontend/src/shared/` y la raíz de `frontend/src/`. El CSS va en una fila aparte. |
| Herramientas | `backend/scripts/` | Aparte; no entran en la comparación con la estimación. |
| Pruebas | `backend/tests/` (incluye `conftest.py`), `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx` y `frontend/src/test/` (preparación de las pruebas) | Aparte; la estimación es de código de producción. |

Los módulos son los seis de `AGENTS.md` (M1 `productos`, M2 `menus`, M3 `salon`, M4 `atencion`, M5 `reservas`, M6 `pagos`). Existe además `backend/app/modules/usuarios/` (inicio de sesión y roles), que no figura en la estimación. No hay una carpeta `reportes`: cada reporte vive en su módulo, y la página común de reportes está en `frontend/src/shared/components/`.

### 3.2 Qué se excluye y por qué

| Excluido | Motivo | Cómo se aplicó |
| --- | --- | --- |
| Dependencias (`node_modules`, `.venv`) | No son código del equipo. | No están versionadas, así que el árbol exportado no las contiene; además `--exclude-dir`. |
| Compilados (`dist`, `build`, `__pycache__`) | Son producto de otra compilación. | Igual que lo anterior. |
| Lockfiles y archivos generados (`frontend/package-lock.json`, etc.) | No los escribe el equipo. | Están fuera de `backend/app/`, `frontend/src/` y no son Python, TypeScript ni CSS. Sin marcas de código generado dentro del alcance. |
| Migraciones de Alembic (`backend/alembic/versions/`) | El issue #228 pide excluir las migraciones generadas. | Fuera de las carpetas medidas. Como dato informativo, tienen 664 LDC en 20 archivos (`c-01-ldc/crudos/cloc-informativo-migraciones-alembic.txt`). |
| Configuración (`package.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `backend/pyproject.toml`, `alembic.ini`, `backend/alembic/env.py`, Dockerfile, `compose.yaml`, `.env.example`, `requirements.txt`) | Es configuración, no lógica del sistema. | Fuera de las carpetas medidas. |
| Documentación y artefactos no ejecutables (`.md`, `.docx`, `.xlsx`, `.drawio`, `.pdf`, `openspec/`, `odd/`, `SPRINT-*/`, `material-catedra/`) | No son código. | Fuera de las carpetas medidas. |
| Recursos estáticos (`frontend/public/`, `frontend/index.html`) | No son código fuente. | Fuera de las carpetas medidas. `frontend/public/` solo tiene un `.gitkeep`. |

## 4. LDC finales

### 4.1 Producción por módulo

| Módulo | Frontend (TS/TSX) | Backend (Python) | Total |
| --- | ---: | ---: | ---: |
| M1 Productos y Carta (`productos/`) | 3.237 | 1.158 | 4.395 |
| M2 Menús y Promociones (`menus/`) | 3.676 | 1.279 | 4.955 |
| M3 Salón y Mozos (`salon/`) | 2.854 | 785 | 3.639 |
| M4 Atención al Público (`atencion/`) | 3.380 | 1.096 | 4.476 |
| M5 Reservas (`reservas/`) | 2.467 | 671 | 3.138 |
| M6 Pagos (`pagos/`) | 2.112 | 836 | 2.948 |
| Usuarios, inicio de sesión y roles (`usuarios/`, solo backend) | 0 | 274 | 274 |
| Compartido y raíz (`shared/`, `app/*.py`, `src/`) | 6.327 | 503 | 6.830 |
| **Total de producción (Python y TypeScript/TSX)** | **24.053** | **6.602** | **30.655** |
| CSS (`frontend/src/index.css`), fila aparte | 206 | - | 206 |
| Total de producción incluyendo CSS | 24.259 | 6.602 | 30.861 |

Notas:

- La suma de las filas da el total. El frontend de `usuarios` (inicio de sesión y roles) no tiene carpeta propia: vive en `frontend/src/shared/auth/` y cuenta en «Compartido y raíz».
- Cada fila de módulo incluye todo lo que su carpeta tiene hoy, también lo que se agregó después de la estimación (sección 7).

### 4.2 Líneas por lenguaje y ámbito, y líneas físicas no vacías

| Ámbito y lenguaje | Archivos con líneas | En blanco | Comentarios | Código (LDC) | No vacías (comentarios + código) |
| --- | ---: | ---: | ---: | ---: | ---: |
| Producción, frontend: TypeScript/TSX | 333 | 2.474 | 799 | 24.053 | 24.852 |
| Producción, frontend: CSS | 1 | 37 | 8 | 206 | 214 |
| Producción, backend: Python | 66 | 1.920 | 640 | 6.602 | 7.242 |
| **Producción, Python + TypeScript/TSX** | **399** | **4.394** | **1.439** | **30.655** | **32.094** |
| Herramientas, `backend/scripts/`: Python | 4 | 210 | 89 | 1.134 | 1.223 |
| Pruebas, frontend: TypeScript/TSX | 164 | 4.709 | 153 | 21.802 | 21.955 |
| Pruebas, backend: Python | 102 | 7.533 | 894 | 21.123 | 22.017 |

- «No vacías» es comentarios más código. Como dato aparte, la producción (Python y TypeScript/TSX) tiene **32.094** líneas físicas no vacías; con el CSS, 32.308.
- Los comentarios son 1.439 líneas (4,7 % de las LDC): contarlos no cambia la conclusión.

### 4.3 Detalle de lo compartido

Frontend (`frontend/src/shared/` y raíz de `frontend/src/`), código de producción en TypeScript/TSX:

| Carpeta | Contenido | Archivos con líneas | LDC |
| --- | --- | ---: | ---: |
| `shared/components/*.tsx` | páginas y componentes comunes (`ComponentesPage`, `ReportesPage`, `Inicio`, páginas de error, etc.) | 15 | 1.683 |
| `shared/components/ui` | biblioteca de componentes visuales (botón, tabla, diálogo, etc.) | 41 | 1.615 |
| `shared/components/inicio` | página de inicio con plano del local y caja del día (S4-06) | 19 | 1.535 |
| `shared/auth` | inicio de sesión, sesión, guardas de ruta y permisos (HU-TR-01) | 12 | 543 |
| `shared/components/layout` | estructura general: barra superior, menú lateral, menú de sesión | 8 | 480 |
| Raíz de `src/` (`App.tsx`, `main.tsx`, `vite-env.d.ts`) | punto de entrada y configuración de la aplicación | 3 | 161 |
| `shared/hooks` | hooks comunes | 5 | 125 |
| `shared/api` | cliente HTTP común | 2 | 117 |
| `shared/lib` | utilidades | 3 | 52 |
| `shared/types` | tipos comunes | 1 | 16 |
| **Total frontend compartido (TS/TSX)** |  | **109** | **6.327** |

El CSS (206 LDC) está todo en `frontend/src/index.css`. Los estilos de los componentes se escriben como clases de Tailwind dentro de los archivos TSX (886 apariciones de `className=` en 156 archivos de producción).

Backend (`backend/app/shared/` y `backend/app/*.py`):

| Archivo o carpeta | LDC |
| --- | ---: |
| `backend/app/config.py` | 12 |
| `backend/app/database.py` | 35 |
| `backend/app/main.py` | 98 |
| `backend/app/shared/base_repository.py` | 0 (solo comentarios) |
| `backend/app/shared/contratos` | 54 |
| `backend/app/shared/credenciales.py` | 19 |
| `backend/app/shared/excepciones.py` | 5 |
| `backend/app/shared/models` | 56 |
| `backend/app/shared/paginacion.py` | 18 |
| `backend/app/shared/pdf.py` | 127 |
| `backend/app/shared/permisos.py` | 50 |
| `backend/app/shared/seguridad.py` | 29 |
| **Total backend compartido** | **503** |

### 4.4 Pruebas (aparte)

| Módulo | Frontend (`*.test.ts`, `*.test.tsx`) | Backend (`tests/`) | Total |
| --- | ---: | ---: | ---: |
| M1 Productos y Carta | 3.853 | 3.484 | 7.337 |
| M2 Menús y Promociones | 1.460 | 2.510 | 3.970 |
| M3 Salón y Mozos | 4.214 | 2.575 | 6.789 |
| M4 Atención al Público | 2.539 | 3.893 | 6.432 |
| M5 Reservas | 5.329 | 4.991 | 10.320 |
| M6 Pagos | 1.517 | 1.798 | 3.315 |
| Usuarios, inicio de sesión y roles | 0 | 408 | 408 |
| Compartido y raíz (incluye `frontend/src/test/` y los `conftest.py`) | 2.890 | 1.274 | 4.164 |
| Pruebas de las herramientas (`backend/tests/scripts/`) | - | 190 | 190 |
| **Total de pruebas** | **21.802** | **21.123** | **42.925** |

Las pruebas suman 42.925 LDC: 1,40 veces el código de producción (0,91 en el frontend y 3,20 en el backend). No entran en la comparación con la estimación.

### 4.5 Herramientas y migraciones (aparte)

- `backend/scripts/`: 4 archivos con líneas (`cargar_datos_demo.py`, `crear_encargado.py`, `datos_demo.py`, `historial_demo.py`), 1.134 líneas de código. Son la carga de datos de prueba y el alta del primer encargado.
- Migraciones de Alembic, excluidas por regla: 664 LDC en 20 archivos.

## 5. Estimación previa

Fuente: `SPRINT-1/Estimación de Puntos de Función del proyecto (v2).docx` (texto extraído en `c-01-ldc/estimacion/estimacion-pf-v2.txt`). El conteo de PF, los factores y la tabla de LDC son del 22/10/2026 (commit `6bf97b2`, corregidos el 25/10 en `e1a116b` y `69736f5`) y la versión v2 (commit `cef28d2`, 31/10) los conserva sin cambios: las diferencias son de texto y de las secciones de esfuerzo y costo: justificación del reparto, productividad, comparación con el peor caso, costo y consideración final sobre la IA (`c-01-ldc/estimacion/estimacion-pf-v1-69736f5.txt` contra `estimacion-pf-v2.txt`).

Cifras transcritas:

**Puntos de función sin ajustar (PFSA).** Tabla «Resumen de puntos de función» (7.ª tabla del documento). El documento concluye: «77 funciones identificadas con 392 PFSA en los 6 módulos».

| Módulo | ILF | EIF | EI | EO | EQ | PFSA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M1 – Carta | 2 | 0 | 12 | 1 | 2 | 81 |
| M2 – Menús y promociones | 2 | 0 | 9 | 1 | 0 | 61 |
| M3 – Sectores, mesas y mozos | 3 | 0 | 9 | 1 | 3 | 83 |
| M4 – Clientes y comandas | 2 | 0 | 8 | 1 | 2 | 65 |
| M5 – Reservas | 1 | 0 | 5 | 1 | 1 | 39 |
| M6 – Facturación y cobros | 3 | 0 | 5 | 1 | 2 | 63 |
| **TOTAL** | **13** | **0** | **48** | **6** | **10** | **392** |

**Factores de ajuste.** Tabla «Factores de ajuste» (14 factores): suma de Fi = 39.

**Puntos de función ajustados.** Sección «Puntos de función ajustados»: PFA = PFSA × [0,65 + (0,01 × Fi)] = 392 × [0,65 + (0,01 × 39)] = 392 × 1,04 = **407,68** PFA.

**Líneas de código.** Tabla «Estimación de líneas de código» (9.ª tabla). El documento concluye: «Las líneas de código quedaron en 14738 aproximadamente». Justificación del reparto: «Se adopta el reparto inicial presentado en el material de la cátedra». En la versión anterior (commit `69736f5`) agregaba: «Esta distribución deberá revisarse en función de la implementación real».

| Capa | Reparto | PFA asignados | LDC/PF | LDC |
| --- | ---: | ---: | ---: | ---: |
| Frontend | 45 % | 183,46 | 47 | 8.622,43 |
| Backend | 45 % | 183,46 | 30 | 5.503,68 |
| Base de datos | 10 % | 40,77 | 15 | 611,52 |
| **TOTAL** | 100 % | **407,68** |  | **14.737,63** |

Los factores 47, 30 y 15 LDC/PF y el reparto 45/45/10 son los de la tabla de la cátedra (`material-catedra/IS3 - U3 - Apunte - Metricas y estimaciones.pdf`, sección 21.1).

Observaciones sobre el documento:

- **No hay LDC por módulo.** El documento da PF por módulo y LDC por capa (frontend, backend, base de datos). Por eso la comparación de las secciones 6 y 7 es del total y por capa, no por módulo.
- **Totales de las tablas de módulo.** Los renglones «TOTAL DEL MÓDULO» de las tablas M1 a M6 dicen 82, 61, 86, 67, 40 y 64 (suman 400), pero los renglones de cada tabla suman 81, 61, 83, 65, 39 y 63, que son los valores de la tabla de resumen (392). Este informe usa 392, que es consistente con el resto del documento.
- **No define una regla de conteo de LDC** (si se cuentan comentarios, líneas en blanco o pruebas). El apunte de la cátedra pide usar para las LDC finales la misma regla que para las estimadas (sección 10.1); como el documento no la fija, se aplicó la regla de la sección 2.1 y se informan aparte las líneas no vacías y las pruebas.
- **Capa «Base de datos».** Se estimó en 611,52 LDC con el factor de SQL (15), pero el esquema se define con modelos de SQLAlchemy y migraciones de Alembic, ambos en Python. En el repositorio no hay archivos SQL. Para comparar, los modelos están dentro del backend, y los modelos solos se informan en la sección 6.

## 6. Comparación

| Concepto | LDC estimadas | LDC finales (producción) | Diferencia | Variación |
| --- | ---: | ---: | ---: | ---: |
| Frontend (TypeScript/TSX) frente al 45 % del frontend | 8.622 | 24.053 | +15.431 | +179,0 % |
| Backend (Python) frente al backend + la base de datos estimados | 6.115 | 6.602 | +487 | +8,0 % |
| **Total de producción (Python + TypeScript/TSX)** | 14.738 | 30.655 | +15.917 | +108,0 % |
| Total de producción incluyendo CSS | 14.738 | 30.861 | +16.123 | +109,4 % |

Notas:

- «LDC estimadas» son las del documento, redondeadas al entero; «LDC finales» son código de producción. El total «incluyendo CSS» se informa porque el CSS es una fila aparte.
- La estimación de la capa «Backend» se compara contra Backend más Base de datos (5.504 + 612 = 6.115), porque el esquema de la base de datos se escribe en Python (modelos de SQLAlchemy) y queda dentro del backend. Como desglose informativo:

| Desglose informativo del backend | LDC estimadas | LDC finales | Diferencia | Variación |
| --- | ---: | ---: | ---: | ---: |
| Backend sin modelos de datos frente al backend estimado | 5.504 | 6.088 | +584 | +10,6 % |
| Modelos de datos (`models.py`, `shared/models/`) frente a la base de datos estimada | 612 | 514 | -98 | -15,9 % |

El documento no estima LDC por módulo, de modo que no hay comparación por módulo.

**Reparto por capa.** El apunte de la cátedra indica que el reparto «se justifica, no se inventa, y se corrige al final con las LDC reales»:

| Capa | Reparto supuesto | Reparto real (LDC de producción) |
| --- | ---: | ---: |
| Frontend | 45 % | 78,5 % |
| Backend | 45 % | 21,5 % |
| Base de datos | 10 % | no se mide aparte (los modelos están en el backend; ver nota) |

En la base de datos no hay archivos SQL: los modelos de datos son 514 LDC dentro del backend. Con el reparto real, el frontend es 78,5 % del código de producción y no 45 %.

**LDC por punto de función (PF).** Se calcula con los PFA asignados a cada capa en el documento (183,456 para frontend y para backend; 407,68 en total):

| Capa | LDC/PF supuestas | LDC/PF reales | Real / supuesto |
| --- | ---: | ---: | ---: |
| Frontend (TypeScript/TSX) | 47 | 131,1 | 2,79x |
| Backend (Python), sobre el 45 % de los PFA | 30 | 36,0 | 1,20x |
| Backend + base de datos, sobre el 55 % de los PFA | 27,3 | 29,4 | 1,08x |
| **Total (sobre 407,68 PFA)** | 36,1 | 75,2 | 2,08x |

La tabla del apunte supone que TypeScript necesita 1,6 veces las LDC por PF de Python (47 frente a 30). En este proyecto, el cociente real es 3,6.

Cálculo propio por módulo, solo informativo (el documento no estima LDC por módulo; los PFA del módulo son PFSA × 1,04 y las LDC son las de la carpeta del módulo, sin lo compartido):

| Módulo | PFSA (documento) | PFA (PFSA x 1,04) | LDC de producción (frontend + backend del módulo) | LDC por PFA |
| --- | ---: | ---: | ---: | ---: |
| M1 Productos y Carta | 81 | 84,24 | 4.395 | 52,2 |
| M2 Menús y Promociones | 61 | 63,44 | 4.955 | 78,1 |
| M3 Salón y Mozos | 83 | 86,32 | 3.639 | 42,2 |
| M4 Atención al Público | 65 | 67,60 | 4.476 | 66,2 |
| M5 Reservas | 39 | 40,56 | 3.138 | 77,4 |
| M6 Pagos | 63 | 65,52 | 2.948 | 45,0 |

## 7. Justificación de las variaciones

Todo lo que sigue se apoya en mediciones de este informe o en el repositorio y GitHub (solo lectura). Lo que no se pudo comprobar se marca como «Hipótesis».

### 7.1 Dónde está la variación

- El total de producción es 30.655 LDC frente a 14.738 estimadas: +15.917 (+108,0 %).
- El frontend explica el 96,9 % de la diferencia: 24.053 LDC frente a 8.622 (+15.431; 2,79 veces). El backend, con 6.602 LDC frente a 6.115 (backend más base de datos), difiere +487 (+8,0 %).
- Por eso el reparto real es 78,5 % frontend y 21,5 % backend (se había supuesto 45 % y 45 %), y las LDC por PF del frontend son 131,1 en lugar de 47.

### 7.2 Alcance y refinamientos que no figuran en el conteo de PF

El conteo de PF tiene 64 funciones (48 EI, 6 EO y 10 EQ) más 13 archivos lógicos internos (ILF), y esas 64 funciones son las 64 historias de usuario de la hoja «Story Map» de `G3_Backlog.xlsx` (`c-01-ldc/estimacion/g3-backlog-xlsx.txt`). Ninguno de los ILF es un usuario, una sesión o un chef. Lo siguiente no figura como función en ese conteo (algunos son funciones nuevas y otros, mejoras de funciones ya estimadas). Cada fila es el crecimiento neto de LDC de producción (líneas agregadas menos quitadas) que dejó cada cambio, medido con `cloc --diff` entre el commit anterior y el commit de integración (`c-01-ldc/crudos/incrementos/`):

| Alcance no incluido en la estimación | Frontend (TS/TSX) | Backend (Python) | Total | Evidencia |
| --- | ---: | ---: | ---: | --- |
| Inicio de sesión y roles (HU-TR-01) | 1.009 | 631 | 1.640 | issue #172; PR #246 y #249 |
| Página de inicio con plano del local y caja del día (S4-06) | 1.478 | 74 | 1.552 | issue #213; PR #233 |
| Correcciones estéticas del frontend: estilo común, modo oscuro, menú de sesión, rediseño (S4-08) | 2.458 | 0 | 2.458 | issue #251; 12 commits directos en `develop`, sin PR |
| Mozo en la comanda, selector y reasignación (S4-04) | 966 | 92 | 1.058 | issue #225; PR #244 y #250 |
| Selectores en la comanda y enlaces entre pantallas (S4-03) | 420 | 0 | 420 | issue #224; PR #232 |
| Producto listo en cocina (HU-M4-12) | 129 | 70 | 199 | issue #242; PR #248 |
| Promociones aplicadas en la comanda y la factura (S4-02) | 0 | 102 | 102 | issue #223; PR #235 |
| Panel de credenciales de prueba en el inicio de sesión | 174 | 0 | 174 | commit directo `86bb44f` |
| **Total del alcance no incluido** | **6.634** | **969** | **7.603** | más 132 de CSS (todas en S4-08) |

- **Inicio de sesión y roles (HU-TR-01).** El issue #172, creado el 25/10, dice: «Supuesto: la consigna no pide autenticación ni roles (S0-04, sección 3). Esta card agrega ese alcance». Agregó el módulo `usuarios`, la matriz de permisos, el control de acceso por rol en los routers de los seis módulos y en las pantallas, y los chefs en el salón (PR #246).
- **Página de inicio (S4-06).** El issue #213 dice: «Supuesto: ni la consigna ni las HU piden esta pantalla; sale de la maqueta».
- **Correcciones estéticas (S4-08).** El issue #251 explica que salieron al probar el sistema completo (S4-05): vistas estandarizadas, modo oscuro, menú de sesión y rediseño por módulo, integrados el 13/11 con 12 commits directos en `develop`, sin PR. Es el cambio con más LDC de la tabla. Además agregó 132 líneas de CSS.
- **S4-02, S4-03 y S4-04.** Los issues #223, #224 y #225 (creados el 06/11) completan la integración entre módulos: promociones aplicadas en la comanda y la factura, selectores y enlaces en lugar de IDs escritos a mano, y el mozo de la comanda.
- **HU-M4-12.** Historia nueva (issue #242, creada el 11/11); la estimación llega hasta HU-M4-11 en M4.
- **Panel de credenciales de prueba.** Commit directo del 14/11 (`86bb44f`).

En total son **7.603 LDC** (6.634 de frontend y 969 de backend), el 24,8 % del código de producción y el 47,8 % de la diferencia con la estimación. Solo en el frontend son el 27,6 % de sus LDC.

### 7.3 Esqueleto compartido anterior a la estimación

Los PR #153 (esqueleto del backend) y #154 (esqueleto del frontend) se integraron el 21/10, un día antes de la primera versión de la estimación (22/10). En ese commit el código de producción ya sumaba **3.841 LDC de TypeScript/TSX** y 84 de Python, más 74 de CSS. Ese código (componentes visuales comunes, cliente HTTP, hooks y la estructura vacía de los seis módulos) no corresponde a ninguna de las 64 funciones del conteo de PF. Hoy lo compartido del frontend suma 6.327 LDC (26,3 % del frontend; sección 4.3).

### 7.4 Descomposición de las LDC finales

| Origen de las LDC de producción | Frontend (TS/TSX) | Backend (Python) | Total |
| --- | ---: | ---: | ---: |
| Esqueleto integrado el 21/10 (PR #154 frontend, PR #153 backend), antes de la estimación | 3.841 | 84 | 3.925 |
| Alcance no incluido en la estimación (tabla anterior) | 6.634 | 969 | 7.603 |
| Resto, por diferencia (las HU estimadas, sus ajustes y los reportes) | 13.578 | 5.549 | 19.127 |
| **Total de producción medido** | **24.053** | **6.602** | **30.655** |

El CSS final (206 LDC) es la suma exacta del que traía el esqueleto (74) y del que agregó S4-08 (132): los módulos no agregaron CSS.

Si se quitan el esqueleto y el alcance no incluido, queda lo que corresponde a las HU estimadas y sus ajustes:

| Comparación solo del «resto» | LDC estimadas | LDC del resto | Diferencia | Variación |
| --- | ---: | ---: | ---: | ---: |
| Frontend: resto frente a la estimación del frontend | 8.622 | 13.578 | +4.956 | +57,5 % |
| Backend: resto frente a la estimación del backend + base de datos | 6.115 | 5.549 | -566 | -9,3 % |
| Total: resto frente a la estimación total | 14.738 | 19.127 | +4.389 | +29,8 % |

- **Backend.** El «resto» del backend (5.549 LDC) queda -9,3 % respecto de la estimación del backend y la base de datos (6.115). El exceso total del backend (+487 LDC) proviene del esqueleto y del alcance no incluido (1.053 LDC), que más que compensan ese faltante.
- **Frontend.** El «resto» del frontend (13.578) sigue +57,5 % sobre lo estimado: son 74,0 LDC por PF contra 47. Es la parte de la diferencia que la evidencia no explica; la causa probable se discute como hipótesis en 7.6.
- En conjunto, el esqueleto y el alcance no incluido explican 11.528 LDC (72,4 % de la diferencia); quedan 4.389 LDC (27,6 %), que equivalen a +4.956 del frontend y -566 del backend. Con el esqueleto y el alcance quitados, el reparto es 71,0 % frontend y 29,0 % backend.

El «resto» se calcula por diferencia e incluye lo que no se midió por separado: los ajustes de reglas dentro de las HU estimadas (por ejemplo, los PR #240, #243, #245 y #253 de reservas) y la integración entre módulos (por ejemplo, #207, #212 y #219).

### 7.5 Los seis reportes

La estimación asigna 5 PF a cada uno de los seis reportes (EO), 30 PFSA en total, o 31,2 PFA. Los seis PR de los reportes agregaron 3.015 LDC de producción:

| Reporte | PR | Frontend (TS/TSX) | Backend (Python) | Total |
| --- | ---: | ---: | ---: | ---: |
| HU-M1-15 productos más vendidos | #220 | 325 | 393 | 718 |
| HU-M2-10 impacto de promociones | #237 | 364 | 333 | 697 |
| HU-M3-13 mesas atendidas y ventas por mozo | #234 | 297 | 165 | 462 |
| HU-M4-11 comandas y ticket promedio | #247 | 228 | 146 | 374 |
| HU-M5-07 reservas y ausentismo | #229 | 200 | 142 | 342 |
| HU-M6-08 recaudación y deuda pendiente | #241 | 262 | 160 | 422 |
| **Total de los seis reportes** |  | **1.676** | **1.339** | **3.015** |

Son 96,6 LDC por PFA, contra 36,1 LDC por PFA del conjunto de la estimación. Los reportes están dentro del «resto» de la sección 7.4. Hipótesis: los reportes tienen más lógica (agregaciones, filtros, presentación) que la de una salida externa de complejidad media (5 PF); no se auditó el contenido de cada reporte.

### 7.6 Factor LDC/PF y lenguaje

- Hecho: el factor real del frontend es 131,1 LDC/PF con todo incluido y 74,0 con solo el «resto» de la sección 7.4, contra 47 del apunte. El backend, en cambio, está en 36,0 contra 30 (29,4 contra 27,3 si se suma la base de datos).
- Hecho: el frontend de producción tiene 333 archivos con líneas (72 LDC por archivo en promedio) y el backend 66 (100 LDC por archivo).
- Hipótesis: en TSX el marcado y los estilos (Tailwind, 886 `className=`), junto con la división en componentes, hooks y validadores que piden los estándares del frontend (`SPRINT-1/S1-02-estandares-frontend.md`), llevan más líneas por función que el valor medio de 47 de la tabla de la industria. No se comprobó qué parte de la diferencia corresponde a esta causa.
- Hipótesis: el código del proyecto se generó en buena parte con agentes de IA bajo SDD (`AGENTS.md`, sección 4) y ese código es más extenso que el escrito a mano, del que provienen las tablas de la industria (Capers Jones y QSM, citadas en el apunte, sección 21.1). El documento de estimación advierte que sus valores de productividad provienen de proyectos sin IA; no dice lo mismo de las LDC por PF. No se midió esta diferencia.

### 7.7 Pruebas

La estimación es de código de producción y la comparación también. Si se incluyeran las pruebas (42.925 LDC), el total sería 73.580 LDC, 4,99 veces la estimación. El documento de estimación no dice si el factor LDC/PF incluye las pruebas. Hipótesis: no las incluye; no se pudo comprobar.

### 7.8 Conclusión de la comparación

El código final de producción duplica la estimación (+108,0 %). Dos fuentes se comprobaron con las cifras: el esqueleto compartido y el alcance que no figura en el conteo de PF suman el 72,4 % de la diferencia. El 27,6 % restante no se explica con lo medido: corresponde a más LDC por PF en el frontend (74,0 contra 47 en el «resto») y su causa es una hipótesis (7.6). El backend quedó cerca de lo estimado (+8,0 % en total).

## 8. Limitaciones

- **Una sola fotografía.** Se midió el commit `86bb44f`. Los cambios posteriores, y el directorio de trabajo de cada integrante, no están incluidos.
- **Regla de conteo.** La estimación no define cómo se cuentan las LDC. Se aplicó la regla de la sección 2.1 y se informan aparte las líneas no vacías, las pruebas, el CSS y las herramientas.
- **Sin estimación por módulo.** La comparación es del total y por capa.
- **«Resto» por diferencia.** El esqueleto y el alcance no incluido se midieron; el «resto» no. El alcance no incluido se mide como crecimiento neto de cada cambio (líneas agregadas menos quitadas), no como las líneas que sobreviven de cada uno, y los cambios de otras HU que tocaron los mismos archivos no se separan.
- **Capa «Base de datos».** No hay un equivalente medible en SQL. Se comparó contra el backend y se informan aparte los modelos y las migraciones.
- **Herramienta.** cloc cuenta líneas físicas sin comentarios ni blancos; no mide líneas lógicas ni complejidad.
- **Aislamiento.** No hubo contenedor (ver 2.2); el aislamiento fue un entorno de `bwrap`. La alternativa con Docker de la sección 9 no se probó.
- **Criterios que el equipo puede revisar:** si `frontend/src/test/` (preparación de las pruebas) cuenta como pruebas, como aquí; si el total de referencia es con CSS o sin CSS; y si conviene comparar también el total con las pruebas incluidas.

## 9. Cómo repetir la medición

Requisitos: Linux o WSL con `git`, `bash`, `perl`, `curl`, `tar`, `python3` y `bwrap` (bubblewrap). La carpeta `c-01-ldc/scripts/` tiene todo.

```bash
# 1. Confirmar el commit (o usar el hash de este informe)
git fetch origin && git rev-parse origin/develop

# 2. Medición principal y controles (exporta el commit, descarga cloc 2.12 y verifica su SHA-256)
c-01-ldc/scripts/medir-ldc.sh <hash> <ruta-del-repositorio> <directorio-de-trabajo-nuevo> <directorio-de-salida>

# 3. Agrupar por módulo, medir los incrementos de alcance y generar las tablas
python3 -I c-01-ldc/scripts/agrupar_ldc.py <directorio-de-salida>/cloc-por-archivo.csv <directorio-de-salida>
python3 -I c-01-ldc/scripts/contar_extras.py <directorio-de-trabajo>/arbol <directorio-de-salida>/conteos-complementarios.json
python3 -I c-01-ldc/scripts/medir_incrementos.py <ruta-del-repositorio> <directorio-de-trabajo> <directorio-de-salida>
python3 -I c-01-ldc/scripts/generar_tablas.py <directorio-de-salida> <bloques.json>

# 4. (Opcional) Rearmar este informe: reemplaza cada cifra de la plantilla por la medida
python3 -I c-01-ldc/scripts/armar_informe.py c-01-ldc/scripts/plantilla-informe.md <bloques.json> <informe.md>
```

- La salida de la medición de este informe está en `c-01-ldc/crudos/` (`cloc-por-archivo.csv`, los controles `cloc-control-*.txt`, `agrupado-por-modulo.csv`, `incrementos.json` y `tablas.md`), y los comandos en `c-01-ldc/comandos.txt`.
- Sin `bwrap`, se puede correr la misma orden de `cloc` directamente sobre el árbol exportado (`perl cloc-2.12.pl ...`); el resultado no cambia.
- Alternativa con Docker, **sin probar**: exportar el árbol y descargar `cloc-2.12.pl` como en `medir-ldc.sh`, y ejecutar `docker run --rm --network none -v "<trabajo>/arbol:/arbol:ro" -v "<trabajo>/herramienta:/herr:ro" -w /arbol perl:5-slim perl /herr/cloc-2.12.pl <mismos argumentos>`.
- Los incrementos de la sección 7 dependen de los hashes del historial del repositorio (están listados en `c-01-ldc/scripts/medir_incrementos.py`), de modo que se repiten igual mientras ese historial exista.
