# Progreso de apply: HU-M1-07-08-09

- **Lote único:** Fases 1 a 4 (backend, frontend y cierre). Modo Strict TDD, `pytest` y Vitest.
- **Rama:** `feature/HU-M1-07-08-09-bebida`

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. Backend: alta, consulta, modificación y baja de una bebida | 1.1 a 1.8 | `a23c73e` |
| 2. Frontend: configuración de bebidas y alta | 2.1 a 2.10 | `e7963c4` |
| 3. Frontend: edición y acciones por fila | 3.1 a 3.7 | `1a11a61` |
| 4. Cierre | 4.1 a 4.5 | commit `docs:` de los artefactos |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | `test_schemas.py` falla en la importación (`BebidaCrear` ausente); 49 fallas en `test_router.py` (404 o 405 de las rutas de bebidas y las pruebas del `fixture` `alta` con `bebida`). | 413 pruebas pasan, cobertura 99,32 % |
| 2 | 38 fallas en 7 archivos de prueba (claves `BEBIDA` ausentes en `categorias`, el 409 femenino sin ubicar en el campo, botón y ruta «Nueva bebida» ausentes, asterisco fijo). | 304 pruebas pasan |
| 3 | 1 falla en `App.test.tsx` (ruta de edición de bebidas ausente). Las pruebas nuevas de `ProductoEditarPage` y la fila `BEBIDA` de `AccionesProducto` pasaron desde el inicio: la pantalla y las acciones son genéricas por categoría y quedaron resueltas con la Fase 2 (G3). | 316 pruebas pasan |

## Resultado de la CI (Fase 4)

- Backend (desde `backend/`): `ruff check .`, `ruff format --check .` y `lint-imports` (10 contratos cumplidos) en verde; `pytest`: `413 passed`, cobertura 99,32 % (umbral 70 %). `alembic heads`: una sola cabeza (`c4e6a8b0d2f4`), sin migración nueva.
- Frontend (desde `frontend/`): `npm run lint` (0 errores, 0 advertencias), `format:check`, `typecheck`, `test:coverage` (27 archivos, 316 pruebas; cobertura de sentencias 72,38 %, umbral 60 %) y `build` en verde.

## Tamaño medido (contra el punto de control de 800)

| Lado | Líneas cambiadas | Comando |
| --- | --- | --- |
| Backend | 415 (408 agregadas, 7 quitadas) | `git diff --shortstat feature/archiva-sdd-m1...HEAD -- backend` |
| Frontend | 330 (311 agregadas, 19 quitadas) | `git diff --shortstat feature/archiva-sdd-m1...HEAD -- frontend` |

Ambos lados quedan por debajo de 800. Medido antes del commit de los artefactos.

## Desviaciones y notas

- En la Fase 2 se movió a ese commit el cambio de la prueba «sin acciones» de `AccionesProducto.test.tsx` (de `BEBIDA` a `MENU_DEL_DIA`, S57), porque habilitar `BEBIDA` en `CONFIGURACIONES_EDICION` la rompe; la fila `BEBIDA` del `describe.each` y la fila de `App.test.tsx` quedaron en la Fase 3, como indica `tasks.md`.
- `categorias.test.ts` y `ProductoNuevoPage.test.tsx` se dividieron en dos `describe` para cumplir `max-lines-per-function` (50) en los archivos de prueba.
- La tarea 3.5 no necesitó ajustes: `ProductosTabla.test.tsx` y `ProductosTab.test.tsx` pasan sin tocar la fila de bebida.
- `App.tsx` ya declaraba `ProductoNuevoPage` y `ProductoEditarPage` con `lazy`; las rutas nuevas de bebidas reutilizan esas mismas páginas con `categoria="BEBIDA"` (G6 cumplido). Corregido según la sugerencia 2 de `verify-report.md`.
- Sin cambios en `service`, `repository`, `models`, `shared/` ni migraciones. Código compartido tocado: solo `frontend/src/App.tsx` (dos rutas).

## Notas para el PR

Hacia `develop`, con la plantilla `.github/pull_request_template.md`.

```text
Closes #10
Closes #11
Closes #12
```

**Qué cambia:** crear, consultar, modificar, reactivar y dar de baja una bebida (backend y frontend). Las bebidas reutilizan el `service` genérico por categoría; la única regla propia es que los ingredientes son opcionales.

**Supuestos a validar con el equipo:** S42 a S48 y S55 a S57 (ver `proposal.md` y `design.md`). Con M2: la baja de una bebida incluida en un menú vigente (S20).

**Código compartido (AGENTS.md §9.3):** `frontend/src/App.tsx` suma las rutas `productos/bebidas/nuevo` y `productos/bebidas/:id/editar`. Sin impacto en otros módulos. Avisar al equipo antes de integrar.

**Diferencia con la maqueta:** la fila de una bebida ahora tiene «Editar» y «Dar de baja» (antes no tenía acciones).
