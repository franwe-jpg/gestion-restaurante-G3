# AGENTS.md · Reglas para agentes de IA

Reglas que sigue cualquier agente de IA (OpenCode, Claude Code u otro) que trabaje en este repositorio. Ante una duda que este archivo no resuelve, preguntar a la persona antes de suponer.

## 1. Contexto del proyecto

- ISFPP 2026: sistema de gestión de restaurante. Ingeniería de Software III, UNPSJB. Grupo 3: 6 integrantes, un módulo cada uno.
- Stack fijado por la cátedra: **React + TypeScript (Vite)** en `frontend/`, **Python 3.12 + FastAPI** en `backend/`, **SQLite** con SQLAlchemy y Alembic.
- Arquitectura por capas en el backend (`router → service → repository → models`) y por módulo en ambos lados (`SPRINT-0/S0-05-arquitectura.md`).

| Módulo | Carpeta (`backend/app/modules/` y `frontend/src/modules/`) | Responsable |
| --- | --- | --- |
| M1 Productos y Carta | `productos/` | Franco Martín Soler |
| M2 Menús y Promociones | `menus/` | Joaquín Cardoso Díaz |
| M3 Salón y Mozos | `salon/` | Giuliano Giannoncelli |
| M4 Atención al Público | `atencion/` | Juan Ignacio Riquelme |
| M5 Reservas | `reservas/` | Federico Cabaña |
| M6 Pagos | `pagos/` | Héctor Sánchez |

## 2. Fuentes de verdad

| Qué | Dónde |
| --- | --- |
| HU, tareas, criterios de aceptación, responsable y estado | Issues del repositorio, en el [GitHub Project #2](https://github.com/users/franwe-jpg/projects/2) |
| Alcance, módulos y fechas | `SPRINT-0/Plan-de-trabajo-Sprint.md` |
| Arquitectura y decisiones `D-01` a `D-31` | `SPRINT-0/S0-05-arquitectura.md` |
| Requerimientos no funcionales (`RNF-REN-*`, `RNF-SEG-*`, `RNF-MAN-*`) | `SPRINT-0/S0-04-rnf.md` |
| Diagrama de clases (nombres de entidades y atributos) | `SPRINT-0/G3 - Diagrama de clases unificado.drawio` y `SPRINT-0/G3 - Diagramas por modulo.drawio` |
| Roadmap y tareas de cada sprint | `G3_Backlog.xlsx` (una hoja por sprint) |
| Riesgos | `G3_Riesgos.xlsx` y `SPRINT-0/S0-10-riesgos.md` |
| Consigna de la cátedra | `material-catedra/propuesta-ISFPP-2026.pdf` |
| Maqueta de las pantallas (guía visual, no contrato) | `SPRINT-2/S2-04-maqueta/` (abrir `index.html`) |

Si dos fuentes se contradicen: el issue gana para HU y tareas, y el plan gana para alcance y fechas. Si la contradicción es con la consigna, gana la consigna. La maqueta tiene la prioridad más baja: si la HU, la spec revisada o un diseño posterior dicen otra cosa, gana lo que dicen ellos. Señalar la contradicción a la persona; no resolverla por cuenta propia.

## 3. Antes de empezar

1. Identificar a la persona y el ID de su tarea o HU (`S1-04`, `HU-M3-02`, ...). Si no está claro, preguntar.
2. Leer el issue y comprobar que sus dependencias («Depende de») estén cerradas. Si no lo están, avisar antes de avanzar.
3. Comprobar la rama actual: tiene que ser `feature/<ID>-<descripcion>`, nunca `main` ni `develop`.

## 4. Cómo trabajamos con SDD

Cada HU es un cambio de SDD (Spec Driven Development) y el cambio se llama como la HU (`HU-M5-01`). Primero se escribe y se revisa la spec; recién después se genera el código. La guía completa está en el issue S1-01 (#148).

| Comando | Para qué |
| --- | --- |
| `/sdd-new HU-Mx-nn` | Empezar una HU fase por fase (explorar, proponer, especificar, diseñar, tareas). |
| `/sdd-ff HU-Mx-nn` | Generar de una vez propuesta, spec, diseño y tareas, para revisarlos juntos. |
| `/sdd-continue` · `/sdd-status` | Pasar a la fase siguiente · ver en qué fase está el cambio. |
| `/sdd-apply` | Implementar las tareas. |
| `/sdd-verify` | Comprobar que el código cumple la spec. |
| `/sdd-archive` | Cerrar el cambio. |

- Los artefactos se guardan en `openspec/` y se versionan. `/sdd-init` lo corre **una sola persona, una vez** (S1-04); nadie más lo vuelve a correr.
- La spec de una HU define el contrato de la API (rutas, `schemas`, códigos de estado), los datos y un escenario por criterio de aceptación.
- Respuestas recomendadas al orquestador: ritmo *Interactivo*, artefactos en *OpenSpec*, *un solo PR* por HU, y como límite de revisión *800 líneas* en el frontend y *400* en el backend. Si la HU toca los dos lados, cada parte se mide contra su propio límite. Son un punto de control para mirar cómo va el cambio, no un bloqueo.
- Strict TDD: cuando `/sdd-init` lo activa, `/sdd-apply` escribe primero la prueba, comprueba que falla y después escribe el código.
- Un cambio trivial (un typo, un nombre) no necesita SDD.

## 5. Estándares

Las reglas completas están en las guías; no se repiten acá. Leer la que corresponda antes de escribir código.

| Tema | Guía |
| --- | --- |
| Frontend (nombres, carpetas, componentes, API, TypeScript, ESLint, Prettier) | `SPRINT-1/S1-02-estandares-frontend.md` |
| Backend (nombres, capas, tipos, errores, base de datos, pruebas, Ruff) | `SPRINT-1/S1-03-estandares-backend.md` |
| Ramas, pull requests, CI y tablero | `SPRINT-1/S1-10-gitflow-ci.md` |

Las reglas que más se rompen:

- Nombres de negocio en español e iguales al diagrama de clases (`Reserva`, `Comanda`, `Mesa`). Palabras técnicas en inglés (`router`, `service`). No inventar sinónimos.
- **Backend:** `router` solo delega al `service`; `service` no importa FastAPI ni lanza `HTTPException`, usa las excepciones de `backend/app/shared/excepciones.py`; las consultas viven en `repository` y son parametrizadas; la API devuelve `schemas`, nunca `models`.
- **Backend:** errores con formato `{"detalle": "mensaje"}` y códigos `404`, `409` o `422` (D-25, D-26). Listados paginados con `backend/app/shared/paginacion.py` (D-27).
- **Backend:** el esquema cambia solo con migraciones de Alembic, y los `models` de un módulo nuevo se registran en `backend/alembic/env.py` (RNF-MAN-06).
- **Frontend:** toda llamada a la API pasa por el `api.ts` del módulo; los componentes no usan `fetch` (D-16). Prohibido `any`.
- **Frontend:** antes de crear un componente, buscarlo en `frontend/src/shared/components/` (la guía visual está en la ruta `/componentes`).
- **Frontend:** las pantallas se guían por la maqueta `SPRINT-2/S2-04-maqueta/`: menú lateral, encabezado, distribución de listados y formularios, colores y textos. Es una referencia, no un límite. Si la HU, la spec o un diseño posterior difieren, o la función no está en la maqueta, se implementa lo que corresponde con el mismo estilo, y la diferencia se anota en el PR.
- Funciones de hasta 50 líneas y complejidad ciclomática 10 (RNF-MAN-05).

### Historias de usuario

- Formato: `Como <actor>, quiero <acción> para <beneficio>.` Una HU por requerimiento funcional de la consigna, más la HU del reporte del módulo.
- Criterios de aceptación con el formato `Dado que … / Cuando … / Entonces …`: al menos uno del camino feliz y uno de error o de límite.
- Si falta información, se propone un supuesto marcado `Supuesto:` para que el equipo lo valide.

## 6. Estructura del repositorio

```text
gestion-restaurante-G3/
├── backend/          # FastAPI: app/{main,config,database}.py, app/modules/<modulo>/, app/shared/, tests/, alembic/, scripts/
├── frontend/         # React: src/modules/<modulo>/{pages,components,api.ts,types.ts}, src/shared/
├── SPRINT-0/         # documentos del Sprint 0 (plan, RNF, arquitectura, riesgos, diagramas)
├── SPRINT-1/         # documentos del Sprint 1 (estándares, GitFlow y CI)
├── SPRINT-2/         # documentos del Sprint 2 (supuestos y maqueta de las pantallas)
├── material-catedra/ # consigna y apuntes de la cátedra
├── openspec/         # artefactos de SDD (se crea con /sdd-init)
├── G3_Backlog.xlsx · G3_Riesgos.xlsx
├── FLUJO_DIARIO.md   # comandos para empezar una tarea y levantar el sistema
├── AGENTS.md         # este archivo
└── CLAUDE.md         # importa AGENTS.md para Claude Code
```

- Backend, un archivo por capa dentro de cada módulo: `router.py`, `service.py`, `repository.py`, `models.py`, `schemas.py`. Lo que usan dos o más módulos va en `backend/app/shared/`.
- Pruebas del backend en `backend/tests/`, con la misma estructura que `app/modules/` (por ejemplo, `backend/tests/modules/salon/test_service.py`).
- Pruebas del frontend junto al archivo que prueban: `Componente.test.tsx`.
- Los documentos de cada sprint van en `SPRINT-<n>/` con el ID de la tarea en el nombre (`SPRINT-1/S1-03-estandares-backend.md`), en español neutro y en Markdown.

## 7. Comandos de verificación

Son los mismos pasos que corre la CI (`.github/workflows/ci.yml`). Correrlos antes de cada commit; un PR con la CI en rojo no se integra.

Desde `backend/`, con el entorno virtual activo:

```bash
ruff check --fix . && ruff format .           # corrige lint y formato
ruff check . && ruff format --check . && lint-imports && pytest   # lo que valida la CI
```

Desde `frontend/`:

```bash
npm run format                                 # corrige el formato
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build
```

| Control | Umbral | Fuente |
| --- | --- | --- |
| `ruff`, `npm run lint` | 0 errores (y 0 advertencias en el frontend) | RNF-MAN-02, RNF-MAN-03 |
| `lint-imports` | Contratos de importación de `backend/pyproject.toml` | D-04, RNF-MAN-09 |
| `pytest` | Cobertura ≥ 70 % | RNF-MAN-04 |
| `npm run test:coverage` | Cobertura ≥ 60 % | RNF-MAN-04 |

No bajar umbrales ni desactivar reglas o pasos de la CI para que pase.

## 8. Git y GitHub

- Nunca trabajar ni hacer push directo en `main` ni en `develop`.
- Una rama por tarea, creada desde `develop`: `feature/<ID>-<descripcion>` (por ejemplo, `feature/HU-M3-02-modificar-sector`).
- Commits con Conventional Commits, en español y con el ID de la tarea: `feat: permite modificar un sector (HU-M3-02)`. Tipos: `feat`, `fix`, `docs`, `test`, `ci`, `chore`.
- Antes del PR: `git pull origin develop` y resolver los conflictos en la rama.
- PR hacia `develop` con la plantilla `.github/pull_request_template.md` y `Closes #<número>`. Lo revisa y aprueba **otro integrante**, y se integra con la CI en verde (RNF-MAN-08).
- Tablero: cada uno mueve sus tarjetas a mano: «In Progress» al empezar, «En Testing» cuando el PR se integra en `develop` y «Done» cuando el cambio llega a `main`.
- No crear, cerrar ni editar issues, comentarios, PR ni tarjetas sin confirmación explícita de la persona.
- No volver a correr `SPRINT-0/cargar_github.py`: duplica los issues.

## 9. Reglas para el agente

1. **No inventar requerimientos.** Implementar solo lo que dicen la HU, sus criterios de aceptación, el diagrama de clases y la spec revisada.
2. **Marcar lo que falta.** Si un dato no está definido, proponer un supuesto marcado `Supuesto:` en la spec o en el PR para que el equipo lo valide. No decidirlo en silencio.
3. **No tocar módulos ajenos.** Trabajar solo en el módulo de la persona (tabla de la sección 1). Si hace falta un cambio en otro módulo o en `shared/`, avisar y coordinar con su responsable.
4. **Respetar los contratos de importación.** En el backend, un módulo solo importa el `service` de otro, nunca su `router`, `repository`, `models` ni `schemas` (S0-05, sección 3.3). En el frontend, un módulo no importa archivos de otro; lo común va a `frontend/src/shared/`.
5. **Una prueba por criterio de aceptación**, como mínimo una del camino feliz y una de error o de límite por HU (RNF-MAN-04). Nombres `test_<función>_<caso>` en el backend.
6. **Sin secretos.** No leer, crear ni subir `.env`, claves ni tokens. La configuración nueva va en `.env.example` con un valor de ejemplo (RNF-SEG-04). Nunca pegar claves en la conversación.
7. **Dependencias con versión exacta** en `backend/requirements.txt` o `frontend/package.json`. `Supuesto:` una dependencia nueva se acuerda con el equipo antes de agregarla.
8. **No cambiar reglas de lint, umbrales ni pasos de la CI** (`backend/pyproject.toml`, `frontend/eslint.config.js`, `.github/workflows/ci.yml`) sin actualizar la guía correspondiente (S1-02, S1-03, S1-10).
9. **Riesgos:** el agente puede redactar riesgos y planes, pero no propone valores de probabilidad (se estiman a ciegas).
10. **Todo lo generado es un borrador.** Una persona lo revisa y lo aprueba antes de integrarlo.
