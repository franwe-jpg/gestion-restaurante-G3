# Progreso de apply: HU-M1-14

- **Lote único:** Fases 1 a 5 (backend, frontend y cierre). Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M1-14-ver-carta`

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. Backend: `GET /carta` | 1.1 a 1.12 | `c683ebb` |
| 2. Frontend: extraer `SelectorEstado` | 2.1 a 2.4 | `5364da5` |
| 3. Frontend: api, tipos, página y componentes | 3.1 a 3.8 | `36ffdd1` |
| 4. Frontend: entrada y ruta | 4.1 a 4.5 | `0944b77` |
| 5. Cierre | 5.1 a 5.5 | commit `docs:` de los artefactos |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | Refactor 1.1 con 432 pruebas de productos en verde antes y después. 14 fallas nuevas por 404 de `/carta` en `test_router.py` y 2 por `listar_carta` ausente en `test_service.py` (la prueba de solo lectura pasaba con el 404, porque no hay datos que modificar; se verificó después con la ruta real). | 470 pruebas pasan, cobertura 99,43 % |
| 2 | Línea base: 18 pruebas de `ProductosTab` y `ProductosPage` en verde; se movió el selector sin editar las pruebas. | 362 pruebas pasan |
| 3 | 3 archivos sin módulo (`CartaPage`, `CartaSeccion`, `ProductoCartaTarjeta`) y 3 fallas por `obtenerCarta` ausente. | 324 pruebas del módulo pasan; 362 en total |
| 4 | 2 fallas: botón «Ver carta» ausente y ruta `/productos/carta` sin montar (`App.test.tsx`). | 364 pruebas pasan |

## Resultado de la CI (Fase 5)

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos) en verde; `pytest`: `470 passed`, cobertura 99,43 % (umbral 70 %). `alembic heads`: una sola cabeza (`c4e6a8b0d2f4`), sin migración nueva.
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (364 pruebas; cobertura de sentencias 72,6 %, umbral 60 %) y `build` en verde.
- Regresión (5.2): las pruebas de productos, secciones, `ProductosTab` y `ProductosPage` pasan sin cambios de comportamiento.

## Tamaño medido (contra el punto de control de 800)

| Lado | Líneas cambiadas | Comando |
| --- | --- | --- |
| Backend | 330 (327 agregadas, 3 quitadas) | `git diff --shortstat feature/archiva-sdd-m1-bebida-seccion...HEAD -- backend` |
| Frontend | 714 (682 agregadas, 32 quitadas) | `git diff --shortstat feature/archiva-sdd-m1-bebida-seccion...HEAD -- frontend` |

Ambos lados quedan por debajo de 800. Medido antes del commit de los artefactos.

## Desviaciones y notas

- Sin desviaciones del diseño. `obtenerCarta` usa un ciclo `while` con el total inicial en infinito (en vez de `do/while`) para cumplir `no-useless-assignment`; el comportamiento es el de I8.
- Para cumplir `max-lines-per-function` (50) se dividieron en varios `describe` `CartaPage.test.tsx` y `ProductosPage.test.tsx`.
- `App.test.tsx` suma una prueba de la ruta `/productos/carta`, además del cambio de `App.tsx`.
- Al cambiar el filtro, `useApi` conserva los datos anteriores hasta que llega la respuesta (igual que `ProductosTab`); durante ese instante las insignias siguen el filtro nuevo con los datos viejos.
- Los vacíos de S88 se muestran como título de `EmptyState`, con la descripción «Cambie el filtro para ver otros productos.».
- Sin cambios en `models`, migraciones, CI ni reglas de lint. Código compartido tocado: solo `frontend/src/App.tsx` (una ruta `lazy`) y `App.test.tsx`.

## Notas para el PR

Hacia `develop`, con la plantilla `.github/pull_request_template.md`.

```text
Closes #19
```

**Qué cambia:** consulta de solo lectura `GET /api/v1/carta` (secciones con sus productos, filtro de estado y paginación por sección) y la pantalla `/productos/carta`, con botón «Ver carta» en `Productos y Carta`.

**Supuestos a validar con el equipo:** S79 a S89 (ver `proposal.md`), S90 a S95 (ver la spec) y S96 a S99 (ver `design.md`).

**Código compartido (AGENTS.md §9.3):** `frontend/src/App.tsx` suma la ruta `productos/carta` con `lazy`. Sin impacto en otros módulos. Avisar al equipo antes de integrar.

**Tamaño:** backend 330 líneas; frontend 714 líneas. Ambos por debajo del punto de control de 800. Un solo PR.

**Diferencia con la maqueta:** ninguna conocida; la pantalla sigue el diseño de la aplicación (S87).
