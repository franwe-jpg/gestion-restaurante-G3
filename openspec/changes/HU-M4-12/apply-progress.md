# Avance de la implementación: HU-M4-12 Marcar un producto como listo en cocina

- **Modo:** Strict TDD · **Estado:** 41/41 tareas completas (fases 0 a 9) · **Rama:** `feature/HU-M4-12-listo-en-cocina`
- **Entrega:** un solo PR (`single-pr`, sin `size:exception`).

## Evidencia de ciclo TDD

| Tareas | Archivo de prueba | Capa | Red de seguridad | RED | GREEN | Triangulación | Refactor |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.1, 1.3, 1.4, 1.6 | `backend/tests/modules/atencion/test_migracion.py` | Integración (SQLite temporal + Alembic) | 743/743 (backend `atencion` + `shared`) | 7 fallan (revisión inexistente) | 36/36 | Parametrizada (negativo y mayor que cantidad); relleno ENTREGADO/PENDIENTE; downgrade con entregas parciales | Prueba de downgrade ajustada para sembrar entregas parciales |
| 1.2, 1.4 | `test_repository.py` | Unidad (DB) | incluida arriba | 2 fallan | 50/50 | Default 0 y CHECK | Sin cambios |
| 2.1, 2.2 | `test_schemas.py` | Unidad | incluida arriba | 14 fallan | 55/55 | Válidos, inválidos (6 tipos), negativo, extra/ausente | Sin cambios |
| 3.1, 3.2, 3.3 | `test_repository.py` | Unidad (DB) | incluida arriba | 14 fallan | 50/50 | Parcial, total, bajar, cero, idempotente, entrega parcial, `l < e`, tope, entregada (0, 2, 3), CERRADA/ANULADA, ajeno, otros detalles | Consulta parametrizada |
| 4.1, 4.2, 4.3 | `test_service.py` | Unidad (DB) | incluida arriba | 22 fallan | 91/91 | CA1 a CA4, S2 a S4, S10, orden 404/404/409/409/422, concurrencia con segunda sesión, causa no visible | `_rechazar_listo` de 21 líneas |
| 5.1 a 5.5 | `tests/shared/test_permisos.py`, `test_matriz_permisos.py`, `test_router.py` | Unidad e integración (HTTP) | incluida arriba | error de colección (`Permiso.COMANDAS_MARCAR_LISTO`) y 28 fallas de ruta | `pytest tests/shared tests/modules/atencion/test_router.py` en verde | 3 roles, cuerpos inválidos (7), ids inválidos (4), 401, 404 ×2, 409, 422, ciclo completo | Sin cambios |
| 6.1 | `frontend/src/shared/auth/permisos.test.ts` | Unidad | 147/147 (`atencion permisos`) | 4 fallan | 28/28 con 6.2 y 6.3 | Encargado, mozo, chef (sin `COMANDAS_OPERAR`) | Sin cambios |
| 6.2 | `frontend/src/modules/atencion/api.test.ts` | Unidad | incluida arriba | 2 fallan | verde | Éxito y error de la API | Sin cambios |
| 6.3 | `components/unidadesDeLinea.test.ts` | Unidad (función pura) | N/A (archivo nuevo) | Archivo falla (módulo inexistente) | 6/6 | Tres estados, `l < e`, `l = 0`, `l = c`, `e = c`, suma = cantidad | Sin cambios |
| 6.4, 7.1, 7.2, 7.3 | `components/EntregasComandaDialog.test.tsx` | Componente (Testing Library, `vi.mock('../api')`) | 19/19 previas | 14 fallan | 33/33 | Tres estados, valores enviados, `l < e`, límites, CA3, chef, solo entrega, sin permisos, CERRADA/ANULADA, en vuelo, 409 con recarga | Etiquetas de insignia extraídas a `etiquetasDeLinea` (pura); `enviar` compartido en `useEntregas` |
| 8.1 a 8.3 | `pages/AtencionPage.roles.test.tsx`, `AtencionPage.test.tsx` | Integración de página | 60 pruebas de `pages` | 6 fallan | 60/60 | Chef («Ver detalle», marcar listo), mozo y encargado (controles de entrega y de listo) | `permisosDeEntregas` extraído (límite de 50 líneas) |

### Resumen de pruebas

- Backend nuevas: 7 de migración (con parametrizadas), 2 de modelo, 5 de schemas (más parametrizadas), 15 de repository, 24 de service, 17 de router (con parametrizadas), 2 de permisos y 1 fila de la matriz más el escenario del chef.
- Frontend nuevas: 4 de permisos, 2 de API, 6 de `unidadesDeLinea`, 14 del diálogo, 3 de página por rol.
- Funciones puras nuevas: `unidadesDeLinea`, `etiquetasDeLinea`, `permisosDeEntregas`.

## Evidencia de unidad de trabajo

| Evidencia | Valor |
| --- | --- |
| Prueba enfocada | Backend: `pytest tests/modules/atencion tests/shared` en verde; frontend: `npx vitest run src/modules/atencion src/shared/auth` en verde |
| Arnés de ejecución real | Migración: `alembic upgrade head`, `downgrade -1`, `upgrade head` sobre una base SQLite temporal (borrada después), exit 0; `alembic heads` → `d2f4a6c8e0b1` (única cabeza); pruebas HTTP con `TestClient` y SQLite migrada |
| Límite de reversión | Backend: `alembic/versions/d2f4a6c8e0b1_agrega_cantidad_lista.py`, `cantidad_lista` y su `CHECK` en `models.py`, `ListoDetalle` y `cantidad_lista` en `schemas.py`, `marcar_listo` en `repository.py`, `service.py` y `router.py`, y `COMANDAS_MARCAR_LISTO` en `shared/permisos.py`; frontend: `unidadesDeLinea.ts`, `marcarListo` en `api.ts` y `useEntregas.ts`, controles de listo en `EntregasComandaDialog.tsx`, props de `AtencionDialogs.tsx` y `AtencionPage.tsx`, y el permiso en `shared/auth/permisos.ts` |

## Resultados de CI (AGENTS.md sección 7)

- Backend (`backend/`): `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`: **todo en verde**; ruff sin errores, 190 archivos formateados, `lint-imports` 13 contratos cumplidos y 0 rotos, **2966 pruebas pasan**, cobertura **98,40 %** (umbral 70 %).
- Frontend (`frontend/`): `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`: **todo en verde**; lint con 0 advertencias, **154 archivos y 1740 pruebas pasan**, cobertura de sentencias 88,26 %, ramas 84,28 %, funciones 83,71 %, líneas 88,97 % (umbral 60 %), `build` correcto.
- Línea base previa (develop 42a00a7): backend `atencion` + `shared` 743 pruebas; frontend `atencion permisos` 147 pruebas.

## Tamaño del diff contra `origin/develop`

- Backend: 14 archivos, +991 −7 (≈ 998 líneas cambiadas, la mayoría pruebas): **supera el punto de control de 800**. Es un punto de control, no un bloqueo, y la HU no se divide en varios PR (AGENTS.md sección 4).
- Frontend: 14 archivos, +535 −45 (≈ 580 líneas): por debajo de 800.

## Desviaciones y notas

- **1.5 (fixture):** no se creó una fixture nueva; `comanda_con_lineas` (líneas de cantidad 3 y 10) alcanza y las pruebas fijan los estados con `registrar_entrega` y `marcar_listo`.
- **Mensajes:** 409 de comanda no ABIERTA: «Solo se puede marcar listo en una comanda ABIERTA»; 422 de tope: «La cantidad lista no puede superar la cantidad pedida (n)». El spec no fija el texto.
- **Pruebas existentes ajustadas:** `test_put_entrega_parcial_responde_200_con_forma` y las pruebas de schemas y de `AtencionPage` suman `cantidad_lista` (el contrato crece). En `test_matriz_permisos.py` el escenario del chef reabre la línea sembrada (estaba entregada por completo: el listo daría 409 por CA3).
- **Mejora colateral en pruebas:** `AtencionPage.roles.test.tsx` ahora simula `listarMozosHabilitados` y `listarTodosMozos`; antes la suite emitía 6 errores de promesa no controlada (ya presentes en develop) que hacían salir `vitest` con código 1.
- **Insignias:** con unidades listas se muestra cada estado presente (Entregado si hay entregadas, Listo para servir, Pendiente si hay pendientes); sin unidades listas, solo la insignia dominante (regla de la tarea 7.1).
- **9.1:** `alembic heads` confirmó una sola cabeza antes (`b8d0f2a4c6e8`, HU-M4-11 no agregó migración) y después (`d2f4a6c8e0b1`); no se hizo `git pull` por indicación del orquestador.
- **Diseño:** sin otras desviaciones; no se modificaron `registrar_entrega`, `_rechazar_entrega`, `cerrar_comanda`, `EstadoEntrega`, `shared/contratos/comanda.py`, `env.py`, `pyproject.toml` ni la CI.

## Notas para el PR (tarea 9.7)

- `Closes #242`. Un solo PR hacia `develop` con la plantilla `.github/pull_request_template.md`; lo revisa otro integrante. El modelo y la migración caen en M4 (Juan Ignacio Riquelme): coordinar con él como responsable del módulo.
- **Archivos compartidos tocados:** `backend/app/shared/permisos.py` y `frontend/src/shared/auth/permisos.ts` (permiso nuevo `COMANDAS_MARCAR_LISTO` para encargado, mozo y chef), más `backend/tests/shared/test_permisos.py`, `test_matriz_permisos.py` y `frontend/src/shared/auth/permisos.test.ts`. Avisar a los responsables de `shared/` y de HU-TR-01.
- **Migración:** `d2f4a6c8e0b1` encadenada a `b8d0f2a4c6e8`; única cabeza.
- **Supuestos para validar con el equipo:** S3 (marcar listo sobre una línea entregada por completo responde 409), S4 (la lista puede quedar por debajo de lo entregado), S5, S6 (el chef no recibe `COMANDAS_OPERAR`) y S7 (`cantidad_lista` solo en los esquemas de M4), y la decisión L10 (el chef usa «Ver detalle»).
- **Fuera de alcance:** el chef recibe 403 en `GET /mozos`, por lo que no ve la lista de mozos al abrir la comanda; no se cambió.
- Diferencias con la maqueta: el diálogo conserva el estilo existente de `EntregasComandaDialog`; la maqueta no define controles de listo. Anotar en el PR.
- Todo lo generado es un borrador: lo revisa y lo aprueba otra persona antes de integrarlo.
