# Progreso de apply: HU-M5-01-02-03 Crear, modificar y listar reservas

- **Rama:** `feature/HU-M5-01-02-03-abm-reservas`. **Modo:** Strict TDD. **Delivery strategy:** `single-pr` con `size:exception` (anotado por el orquestador).
- **Lote A (Fases 1 y 2, commits 1 y 2): COMPLETO.** Pendientes: Fases 3 a 8 (frontend, listado, consulta y modificación, cierre) y las tareas «Antes del PR».
- **Entorno:** todo comando de backend se corrió en Docker (`g3-backend-test`, sin red, `backend/` montado en `/app`), porque el host no tiene entorno virtual.
- **Línea base medida en develop antes de empezar:** `pytest` 581 pruebas pasando, cobertura 99,54 %, `alembic heads` = `b2d4f6a8c0e1`.

## Tareas completadas

| Tarea | Estado | Resultado observado |
|-------|--------|---------------------|
| 1.1 | [x] | `test_migracion.py` (7 pruebas): RED = 7 fallos (`['b2d4f6a8c0e1'] != ['d6f8a0c2e4b6']`, `no such table: reservas`) |
| 1.2 | [x] | `test_models.py` (2 pruebas): RED = `ImportError: cannot import name 'EstadoReserva'` |
| 1.3 | [x] | `models.py`: GREEN de `test_estado_reserva_tiene_exactamente_los_cuatro_valores`; la prueba de valor por defecto falló (`no such table`) hasta crear la migración |
| 1.4 | [x] | Migración `d6f8a0c2e4b6`: GREEN, 9 pruebas del módulo |
| 1.5 | [x] | RED = 2 fallos de M3 (`'sectores' not in {...}` y `'mesas' not in {...}`); GREEN al cambiar exactamente 2 líneas (`"-2"` a `"c4e6a8b0d2f4"` y `"-1"` a `"f3a5c7e9b1d2"`); las aserciones no cambian |
| 1.6 | [x] | `alembic check` sobre la base migrada: «No new upgrade operations detected» (modelo y migración declaran lo mismo) |
| 1.7 | [x] | `ruff check .` y `ruff format --check .` limpios, 10 contratos de `lint-imports` cumplidos, `alembic heads` = `d6f8a0c2e4b6`, `pytest` 590 pasando, cobertura 99,66 % |
| 1.8 | [x] | Commit `3d4d57a` |
| 2.1 | [x] | `conftest.py` (reloj fijo `2026-11-02 12:00`, `fabrica_reserva`, `puente_sin_mesa`, `puente_sin_cliente`, `puente_con_capacidad`) y `ahora()` en `service.py` |
| 2.2 | [x] | `test_puente.py` (6): RED = `ImportError: cannot import name 'puente'`; GREEN con `puente.py` |
| 2.3 | [x] | `test_schemas.py` (40): RED = `ImportError: cannot import name 'ReservaCrear'`; GREEN con `schemas.py` |
| 2.4 | [x] | `test_service.py` reglas del alta: RED = `ImportError` por `puente`; GREEN con `repository.py` y `service.py` (30 de 33 pruebas, las 3 restantes son 2.5) |
| 2.5 | [x] | RED observado tras 2.10: 3 fallos con `sqlalchemy.exc.IntegrityError: UNIQUE constraint failed` sin traducir; GREEN con 2.11 (33 pasan) |
| 2.6 | [x] | `test_router.py` (21): RED = `404 == 201/409/422` (ruta inexistente) y errores de fixture por `puente`; GREEN con 2.12 (109 pasan en el módulo) |
| 2.7 | [x] | `schemas.py`: `_DatosDelTurno`, `ReservaCrear`, `ReservaSalida` |
| 2.8 | [x] | `puente.py`: `MesaReservable`, `obtener_mesa`, `existe_cliente` (stubs) |
| 2.9 | [x] | `repository.py`: `agregar`, `existe_reserva_activa` (sin `excluir_id`, queda para la Fase 6) |
| 2.10 | [x] | `service.crear_reserva` con el orden de la Decisión 6 |
| 2.11 | [x] | `_confirmar` traduce el `IntegrityError` en 409 con el mismo mensaje y sin detalles de la base |
| 2.12 | [x] | `POST /reservas` y registro en `main.py` |
| 2.13 | [x] | Refactor: el mensaje de conflicto quedó en un solo lugar (`_turno_ocupado`), usado por la verificación previa y por `_confirmar`; 109 pruebas siguen en verde |
| 2.14 | [x] | `ruff check .` y `ruff format --check .` limpios, 10 contratos cumplidos (`reservas` no importa `salon` ni `atencion`), `alembic heads` = `d6f8a0c2e4b6`, `pytest` 690 pasando, cobertura 99,70 % |
| 2.15 | [x] | Commit `55be2c6` |

## TDD Cycle Evidence

| Tarea | Archivo de prueba | Capa | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|-------|-------------------|------|------------|-----|-------|-------------|----------|
| 1.1, 1.4 | `tests/modules/reservas/test_migracion.py` | Integración (Alembic + SQLite) | N/A (nuevo); línea base 581/581 | Escrito y ejecutado: 7 fallos | 7/7 | 3 estados no activos, otra mesa y otra hora aceptadas, cantidad 1 aceptada y 0 rechazada | Limpio (`alembic check` sin diferencias) |
| 1.2, 1.3 | `tests/modules/reservas/test_models.py` | Unidad / integración | N/A (nuevo) | Escrito y ejecutado: `ImportError` | 2/2 | Enumerado más valor por defecto | Limpio |
| 1.5 | `tests/modules/salon/test_migracion.py` (modificado) | Integración | 13 de M3 verdes antes de la migración nueva | Ejecutado tras 1.4: 2 fallos | 22/22 (módulo M5 más M3) | N/A: ajuste de 2 líneas, sin lógica | Limpio |
| 2.2, 2.8 | `tests/modules/reservas/test_puente.py` | Unidad | N/A (nuevo) | Escrito y ejecutado: `ImportError` | 6/6 | id positivo, 0 y -1 para mesa y cliente | Limpio |
| 2.3, 2.7 | `tests/modules/reservas/test_schemas.py` | Unidad | N/A (nuevo) | Escrito y ejecutado: `ImportError` | 40/40 | Cada campo faltante y nulo, 13 tipos laxos, 4 formatos, 4 horas con segundos o zona, estado e id | Limpio |
| 2.4, 2.9, 2.10 | `tests/modules/reservas/test_service.py` | Integración (service + SQLite) | `ahora` sin cambios previos; N/A (nuevo) | Escrito y ejecutado: `ImportError` | 30/33 tras 2.10 | Límites de fecha y hora (11:30, 12:00, 12:01, otro día), capacidad (7 de 6, 6 de 6, stub), 3 estados no activos, otra mesa, otra hora, otra fecha, orden de validación en 6 pasos | Mensaje de conflicto extraído a `_turno_ocupado` |
| 2.5, 2.11 | `tests/modules/reservas/test_service.py` | Integración | 30/33 | Ejecutado tras 2.10: 3 fallos con `IntegrityError` crudo | 33/33 | Conflicto del índice, dos altas sin verificación previa, sin SQL en el detalle | Un solo mensaje compartido |
| 2.6, 2.12 | `tests/modules/reservas/test_router.py` | Integración (HTTP con `TestClient`) | N/A (nuevo) | Escrito y ejecutado: `404 == 201/409/422` y errores de fixture | 21/21 (109 en el módulo) | 201, 404 x2, 409, 422 x6 parametrizados, estado en el cuerpo, capacidad, forma de los errores | Limpio |

### Test Summary

- **Pruebas nuevas:** 109 (9 en el commit 1; 100 en el commit 2), más 2 de M3 modificadas.
- **Suite completa:** 690 pasando, 0 fallos. Cobertura 99,70 % (módulo `reservas`: 100 % en las 7 unidades). Línea base 581 y 99,54 %: no empeoró.
- **Capas usadas:** unidad (esquemas y puente), integración con base SQLite temporal (modelo, migración y service) e integración HTTP (router).
- **Pruebas de aproximación:** ninguna (no hubo refactor de código existente).

## Work Unit Evidence

### Unidad 1 (commit `3d4d57a`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `python -m pytest -q --no-cov tests/modules/reservas/test_migracion.py tests/modules/reservas/test_models.py tests/modules/salon/test_migracion.py` en Docker: `22 passed` |
| Arnés de ejecución | Sobre una base temporal (`DATABASE_URL=sqlite:////db/h.db`): `alembic upgrade head` termina en `d6f8a0c2e4b6`; `alembic heads` = `d6f8a0c2e4b6 (head)`; `alembic downgrade b2d4f6a8c0e1` deja `b2d4f6a8c0e1`; `alembic upgrade head` vuelve a `d6f8a0c2e4b6`; la tabla queda con los índices `ix_reservas_fecha_hora` y `ux_reservas_mesa_fecha_hora_activa`; `alembic check` sin diferencias |
| Rollback | Revertir el commit `3d4d57a`; si la migración ya se aplicó, antes `alembic downgrade b2d4f6a8c0e1` |

### Unidad 2 (commit `55be2c6`)

| Evidencia | Valor |
|-----------|-------|
| Comando enfocado y resultado | `python -m pytest -q --no-cov tests/modules/reservas` en Docker: `109 passed` |
| Arnés de ejecución | `uvicorn app.main:app` sobre la base temporal migrada y `urllib` desde el mismo contenedor (sin red): el primer `POST /api/v1/reservas` responde `201` con `estado: ACTIVA` y `hora: "21:30"`; repetir el cuerpo responde `409` («La mesa 5 ya tiene una reserva activa el 2030-01-15 a las 21:30»); sin `fecha` responde `422` («Datos invalidos. fecha: Field required»); con `estado` responde `422`; con fecha pasada responde `422`. En la base queda una sola fila `ACTIVA` |
| Rollback | Revertir el commit `55be2c6`; la tabla queda creada y sin ruta |

## Archivos cambiados

| Archivo | Acción | Qué se hizo |
|---------|--------|-------------|
| `backend/app/modules/reservas/models.py` | Modificado | `EstadoReserva` y `Reserva` con check e índices |
| `backend/alembic/versions/d6f8a0c2e4b6_crea_reservas.py` | Creado | Migración reversible de `reservas` |
| `backend/app/modules/reservas/schemas.py` | Modificado | `_DatosDelTurno`, `ReservaCrear`, `ReservaSalida` |
| `backend/app/modules/reservas/puente.py` | Creado | Stub de Mesa y Cliente |
| `backend/app/modules/reservas/repository.py` | Modificado | `agregar`, `existe_reserva_activa` |
| `backend/app/modules/reservas/service.py` | Modificado | `ahora`, `crear_reserva` y funciones privadas |
| `backend/app/modules/reservas/router.py` | Modificado | `POST /reservas` |
| `backend/app/main.py` | Modificado | Registro de `reservas_router` |
| `backend/tests/modules/reservas/{__init__,conftest,test_migracion,test_models,test_puente,test_schemas,test_service,test_router}.py` | Creados | Pruebas por capa |
| `backend/tests/modules/salon/test_migracion.py` | Modificado | 2 líneas: `downgrade` anclado a revisiones fijas (aviso a M3 en el PR) |

## Desvíos del diseño y de las tareas

1. **`_confirmar` envuelve también `repository.agregar`.** La tarea 2.11 describe `_confirmar` con `commit()` y `IntegrityError`. El índice único parcial se viola en el `flush` de `agregar`, antes del `commit`, así que ambos deben ir dentro del `try` (igual que `salon.service._guardar_mesa`). Si no, el `IntegrityError` sale sin traducir.
2. **El router usa la anotación de retorno `-> ReservaSalida`** en lugar de `response_model=ReservaSalida` (patrón de `salon/router.py`). El comportamiento es idéntico.
3. **Pruebas agregadas a lo listado** (todas sobre comportamiento de la spec): `test_reserva_nueva_queda_activa_por_defecto`, `test_ahora_devuelve_la_fecha_y_hora_locales_sin_zona` (nació con el soporte de 2.1, sin RED propio porque la tarea 2.1 pide crear `ahora()` antes; cubre su única línea), `test_crear_reserva_compara_la_hora_en_minutos`, `test_reserva_crear_acepta_hora_con_segundos_en_cero`, `test_reserva_crear_rechaza_campos_nulos` (separada de los faltantes), `test_reserva_salida_serializa_horas_con_cero_a_la_izquierda`, `test_post_reservas_error_404_tiene_solo_la_clave_detalle` (el 404 necesita el reemplazo del puente, por eso va aparte de 409 y 422).
4. **La hora con zona** (`21:30+03:00`, `21:30Z`) también se rechaza, como indica la Decisión 7.

## Problemas encontrados

- **Tamaño por encima del pronóstico.** Commit 1: 323 líneas (321 agregadas, 2 eliminadas; pronóstico 190). Commit 2: 1.038 líneas (1.036 y 2; pronóstico 440), de las cuales ≈ 200 son código de producción y ≈ 835 son pruebas. Backend acumulado ≈ 1.361 líneas contra el pronóstico de ≈ 905 y el punto de control de 800. No se recortó nada: las pruebas son parametrizadas, cubren un caso por escenario de la spec y los límites que exige Strict TDD (triangulación), y `ruff format` expande las listas parametrizadas en vertical. El PR ya lleva `size:exception`.
- Las herramientas `bat`, `fd` y `eza` no están instaladas en el host; se leyó con la herramienta de lectura y se editó con scripts de Python. No se instaló nada.

## Pendiente

- Fases 3 a 8 de `tasks.md` (frontend del alta, listado del backend, frontend del listado, consulta y modificación del backend, modo edición del frontend, cierre).
- Los artefactos de SDD (`openspec/changes/HU-M5-01-02-03/`) siguen sin versionar: van en el commit 10 del plan.
- Antes del PR: `git pull origin develop` y revisar que `alembic heads` siga mostrando una sola cabeza (si `develop` trae otra revisión sobre `b2d4f6a8c0e1`, hay que rebasar `down_revision` y el ancla de la prueba de migración de M5).

## Workload / PR Boundary

- Modo: `single-pr` con `size:exception`.
- Unidades actuales: 1 (tabla y modelo) y 2 (alta del backend).
- Límite: este lote parte de `develop` (`0bff1e0`) y termina en `55be2c6`; no toca el frontend.
- Impacto en el presupuesto de revisión: ≈ 1.361 líneas de backend acumuladas (el pronóstico decía ≈ 905).
