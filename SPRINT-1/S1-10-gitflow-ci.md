# S1-10 · GitFlow e integración continua

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Franco Martín Soler · Sprint 1, semana 2 · Issue #146 · Depende de S1-05 (#101), S1-06 (#147)

Define cómo se usan las ramas, cómo se integra un cambio y qué verifica la CI antes de cada merge. Parte de la sección 9 de `SPRINT-0/Plan-de-trabajo-Sprint.md` y de los RNF de mantenibilidad de `SPRINT-0/S0-04-rnf.md` (en especial RNF-MAN-08). Donde el plan no fija una regla, este documento la propone y lo indica.

## 1. Ramas

| Rama | Se crea desde | Se integra en | Uso |
| --- | --- | --- | --- |
| `main` | — | — | Versión estable. Solo recibe lo que se cierra en cada gateway. Nadie trabaja ni hace push directo. |
| `develop` | `main` | `main` (en cada gateway) | Integración del trabajo del sprint. Nadie trabaja ni hace push directo. |
| `feature/<ID>-<descripcion>` | `develop` | `develop` | Una rama por tarea, o por grupo ABM de una misma entidad (`AGENTS.md`, sección 4). Ejemplos: `feature/S1-10-gitflow-ci`, `feature/HU-M1-02-03-modificar-baja-plato`. |
| `hotfix/<descripcion>` | `main` | `main` y `develop` | Corrección urgente de algo que ya está en `main`. Regla propuesta por este documento. |

- El ID de la tarea (`S1-10`, `HU-M3-02`, ...) va en el nombre de la rama y en el título del PR, para rastrear cada cambio hasta su tarjeta.
- Antes de abrir el PR se actualiza la rama con lo último de `develop` (`git pull origin develop`) y se resuelven los conflictos en la rama, no en `develop`.

### Cierre de un gateway

Regla propuesta por este documento:

1. Al terminar la review del sprint, un integrante abre un PR de `develop` hacia `main` con el título `chore: gateway <Gn>` (por ejemplo, `chore: gateway G1`).
2. Otro integrante lo aprueba y lo integra con la CI en verde.
3. Las tarjetas incluidas pasan de «En Testing» a «Done» en el tablero (ver sección 2.1).

### Hotfix

Regla propuesta por este documento: si se encuentra un error en `main` que no puede esperar al próximo gateway, se crea `hotfix/<descripcion>` desde `main`, se abre un PR hacia `main` y, una vez integrado, otro PR de la misma rama hacia `develop`, para que la corrección no se pierda en el próximo gateway.

## 2. Pull requests

| Tema | Regla | Fuente |
| --- | --- | --- |
| Cuándo se abre | Cuando una o varias tarjetas están terminadas (lo decide cada uno). | Plan, sección 9 |
| Destino | `develop`. Solo los PR de gateway y de hotfix apuntan a `main`. | Plan, sección 9 |
| Quién revisa | Al menos un integrante distinto del autor. | RNF-MAN-08 |
| Quién integra y cuándo | El autor, después de la aprobación y con la CI en verde. Se usa merge commit, como en los PR anteriores. *Regla propuesta por este documento.* | — |
| Commits y título | Conventional Commits: `feat: …`, `fix: …`, `docs: …`, `test: …`, `ci: …`, `chore: …`, con el ID de la tarea. | Plan, sección 9 |
| Descripción | Se completa la plantilla `.github/pull_request_template.md`: issue, qué cambia y checklist del revisor. | Esta tarea |
| Issue | El PR menciona cada issue que cubre con su propio `Closes #<número>` (`Closes #3` y `Closes #4`). | Plan, sección 9 |

**Revisión.** Quien revisa usa la checklist de la plantilla. Si pide cambios, el autor los sube a la misma rama y la CI vuelve a correr sola.

### 2.1 Tablero

Cada integrante mueve sus tarjetas a mano:

| Estado | Cuándo | Quién la mueve |
| --- | --- | --- |
| «In Progress» | Al empezar la tarea. | El responsable. |
| «En Testing» | Cuando su PR se integra en `develop`. | El autor del PR. |
| «Done» | Cuando el cambio llega a `main` en el cierre del gateway. | El autor del PR. |

Como `main` es la rama por defecto del repositorio, GitHub cierra el issue mencionado con `Closes #<número>` recién cuando el cambio llega a `main`. Si el PR no usó `Closes`, el issue se cierra a mano después del gateway.

## 3. Integración continua

El workflow está en `.github/workflows/ci.yml` (GitHub Actions) y tiene dos jobs independientes: si falla uno, el otro igual informa su resultado.

**Cuándo corre:** en cada `push` a cualquier rama y en cada PR hacia `develop` o `main`. Si se sube un commit nuevo a la misma rama, se cancela la ejecución anterior. El workflow solo tiene permiso de lectura sobre el repositorio.

| Job | Paso | Comando | Qué valida | RNF / decisión |
| --- | --- | --- | --- | --- |
| `backend` | Lint | `ruff check .` | Estilo, errores simples, complejidad ≤ 10 y largo de funciones | RNF-MAN-02, RNF-MAN-05 |
| `backend` | Formato | `ruff format --check .` | Formato uniforme | RNF-MAN-02 |
| `backend` | Reglas de importación | `lint-imports` | Capas y módulos (ver 3.1) | D-04, RNF-MAN-01, RNF-MAN-09 |
| `backend` | Pruebas | `pytest` | Pruebas, migraciones desde cero y cobertura ≥ 70 % | RNF-MAN-04, RNF-MAN-06 |
| `frontend` | Lint | `npm run lint` | ESLint con 0 errores y 0 advertencias | RNF-MAN-03, RNF-MAN-05 |
| `frontend` | Formato | `npm run format:check` | Formato de Prettier | RNF-MAN-03 |
| `frontend` | Tipos | `npm run typecheck` | TypeScript en modo `strict` (`tsc --noEmit`) | RNF-MAN-03 |
| `frontend` | Pruebas | `npm run test:coverage` | Pruebas de Vitest y cobertura ≥ 60 % | RNF-MAN-04 |
| `frontend` | Build | `npm run build` | Que la aplicación compile para producción | — |

El backend corre con Python 3.12 y el frontend con la última versión de Node 22 (`engines.node >=22.12.0`). Las dependencias se instalan con las versiones exactas de `requirements.txt` y `package-lock.json` (`npm ci`), y se guardan en caché entre ejecuciones.

### 3.1 Reglas de importación del backend

Están en `[tool.importlinter]` de `backend/pyproject.toml` y traducen la tabla de S0-05, sección 3.3:

| Contrato | Regla |
| --- | --- |
| Otros módulos solo usan el `service` de `<modulo>` (uno por módulo) | Un módulo no importa `router`, `repository`, `models` ni `schemas` de otro (RNF-MAN-09). |
| `router` no importa `repository` ni `models` | Las rutas no llegan al acceso a datos (D-02, RNF-MAN-01). |
| `service` no importa `router` ni FastAPI | Las reglas de negocio no dependen de la capa HTTP (RNF-MAN-01). |
| `repository` no importa `router` ni `service` | S0-05, 3.3. |
| `models` solo importa `shared` | S0-05, 3.3. |

Solo se controlan las importaciones directas. Una cadena válida como `salon.service → pagos.service → pagos.repository` no es un error; `salon.service → pagos.repository` sí.

### 3.2 Reproducir la CI en local

Desde `backend/`, con el entorno virtual activo:

```bash
pip install -r requirements.txt
ruff check . && ruff format --check . && lint-imports && pytest
```

Desde `frontend/`:

```bash
npm ci
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build
```

### 3.3 Si la CI falla

1. Abrir el job en rojo (pestaña «Checks» del PR) y ver qué paso falló.
2. Reproducir ese paso en local con el comando de la tabla.
3. Corregir en la misma rama y subir el cambio; la CI vuelve a correr.
   - Lint o formato: `ruff check --fix .` y `ruff format .` en el backend; `npx eslint . --fix` y `npm run format` en el frontend.
   - `lint-imports`: mover la llamada al `service` del otro módulo en lugar de importar su `repository`, `models` o `schemas`.
   - Cobertura: agregar pruebas, no bajar el umbral.
4. No se integra un PR con la CI en rojo ni se desactiva un paso para que pase (RNF-MAN-02, RNF-MAN-08).

## 4. Protección de ramas

Configuración a aplicar en GitHub (Settings → Branches → Branch protection rules) para `develop` y para `main` (RNF-MAN-08):

| Opción | Valor |
| --- | --- |
| Require a pull request before merging | Sí |
| Required approvals | 1 |
| Require status checks to pass before merging | Sí, con `backend` y `frontend` |
| Allow force pushes / Allow deletions | No |
| Do not allow bypassing the above settings | Sí |

Los checks `backend` y `frontend` aparecen en la lista para elegirlos después de la primera ejecución del workflow.

## 5. Validación de la CI

La CI se valida con dos PR de prueba hacia `develop`:

| PR | Cambio | Resultado esperado | Resultado obtenido |
| --- | --- | --- | --- |
| #<n> | Introduce un error de lint a propósito (por ejemplo, un import sin usar). | Falla el paso de lint y el PR no se puede integrar. | Pendiente |
| #<n> | Este cambio, sin errores. | Los dos jobs en verde. | Pendiente |

**Pendiente fuera de esta tarea:** RNF-SEG-10 pide `pip-audit` y `npm audit` en la CI; se agregan cuando el equipo defina cómo tratar los hallazgos.
