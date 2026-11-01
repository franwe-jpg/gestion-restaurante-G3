# Tareas: HU-M4-08 Registrar la entrega de productos de una comanda

- **Issue:** #57 · **Rama:** `feature/HU-M4-08-marcar-entregado` · **Spec:** `specs/comanda-entregas/spec.md` · **Diseño:** `design.md`
- **Modo:** Strict TDD. En cada grupo: RED (escribir la prueba y comprobar que falla) → GREEN (código mínimo) → REFACTOR (limpiar con las pruebas en verde).
- **Convenciones:** backend `test_<función>_<caso>`; frontend, pruebas junto al archivo (`Componente.test.tsx`). Funciones de hasta 50 líneas y complejidad 10 (RNF-MAN-05). Sin importar `router`, `repository`, `models` ni `schemas` de otro módulo (lint-imports). Sin cambios en `shared/`, otros módulos, `env.py`, `pyproject.toml` ni la CI.
- **Nombres:** el diseño llama `registrar_entrega` a la operación de escritura (service y repository); estas tareas usan ese nombre. Si el equipo prefiere `actualizar_entrega`, renombrar en el diseño primero.
- **Marcas:** `[P]` = puede hacerse en paralelo con otras tareas de su fase o de otro lado; `[S]` = secuencial (depende de la anterior).

## Fase 0. Precondiciones (bloqueante)

- [x] 0.1 [S] Confirmar que el PR #207 está integrado en `develop` (si no lo está, detenerse y avisar a la persona; no continuar). _Resuelto por el orquestador: rama apilada sobre #207 (merge `92b7cbc`)._
- [x] 0.2 [S] En la rama `feature/HU-M4-08-marcar-entregado`: `git pull origin develop` y resolver conflictos en la rama. _Rama apilada sobre #207; sin pull._
- [x] 0.3 [S] Confirmar que #207 no agregó migraciones ni tocó el frontend de atención (pregunta abierta del diseño); si lo hizo, ajustar la fase 6 y avisar.
- [x] 0.4 [S] Línea base en verde: desde `backend/`, `pytest tests/modules/atencion`; desde `frontend/`, `npm test -- atencion`. Si algo falla antes de empezar, avisar.
- [x] 0.5 [S] Desde `backend/`, `alembic heads`: anotar la **única** cabeza (hoy `e7a9c1b3d5f7`, medios de pago, sujeta a cambio) y usarla como `down_revision` en 1.3. Si hay más de una cabeza, detenerse y avisar.

## Fase 1. Migración y modelo (backend)

Satisface: requisito «Migración de la cantidad entregada»; contrato de datos y invariante.

- [x] 1.1 [S] RED, `backend/tests/modules/atencion/test_migracion.py`, con `base_temporal`:
  - `test_migracion_cantidad_entregada_agrega_columna_con_default_cero`
  - `test_migracion_cantidad_entregada_mueve_entregados_a_cantidad` (ENTREGADO → `cantidad_entregada = cantidad`; PENDIENTE → 0; invariante en todas las filas)
  - `test_migracion_cantidad_entregada_check_de_rango_rechaza_fuera_de_rango` (`< 0` y `> cantidad` dan `IntegrityError`)
  - `test_migracion_cantidad_entregada_conserva_checks_y_claves_foraneas_previos` (la recreación por lote de SQLite no pierde los `CHECK` ni las FK existentes)
  - `test_migracion_cantidad_entregada_downgrade_conserva_estado_entrega` (downgrade a la revisión fija anterior: columna eliminada, `estado_entrega` intacto)
  - `test_migracion_cantidad_entregada_una_sola_cabeza`
  Usar revisiones fijas (la nueva y su `down_revision` de 0.5), no `head`.
- [x] 1.2 [S] RED, modelo: en `test_repository.py` o en el test del modelo existente, `test_detalle_comanda_cantidad_entregada_default_cero` (un `DetalleComanda` sin el campo queda en 0) y `test_detalle_comanda_cantidad_entregada_rechaza_mayor_que_cantidad`.
- [x] 1.3 [S] GREEN: crear `backend/alembic/versions/<rev>_agrega_cantidad_entregada.py` encadenada a la cabeza de 0.5: `batch_alter_table` agrega la columna (`server_default='0'`, no nula) y el `CHECK` `ck_detalles_comanda_cantidad_entregada_rango`; luego `UPDATE detalles_comanda SET cantidad_entregada = cantidad WHERE estado_entrega = 'ENTREGADO'`. Si la prueba de 1.1 detecta que se pierden los `CHECK`, usar `copy_from` con la definición completa. `downgrade` elimina el `CHECK` y la columna.
- [x] 1.3b [S] RED/GREEN (pedido del 01/11/2026, E12): en `test_repository.py`, `test_estado_segun_entrega_*` (completa → ENTREGADO; parcial, cero y exceso → PENDIENTE; parametrizada), y la función pura `estado_segun_entrega(cantidad, cantidad_entregada)` en `atencion/models.py`. Es la única fuente de la regla; HU-M4-05 la reutiliza.
- [x] 1.4 [S] GREEN: en `backend/app/modules/atencion/models.py` agregar `cantidad_entregada: Mapped[int] = mapped_column(default=0, server_default="0")` y el `CheckConstraint` con el mismo nombre. No tocar `env.py` (el modelo ya está registrado).
- [x] 1.5 [S] Fixtures: en `backend/tests/modules/atencion/conftest.py` fijar `cantidad_entregada=2` en el detalle `ENTREGADO` (el diseño no exige tocar otros fixtures: los detalles ENTREGADO sin cantidad de `test_service.py` y `test_alta.py` siguen válidos porque la base solo exige el rango). Agregar una fixture con líneas de cantidad 3 para las fases siguientes.
- [x] 1.6 [S] REFACTOR y comprobación: `alembic upgrade head`, `alembic downgrade -1`, `alembic upgrade head` sobre una base temporal; `pytest tests/modules/atencion` sigue en verde.

## Fase 2. Schemas (backend)

Satisface: contrato de la API (E6, E7).

- [x] 2.1 [S] RED, `backend/tests/modules/atencion/test_schemas.py`:
  - `test_entrega_detalle_acepta_entero_valido`
  - `test_entrega_detalle_rechaza_texto_decimal_booleano_y_nulo`
  - `test_entrega_detalle_rechaza_negativo`
  - `test_entrega_detalle_rechaza_campos_extra_y_ausente`
  - `test_entregas_comanda_serializa_detalles_y_estado`
- [x] 2.2 [S] GREEN, `schemas.py`: `EntregaDetalle` (`StrictInt`, `ge=0`, `extra="forbid"`), `DetalleEntrega(DetallePendiente)` con `cantidad_entregada` y `estado_entrega`, `EntregasComanda {comanda_id, estado, detalles}`. No modificar `shared/contratos/comanda.py`.

## Fase 3. Repository (backend)

Satisface: requisito «Registrar la cantidad entregada» (E3, E4) y «Consultar el estado de entrega».

- [x] 3.1 [S] RED, `test_repository.py`:
  - `test_registrar_entrega_parcial_deja_pendiente`
  - `test_registrar_entrega_completa_deja_entregado`
  - `test_registrar_entrega_baja_cantidad_vuelve_a_pendiente` (desmarcar con − y fijar en 0)
  - `test_registrar_entrega_mismo_valor_devuelve_true_idempotente`
  - `test_registrar_entrega_mayor_que_cantidad_devuelve_false_sin_cambios`
  - `test_registrar_entrega_comanda_no_abierta_devuelve_false_sin_cambios` (CERRADA y ANULADA)
  - `test_registrar_entrega_detalle_de_otra_comanda_devuelve_false_sin_cambios`
  - `test_registrar_entrega_no_modifica_otros_detalles`
  - `test_listar_entregas_ordena_por_id` (lectura para el `GET`; usar `obtener_comanda` si ya devuelve los detalles ordenados y probar ese orden)
- [x] 3.2 [S] GREEN, `repository.py`: `registrar_entrega(db, comanda_id, detalle_id, cantidad) -> bool` con un `UPDATE` parametrizado (`SET cantidad_entregada=:n WHERE id=:d AND comanda_id=:c AND :n <= cantidad AND EXISTS (comanda :c ABIERTA)`); si `rowcount == 1`, relee el detalle y asigna `estado_entrega = estado_segun_entrega(...)` (E12, sin `CASE` en SQL); devuelve `rowcount == 1`. Sin `commit` en el repository: lo decide el service (D-09, D-10). Agregar la lectura de detalles ordenados por `id` solo si `obtener_comanda` no la cubre.
- [x] 3.3 [S] REFACTOR: revisar que no haya SQL concatenado y que la función cumpla RNF-MAN-05.

## Fase 4. Service (backend)

Satisface: CA1 y CA2; diagnóstico 404/409/422 (E5); órdenes de validación del spec.

- [x] 4.1 [S] RED, `test_service.py`:
  - `test_registrar_entrega_parcial_actualiza_cantidad` (CA1, 4 de 10 queda PENDIENTE)
  - `test_registrar_entrega_completa_marca_entregado_y_no_toca_otro_detalle` (CA1)
  - `test_registrar_entrega_completa_una_parcial` (4 → 10)
  - `test_registrar_entrega_desmarca_bajando_una_unidad` (3 → 2, PENDIENTE)
  - `test_registrar_entrega_fija_cero`
  - `test_registrar_entrega_repetida_es_idempotente`
  - `test_registrar_entrega_mayor_que_cantidad_lanza_datos_invalidos_sin_cambios` (422)
  - `test_registrar_entrega_comanda_inexistente_lanza_no_encontrado` (404)
  - `test_registrar_entrega_detalle_inexistente_lanza_no_encontrado` (404)
  - `test_registrar_entrega_detalle_de_otra_comanda_lanza_no_encontrado_y_no_cambia` (404)
  - `test_registrar_entrega_comanda_cerrada_lanza_conflicto` y `..._anulada_...` (409)
  - `test_registrar_entrega_desmarcar_en_comanda_cerrada_lanza_conflicto` (el detalle sigue ENTREGADO)
  - `test_registrar_entrega_orden_de_diagnostico` (comanda inexistente antes que detalle; detalle antes que estado; estado antes que tope)
  - `test_registrar_entrega_ultima_unidad_no_cierra_la_comanda` (S6) y luego `cerrar_comanda` responde OK
  - `test_cerrar_comanda_tras_entregar_todo_funciona`
  - `test_cerrar_comanda_tras_desmarcar_una_unidad_lanza_conflicto` (A02)
  - `test_registrar_entrega_comanda_cerrada_por_otra_sesion_lanza_conflicto_sin_cambios` (concurrencia; segunda sesión con `sessionmaker(bind=db.get_bind())`)
  - `test_registrar_entrega_dos_escrituras_gana_la_ultima`
  - `test_registrar_entrega_sin_causa_visible_lanza_conflicto_detalle_cambio` (el caso «El detalle cambió; vuelva a consultar las entregas»)
  - `test_consultar_entregas_devuelve_detalles_ordenados_con_cantidades` (CA2)
  - `test_consultar_entregas_todo_entregado_sin_pendientes` (CA2) y coherencia con `/pendientes` vacío
  - `test_consultar_entregas_comanda_cerrada_devuelve_detalles` (S8)
  - `test_consultar_entregas_comanda_inexistente_lanza_no_encontrado`
- [x] 4.2 [S] GREEN, `service.py`: `consultar_entregas(db, comanda_id) -> EntregasComanda` y `registrar_entrega(db, comanda_id, detalle_id, datos) -> EntregasComanda` según el flujo del diseño: `repository.registrar_entrega` → `True`: `commit`; `False`: `rollback` y `_rechazar_entrega` (404 comanda, 404 detalle, 409 no ABIERTA, 422 `n > cantidad` con `DatosInvalidosError`, 409 genérico); luego `consultar_entregas`. Sin importar FastAPI ni lanzar `HTTPException`; excepciones de `shared/excepciones.py`. No modificar `cerrar_comanda`, `crear_comanda` ni los puertos.
- [x] 4.3 [S] REFACTOR: dividir `_rechazar_entrega` en pasos si supera 50 líneas o complejidad 10.

## Fase 5. Router (backend)

Satisface: contrato de la API, formato `{"detalle": ...}` y códigos de D-25 y D-26.

- [x] 5.1 [S] RED, `test_router.py` con `cliente`:
  - `test_put_entrega_parcial_responde_200_con_forma` (CA1)
  - `test_put_entrega_completa_responde_200_entregado` (CA1)
  - `test_put_entrega_desmarcar_y_fijar_cero_responde_200`
  - `test_put_entrega_repetida_responde_200_igual`
  - `test_put_entrega_cantidad_mayor_responde_422_con_detalle`
  - `test_put_entrega_negativo_texto_decimal_nulo_ausente_y_extra_responde_422` (parametrizada: `-1`, `"2"`, `2.5`, `null`, cuerpo vacío, campo extra)
  - `test_put_entrega_id_cero_o_no_numerico_responde_422` (comanda y detalle)
  - `test_put_entrega_comanda_inexistente_responde_404`
  - `test_put_entrega_detalle_de_otra_comanda_responde_404`
  - `test_put_entrega_comanda_cerrada_o_anulada_responde_409`
  - `test_get_detalles_responde_200_con_cantidades_ordenadas` (CA2)
  - `test_get_detalles_todo_entregado_y_pendientes_vacio` (CA2)
  - `test_get_detalles_comanda_cerrada_responde_200`
  - `test_get_detalles_inexistente_responde_404` e `id` inválido → 422
  - `test_ciclo_entregar_todo_y_cerrar_responde_200` y `test_ciclo_desmarcar_una_unidad_y_cerrar_responde_409`
- [x] 5.2 [S] GREEN, `router.py`: `GET /comandas/{comanda_id}/detalles` y `PUT /comandas/{comanda_id}/detalles/{detalle_id}/entrega`, ambos delegan al `service` (`Path(gt=0)`, `response_model=EntregasComanda`). No cambiar `GET .../pendientes` ni las rutas existentes. Verificar que `main.py` ya mapea 404/409/422 (sin cambios esperados).
- [x] 5.3 [S] Punto de control del backend: `ruff check --fix . && ruff format . && ruff check . && ruff format --check . && lint-imports && pytest` verde, con cobertura ≥ 70 %.

## Fase 6. Frontend: tipos, API y hook

Puede iniciarse en paralelo con las fases 1 a 5 una vez fijado el contrato (`[P]` respecto del backend; los cuatro pasos de esta fase son secuenciales entre sí).

- [x] 6.1 [S] RED, `frontend/src/modules/atencion/api.test.ts`: `consultarEntregas` hace `GET /comandas/{id}/detalles`; `registrarEntrega(id, detalleId, n)` hace `PUT /comandas/{id}/detalles/{detalleId}/entrega` con `{"cantidad_entregada": n}`; ambas devuelven `EntregasComanda` o el error de `RespuestaApi`.
- [x] 6.2 [S] GREEN, `types.ts` (`DetalleEntrega extends DetallePendiente`, `EntregasComanda`) y `api.ts` (`consultarEntregas`, `registrarEntrega` con `clienteHttp.get`/`put`). Sin `any`; ninguna llamada fuera de `api.ts` (D-16).
- [x] 6.3 [S] RED, `useEntregas` (cubierto desde `EntregasComandaDialog.test.tsx`, ver 7.1): carga inicial con bandera `vigente`, `registrar(detalleId, valor)` guarda la respuesta, `enviando` bloquea, error muestra mensaje y recarga.
- [x] 6.4 [S] GREEN, crear `components/useEntregas.ts` según el diseño; exportar lo necesario en `components/index.ts` si el patrón del módulo lo exige.

## Fase 7. Frontend: modal «Entregas»

Satisface: requisito «Modal Entregas» (CA1 y CA2). Reutilizar `Dialog`, `Badge` y `Button` de `frontend/src/shared/components/ui/`; buscar antes de crear cualquier componente.

- [x] 7.1 [S] RED, `components/EntregasComandaDialog.test.tsx` (`vi.mock('../api')`):
  - muestra referencia («Producto #id» / «Menú ejecutivo #id»), «{entregadas} de {cantidad}» e insignia «Entregado» o «Pendiente»
  - `+` llama `registrarEntrega` con `n + 1` y la línea pasa de «2 de 10» a «3 de 10» (CA1)
  - `−` llama con `n − 1`; «3 de 3» pasa a «2 de 3» y la insignia a «Pendiente»
  - límites: «0 de 5» deshabilita `−` y habilita `+`; «5 de 5» deshabilita `+` y habilita `−`
  - «Entregar todo» llama con `cantidad`, muestra «10 de 10» y «Entregado» (CA1)
  - todas las líneas completas muestran «No falta servir nada» (CA2)
  - durante una llamada en vuelo todos los controles quedan deshabilitados
  - comanda `CERRADA` o `ANULADA`: muestra las líneas y deshabilita `−`, `+` y «Entregar todo»
  - error 409 en `registrar`: se muestra el mensaje en `role="alert"` y se recarga con `consultarEntregas`
  - error al cargar: mensaje de error
- [x] 7.2 [S] GREEN: crear `components/EntregasComandaDialog.tsx` con la fila en un subcomponente (límite de 50 líneas) y los textos de la maqueta `SPRINT-2/S2-04-maqueta/` como guía visual.
- [x] 7.3 [S] REFACTOR: revisar accesibilidad (`aria-label` de `−`/`+` con la referencia del producto), nombres en español y que no queden funciones de más de 50 líneas.

## Fase 8. Frontend: integración

Satisface: «Modal Entregas en el listado» y «Acceso a las entregas desde el cierre».

- [x] 8.1 [S] RED:
  - `ComandasTabla` / `ComandasPanel`: botón «Entregas» en cada fila, en cualquier estado, que invoca `onEntregas(id)`.
  - `CierreComandaDialog`: con pendientes, ofrece «Gestionar entregas» que invoca `onEntregas`; ya no aparece «pendiente de integración». Ajustar las pruebas existentes que verificaban ese texto.
  - `AtencionPage.test.tsx`: abrir «Entregas» desde la fila; desde el cierre se cierra el modal de cierre y se abre el de entregas (nunca anidados, E10); al volver se recargan los pendientes; escenario «cierre tras entregar todo»: entregar todo → volver → confirmar → `cerrarComanda` OK y la comanda queda CERRADA.
- [x] 8.2 [S] GREEN: agregar la prop `onEntregas` en `ComandasTabla`, `ComandasPanel` y `CierreComandaDialog`; en `AtencionPage.tsx` el estado `entregas: { id: number; volverACierre: boolean } | null`.
- [x] 8.3 [S] Punto de control del frontend: `npm run format`, luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` verdes (cobertura ≥ 60 %).

## Fase 9. Verificación final

- [x] 9.1 [S] Backend, desde `backend/` con el entorno virtual activo: `ruff check . && ruff format --check . && lint-imports && pytest` (AGENTS.md sección 7), sin bajar umbrales.
- [x] 9.2 [S] Frontend, desde `frontend/`: `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`.
- [x] 9.3 [S] `alembic heads` muestra **una sola cabeza** (la migración nueva) y `alembic upgrade head` / `downgrade -1` / `upgrade head` funcionan sobre una base temporal.
- [x] 9.4 [S] Recorrer la tabla de escenarios del spec y confirmar que cada uno tiene al menos una prueba (CA1, CA2, 404, 409, 422, idempotencia, desmarcar, fijar en 0, migración, contador, límites, bloqueo en vuelo, «Entregar todo», recarga ante 409).
- [x] 9.5 [S] Comprobar el tamaño del diff por lado (pronóstico abajo) y que no se tocó `shared/`, otros módulos, `env.py`, `pyproject.toml` ni la CI.
- [x] 9.6 [S] Preparar las notas del PR (ver abajo). No crear ni editar issues, comentarios, PR ni tarjetas sin confirmación de la persona.

## Notas para el PR

- `Closes #57`. Un solo PR hacia `develop`, con la plantilla `.github/pull_request_template.md`.
- Implementa Franco Martín Soler por reasignación del equipo; revisa Juan Ignacio Riquelme (responsable de M4). El cambio de modelo y la migración caen en el módulo de Juan.
- Para Giuliano (HU-M4-05, Modificar una comanda): editar una comanda `ABIERTA` debe respetar las cantidades ya entregadas; reutilizar `estado_segun_entrega` (`atencion/models.py`) cada vez que cambie `cantidad`. Cerrar exige todas las líneas entregadas por completo: si no, el mozo primero baja las cantidades o quita los productos no entregados hasta la cantidad correcta y recién después cierra. Casos abiertos: bajar una línea por debajo de `cantidad_entregada` (el `CHECK` lo rechaza: mapear a 409 o ajustar la entrega), quitar una línea con entregas, y subir la cantidad de una línea totalmente entregada (debe volver a `PENDIENTE` con la función compartida).
- Riesgo abierto nuevo: «desmarcar compitiendo con el cierre». `cerrar_comanda` lee los pendientes fuera de transacción; si un desmarcado se confirma entre esa lectura y el `commit`, la comanda queda CERRADA con una línea pendiente. Endurecer el cierre con un `UPDATE` condicional queda para Juan, en HU-M4-10.
- Supuestos para validar con el equipo: S2 entrega por cantidad, S3 desmarcar, S7 idempotencia, S8 `GET .../detalles` sin paginar y en cualquier estado, S9 «Producto #id» / «Menú ejecutivo #id» (nombres de productos diferidos al adaptador de #207).
- Diferencias frente a la maqueta, si las hay, anotadas en el PR (columna «Entregados» y detalle de mesa fuera de alcance).
- Todo lo generado es un borrador: lo revisa y lo aprueba otra persona antes de integrarlo.

## Pronóstico del presupuesto de revisión

Punto de control de 800 líneas por lado (no bloqueo; la HU no se divide en varios PR). Estimación del diseño, líneas cambiadas (código + pruebas):

| Lado | Código | Pruebas | Total | Límite | Riesgo |
| --- | --- | --- | --- | --- | --- |
| Backend (`backend/`) | ≈ 170 | ≈ 360 | ≈ 530 | 800 | Bajo: holgado |
| Frontend (`frontend/`) | ≈ 260 | ≈ 260 | ≈ 520 | 800 | Bajo: holgado |

Las pruebas por escenario de la lista de las fases 1 a 8 podrían empujar el backend hacia ≈ 650; sigue por debajo del límite. Entrega: un solo PR.

## Dependencias entre fases

```
0 ──► 1 ──► 2 ──► 3 ──► 4 ──► 5 ──┐
  └─► 6 ──► 7 ──► 8 ──────────────┴──► 9
```

- La fase 6 solo necesita el contrato del diseño y puede avanzar en paralelo con las fases 1 a 5; la integración real (8.3 y 9) exige ambos lados terminados.
- Cuello de botella: la fase 0 (espera del PR #207) y la fase 1 (la cabeza de Alembic puede cambiar si otro PR agrega una migración antes de integrar).
