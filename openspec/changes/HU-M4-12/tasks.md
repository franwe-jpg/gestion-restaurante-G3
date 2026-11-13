# Tareas: HU-M4-12 Marcar un producto como listo en cocina

- **Issue:** #242 · **Rama:** `feature/HU-M4-12-listo-en-cocina` · **Specs:** `specs/comanda-listo-cocina/spec.md`, `specs/comanda-entregas/spec.md`, `specs/control-de-acceso/spec.md` · **Diseño:** `design.md` (L1 a L10)
- **Modo:** Strict TDD. En cada grupo: RED (escribir la prueba y comprobar que falla) → GREEN (código mínimo) → REFACTOR (limpiar con las pruebas en verde).
- **Convenciones:** backend `test_<función>_<caso>`; frontend, pruebas junto al archivo (`Componente.test.tsx`). Funciones de hasta 50 líneas y complejidad 10 (RNF-MAN-05). Sin importar `router`, `repository`, `models` ni `schemas` de otro módulo (lint-imports). No se modifican `registrar_entrega`, `_rechazar_entrega`, `cerrar_comanda`, `EstadoEntrega` ni `backend/app/shared/contratos/comanda.py`: solo se agregan funciones, una columna y una ruta.
- **Nombres:** se usan los del diseño: `ListoDetalle` (schema), `marcar_listo` (service y repository), `_rechazar_listo`, `marcarListo` (api.ts y hook), `unidadesDeLinea`. La spec nombra `EntradaListo` y `registrarListo` en dos lugares: son el mismo elemento; al archivar, alinear la spec con el diseño.
- **Marcas:** `[P]` = puede hacerse en paralelo con otras tareas de su fase o de otro lado; `[S]` = secuencial (depende de la anterior).
- **Nota de coordinación (archivos compartidos):** `backend/app/shared/permisos.py` y `frontend/src/shared/auth/permisos.ts` están en `shared/`, no en M4. El cambio es solo agregar `COMANDAS_MARCAR_LISTO` (mozo, chef y encargado); avisar en el PR a los responsables de `shared/` y de HU-TR-01 (el cambio también toca pruebas de permisos de esa HU).
- **Antes del PR:** `git pull origin develop`. Si HU-M4-11 (u otro PR) agregó una migración de Alembic, **rebasar el `down_revision`** de la migración nueva a la cabeza actual (`alembic heads`) y volver a correr la prueba de migración (tarea 1.1) y la tarea 9.3.

## Fase 0. Precondiciones

- [x] 0.1 [S] Confirmar la rama `feature/HU-M4-12-listo-en-cocina` (no `main` ni `develop`) y que HU-M4-08 y HU-TR-01 están integradas en `develop` (dependencias del issue #242).
- [x] 0.2 [S] Línea base en verde: desde `backend/`, `pytest tests/modules/atencion tests/shared`; desde `frontend/`, `npm test -- atencion permisos`. Si algo falla antes de empezar, avisar.
- [x] 0.3 [S] Desde `backend/`, `alembic heads`: confirmar la **única** cabeza (el diseño supone `b8d0f2a4c6e8`) y usarla como `down_revision` en 1.3. Si es otra, ajustar 1.1 y 1.3; si hay más de una, detenerse y avisar.

## Fase 1. Migración y modelo (backend)

Satisface: requisito «Migración de la cantidad lista» (L4).

- [x] 1.1 [S] RED, `backend/tests/modules/atencion/test_migracion.py`, con `base_temporal` y revisiones fijas (la nueva y su `down_revision`); reutilizar `_sembrar_detalles`:
  - `test_migracion_cantidad_lista_agrega_columna_no_nula_con_default_cero`
  - `test_migracion_cantidad_lista_rellena_entregados_con_cantidad_y_pendientes_con_cero`
  - `test_migracion_cantidad_lista_check_rechaza_negativo_y_mayor_que_cantidad` (`-1` y `cantidad + 1` dan `IntegrityError`)
  - `test_migracion_cantidad_lista_conserva_checks_y_claves_foraneas_previos`
  - `test_migracion_cantidad_lista_downgrade_elimina_columna_y_check_y_conserva_entrega` (vuelve a `b8d0f2a4c6e8`; `cantidad_entregada` y `estado_entrega` intactos)
  - `test_migracion_cantidad_lista_una_sola_cabeza`
- [x] 1.2 [S] RED, modelo, en `test_repository.py`: `test_detalle_comanda_cantidad_lista_default_cero` y `test_detalle_comanda_cantidad_lista_rechaza_mayor_que_cantidad`.
- [x] 1.3 [S] GREEN: crear `backend/alembic/versions/<rev>_agrega_cantidad_lista.py` con `down_revision` de 0.3: `batch_alter_table` agrega la columna (`server_default='0'`, no nula) y el `CHECK` `ck_detalles_comanda_cantidad_lista_rango`; luego `UPDATE detalles_comanda SET cantidad_lista = cantidad WHERE estado_entrega = 'ENTREGADO'`. `downgrade` elimina el `CHECK` y la columna. Si la prueba de conservación falla, usar `copy_from` con la definición completa.
- [x] 1.4 [S] GREEN: en `backend/app/modules/atencion/models.py` agregar `cantidad_lista: Mapped[int] = mapped_column(default=0, server_default="0")` y el `CheckConstraint` con el mismo nombre. Sin tocar `env.py`.
- [x] 1.5 [S] Fixtures: en `backend/tests/modules/atencion/conftest.py` agregar o reutilizar una comanda `ABIERTA` con líneas de cantidad 3 (una pendiente, una con `cantidad_entregada` completa) para las fases 3 a 5.
- [x] 1.6 [S] REFACTOR y comprobación: `alembic upgrade head`, `alembic downgrade -1`, `alembic upgrade head` sobre una base temporal; `pytest tests/modules/atencion` en verde.

## Fase 2. Schemas (backend)

Satisface: contrato de la API (L5, L6).

- [x] 2.1 [S] RED, `backend/tests/modules/atencion/test_schemas.py`:
  - `test_listo_detalle_acepta_entero_valido`
  - `test_listo_detalle_rechaza_texto_decimal_booleano_y_nulo`
  - `test_listo_detalle_rechaza_negativo`
  - `test_listo_detalle_rechaza_campos_extra_y_ausente`
  - `test_detalle_entrega_serializa_cantidad_lista`
- [x] 2.2 [S] GREEN, `schemas.py`: `ListoDetalle` (`StrictInt`, `ge=0`, `extra="forbid"`) y `cantidad_lista: int` en `DetalleEntrega`. No modificar `shared/contratos/comanda.py`. Ajustar las pruebas existentes de `DetalleEntrega` y `consultar_entregas` si exigen la forma anterior.

## Fase 3. Repository (backend)

Satisface: requisito «Marcar la cantidad lista de un detalle» (L2).

- [x] 3.1 [S] RED, `test_repository.py`:
  - `test_marcar_listo_parcial_fija_cantidad_lista` (CA1)
  - `test_marcar_listo_total_fija_cantidad`
  - `test_marcar_listo_baja_cantidad_y_fija_cero`
  - `test_marcar_listo_mismo_valor_devuelve_true_idempotente`
  - `test_marcar_listo_con_entrega_parcial_devuelve_true` (S3)
  - `test_marcar_listo_menor_que_entregado_devuelve_true` (S4)
  - `test_marcar_listo_mayor_que_cantidad_devuelve_false_sin_cambios`
  - `test_marcar_listo_linea_entregada_por_completo_devuelve_false_sin_cambios` (CA3, incluso con el mismo valor)
  - `test_marcar_listo_comanda_no_abierta_devuelve_false_sin_cambios` (CERRADA y ANULADA)
  - `test_marcar_listo_detalle_de_otra_comanda_devuelve_false_sin_cambios`
  - `test_marcar_listo_no_modifica_otros_detalles_ni_cantidad_entregada`
- [x] 3.2 [S] GREEN, `repository.py`: `marcar_listo(db, comanda_id, detalle_id, cantidad) -> bool` con `UPDATE detalles_comanda SET cantidad_lista=:n WHERE id=:d AND comanda_id=:c AND :n <= cantidad AND cantidad_entregada < cantidad AND EXISTS (comanda :c ABIERTA)`; devuelve `rowcount == 1`. Sin `commit` (lo decide el service, D-09, D-10).
- [x] 3.3 [S] REFACTOR: sin SQL concatenado; RNF-MAN-05.

## Fase 4. Service (backend)

Satisface: CA1, CA2, CA3, CA4; orden de validación (L3, S8, S9, S10).

- [x] 4.1 [S] RED, `test_service.py` (fixture de la tarea 1.5; segunda sesión con `sessionmaker(bind=db.get_bind())`):
  - `test_marcar_listo_total_actualiza_cantidad_lista` (CA1, 3 de 3)
  - `test_marcar_listo_parcial_deja_pendientes` (10, lista 4)
  - `test_marcar_listo_baja_cantidad` y `test_marcar_listo_fija_cero`
  - `test_marcar_listo_repetido_es_idempotente`
  - `test_marcar_listo_con_entrega_parcial_conserva_cantidad_entregada` (S3)
  - `test_marcar_listo_menor_que_entregado_es_valido` (S4)
  - `test_marcar_listo_no_cambia_estado_entrega_ni_permite_cerrar` (S10: `cerrar_comanda` sigue en 409)
  - `test_marcar_listo_linea_entregada_lanza_conflicto_sin_cambios` (CA3, valor distinto y valor igual)
  - `test_marcar_listo_mayor_que_cantidad_lanza_datos_invalidos_sin_cambios` (422)
  - `test_marcar_listo_comanda_inexistente_lanza_no_encontrado` y `test_marcar_listo_detalle_inexistente_lanza_no_encontrado`
  - `test_marcar_listo_detalle_de_otra_comanda_lanza_no_encontrado_y_no_cambia`
  - `test_marcar_listo_comanda_cerrada_lanza_conflicto` y `..._anulada_...`
  - `test_marcar_listo_orden_de_diagnostico` (404 comanda, 404 detalle, 409 estado, 409 entregada, 422 tope)
  - `test_marcar_listo_otra_sesion_entrega_todo_antes_lanza_conflicto_sin_cambios` (concurrencia)
  - `test_marcar_listo_sin_causa_visible_lanza_conflicto_detalle_cambio`
  - `test_registrar_entrega_de_linea_lista_pasa_a_entregado` (CA2)
  - `test_registrar_entrega_sin_listo_no_exige_marcar_ni_altera_cantidad_lista` (S2)
  - `test_consultar_entregas_incluye_cantidad_lista_con_entregados_listos_y_pendientes` (CA4: líneas A, B y C del spec)
  - `test_consultar_entregas_detalle_sin_marcar_tiene_cantidad_lista_cero`
- [x] 4.2 [S] GREEN, `service.py`: `marcar_listo(db, comanda_id, detalle_id, datos) -> EntregasComanda` según el flujo del diseño (`repository.marcar_listo` → `True`: `commit`; `False`: `rollback` y `_rechazar_listo`; luego `consultar_entregas`). `_rechazar_listo`: 404 comanda → 404 detalle → 409 no ABIERTA → 409 «La línea ya se entregó por completo» → 422 `n > cantidad` (`DatosInvalidosError`) → 409 «El detalle cambió; vuelva a consultar las entregas». Sin FastAPI ni `HTTPException`; excepciones de `shared/excepciones.py`. Incluir `cantidad_lista` en la construcción de `DetalleEntrega`. No modificar `registrar_entrega`, `_rechazar_entrega` ni `cerrar_comanda`.
- [x] 4.3 [S] REFACTOR: `_rechazar_listo` y `marcar_listo` cumplen 50 líneas y complejidad 10.

## Fase 5. Router y permisos (backend)

Satisface: contrato de la API y matriz de permisos (L1, L8).

- [x] 5.1 [S] RED, `backend/tests/shared/test_permisos.py`: agregar `COMANDAS_MARCAR_LISTO` a las expectativas de `MOZO` y `CHEF` (el encargado la recibe con `frozenset(Permiso)`); comprobar que el chef NO tiene `COMANDAS_OPERAR`.
- [x] 5.2 [S] RED, `backend/tests/shared/test_matriz_permisos.py`: agregar la fila `PUT /comandas/1/detalles/1/listo` con `TODOS` a `FILAS`; renombrar el test del chef a `test_el_chef_marca_listo_pero_no_opera_comandas` (listo 200; entrega, cerrar y anular 403); `test_cada_ruta_protegida_declara_un_permiso` debe cubrir la ruta nueva (401 sin sesión).
- [x] 5.3 [S] RED, `test_router.py` con `cliente` y `cliente_con_rol`:
  - `test_put_listo_total_responde_200_con_forma_y_cantidad_lista` (CA1)
  - `test_put_listo_parcial_baja_y_cero_responde_200`
  - `test_put_listo_repetido_responde_200_igual`
  - `test_put_listo_con_entrega_parcial_responde_200` (S3)
  - `test_put_listo_linea_entregada_responde_409_con_detalle` (CA3)
  - `test_put_listo_cantidad_mayor_responde_422_con_detalle`
  - `test_put_listo_cuerpo_invalido_responde_422` (parametrizada: `-1`, `"2"`, `2.5`, `true`, `null`, cuerpo vacío, campo extra)
  - `test_put_listo_id_cero_o_no_numerico_responde_422` (comanda y detalle)
  - `test_put_listo_comanda_inexistente_responde_404` y `test_put_listo_detalle_de_otra_comanda_responde_404`
  - `test_put_listo_comanda_cerrada_o_anulada_responde_409`
  - `test_put_listo_sin_sesion_responde_401`
  - `test_put_listo_chef_mozo_y_encargado_responden_200` (CA1, S6)
  - `test_put_listo_prohibido_antes_que_invalido` (403 antes de 422: verificar con la matriz, ningún rol carece del permiso)
  - `test_get_detalles_incluye_cantidad_lista_ordenado_por_id` (CA4) y `test_get_detalles_chef_responde_200_con_cantidad_lista`
  - `test_ciclo_listo_entregar_y_cerrar_responde_200` (CA2) y `test_ciclo_listo_sin_entregar_no_permite_cerrar_responde_409` (S10)
- [x] 5.4 [S] GREEN: en `backend/app/shared/permisos.py` agregar `Permiso.COMANDAS_MARCAR_LISTO` y asignarlo a mozo y chef (encargado ya recibe todos). Ver nota de archivos compartidos.
- [x] 5.5 [S] GREEN, `router.py`: `PUT /comandas/{comanda_id}/detalles/{detalle_id}/listo` con `requiere(Permiso.COMANDAS_MARCAR_LISTO)`, `Path(gt=0)` en ambos ids, cuerpo `ListoDetalle`, `response_model=EntregasComanda`; delega al `service`. No cambiar las rutas existentes. Verificar que `main.py` ya mapea 404/409/422.
- [x] 5.6 [S] Punto de control del backend: `ruff check --fix . && ruff format . && ruff check . && ruff format --check . && lint-imports && pytest` verde, cobertura ≥ 70 %.

## Fase 6. Frontend: permisos, tipos, API y función de unidades

Puede iniciarse en paralelo con las fases 1 a 5 una vez fijado el contrato (`[P]` respecto del backend). Los pasos de esta fase son secuenciales entre sí, salvo 6.1 y 6.3, que son independientes.

- [x] 6.1 [P] RED, `frontend/src/shared/auth/permisos.test.ts`: `COMANDAS_MARCAR_LISTO` para encargado, mozo y chef; el chef sin `COMANDAS_OPERAR`. GREEN, `permisos.ts`: agregar el permiso a mozo, chef y a la lista explícita del encargado (misma asignación que el backend; ver nota de archivos compartidos).
- [x] 6.2 [S] RED, `frontend/src/modules/atencion/api.test.ts`: `marcarListo(id, detalleId, n)` hace `PUT /comandas/{id}/detalles/{detalleId}/listo` con `{"cantidad_lista": n}` y devuelve `EntregasComanda` o el error de `RespuestaApi`. GREEN, `types.ts` (`cantidad_lista` en `DetalleEntrega`, `ListoDetalle`) y `api.ts` (`clienteHttp.put`, D-16). Sin `any`.
- [x] 6.3 [P] RED, `components/unidadesDeLinea.test.ts`: tres estados (L7); casos `l < e` (cantidad 10, e 6, l 2: 6 / 0 / 4), `l = 0`, `l = c`, `e = c`, línea del spec (c 10, e 2, l 7: 2 / 5 / 3); la suma es siempre `cantidad`. GREEN, crear `components/unidadesDeLinea.ts` (función pura: `entregadas = e`, `listas = max(l − e, 0)`, `pendientes = c − max(l, e)`).
- [x] 6.4 [S] RED, `useEntregas` (cubierto desde `EntregasComandaDialog.test.tsx`, ver 7.1): `marcarListo(detalleId, valor)` guarda la respuesta, `enviando` bloquea, un error muestra el mensaje y recarga. GREEN, `useEntregas.ts`: agregar `marcarListo` y el ayudante interno `enviar(llamada, mensaje)` compartido con `registrar` (≤ 50 líneas).

## Fase 7. Frontend: diálogo «Entregas»

Satisface: «Estados y botones por rol en el diálogo de entregas» (CA1, CA2, CA3, CA4) y «Modal Entregas» (comanda-entregas). Reutilizar `Dialog`, `Badge` y `Button` de `frontend/src/shared/components/ui/`.

- [x] 7.1 [S] RED, `components/EntregasComandaDialog.test.tsx` (`vi.mock('../api')`; las pruebas existentes pasan `puedeEntregar` y `puedeMarcarListo` en lugar de `soloLectura`):
  - tres estados: línea c 10, e 2, l 7 muestra «2 de 10», «Listas para servir: 5» e insignias Entregado, Listo para servir y Pendiente (CA4)
  - línea sin cantidad intermedia muestra la insignia dominante (Entregado o Pendiente)
  - «Todo listo» envía `c`; la línea figura «Listo para servir» (CA1)
  - «+» de listo envía `e + listas + 1` (lista 2 de 10 envía 3) y «−» envía `e + listas − 1`; el valor enviado nunca baja de `e` (L9)
  - con `l < e`, «+» sigue habilitado y envía `e + 1`
  - «Marcar una unidad lista» y «Marcar todo listo» deshabilitados sin pendientes; «Quitar una unidad lista» deshabilitado sin listas (límites)
  - línea entregada por completo: controles de listo deshabilitados (CA3)
  - el chef (`puedeEntregar` falso, `puedeMarcarListo` verdadero): ve controles de listo y no ve −, +, «Entregar todo»; título «Detalle» (CA2)
  - el mozo con ambos permisos: «Entregar todo» sobre línea lista llama `registrarEntrega` con `c` y figura «Entregado» (CA2); «Entregar todo» habilitado con `cantidad_lista` 0 (S2)
  - un usuario con solo `puedeEntregar` no ve controles de listo
  - comanda `CERRADA` o `ANULADA`: líneas con sus tres estados y todos los controles deshabilitados
  - llamada en vuelo: todos los controles deshabilitados
  - error 409 en `marcarListo`: mensaje en `role="alert"` y recarga con `consultarEntregas`
  - las etiquetas de listo no coinciden con `/Sumar|Restar|Entregar todo/` (no rompen las consultas existentes)
- [x] 7.2 [S] GREEN, `EntregasComandaDialog.tsx`: reemplazar `soloLectura` por `puedeEntregar` y `puedeMarcarListo` (obligatorias); subcomponente `BotonesDeListo` con etiquetas «Marcar una unidad lista de X», «Quitar una unidad lista de X», «Marcar todo listo de X»; insignias y «Listas para servir: n» con `unidadesDeLinea`; título «Entregas» con `puedeEntregar`, si no «Detalle». Mantener cada función ≤ 50 líneas.
- [x] 7.3 [S] REFACTOR: accesibilidad (`aria-label` con la referencia del producto), nombres en español, funciones ≤ 50 líneas, y la guía visual de `SPRINT-2/S2-04-maqueta/` como referencia (anotar diferencias en el PR).

## Fase 8. Frontend: integración y acceso por rol

Satisface: «Visibilidad en la interfaz según el rol» (L10). `ComandasTabla` no cambia: el chef abre el diálogo con el botón «Ver detalle» ya existente.

- [x] 8.1 [S] RED, `AtencionPage.roles.test.tsx`:
  - el chef ve el listado y «Ver detalle»; al pulsarlo se abre el diálogo y no aparecen crear, editar, cerrar, reabrir ni anular (CA-2)
  - el chef en el diálogo ve controles de listo y no ve −, + ni «Entregar todo»
  - mozo y encargado ven «Entregas» con los controles de entrega y de listo
  - ajustar el escenario existente «chef sin botones de acción» según el spec de control-de-acceso
- [x] 8.2 [S] RED, `AtencionPage.test.tsx`: abrir el diálogo desde la fila pasa `puedeEntregar` y `puedeMarcarListo` según el rol; el flujo de cierre y entregas existente sigue en verde con las props nuevas.
- [x] 8.3 [S] GREEN: en `AtencionDialogs.tsx` reemplazar la prop `soloLectura` por `puedeEntregar` y `puedeMarcarListo`; en `AtencionPage.tsx` pasar `puedeEntregar={opera}` y `puedeMarcarListo={puede('COMANDAS_MARCAR_LISTO')}`. No modificar `ComandasTabla`.
- [x] 8.4 [S] Punto de control del frontend: `npm run format`, luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` verdes (cobertura ≥ 60 %, 0 advertencias).

## Fase 9. Verificación final

- [x] 9.1 [S] `git pull origin develop`; resolver conflictos en la rama. Si HU-M4-11 u otro cambio agregó una migración, rebasar el `down_revision` (la cabeza actual de `alembic heads`) y repetir 1.6.
- [x] 9.2 [S] Backend, desde `backend/` con el entorno virtual activo: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest` (AGENTS.md sección 7), sin bajar umbrales (cobertura ≥ 70 %).
- [x] 9.3 [S] Frontend, desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 9.4 [S] `alembic heads` muestra **una sola cabeza** (la migración nueva) y `alembic upgrade head` / `downgrade -1` / `upgrade head` funcionan sobre una base temporal.
- [x] 9.5 [S] Recorrer los escenarios de las tres specs y confirmar que cada uno tiene al menos una prueba: CA1 (marcar total, parcial, bajar, cero, idempotencia), CA2 (entregar lo listo, entregar sin listo), CA3 (409 línea entregada), CA4 (consulta con tres estados), 401, 403 antes de 422, 404 ×2, 409 no ABIERTA, 422 tope y cuerpo, migración y reversión, matriz de permisos, botones por rol, error 409 con recarga.
- [x] 9.6 [S] Comprobar el tamaño del diff por lado (pronóstico abajo) y que solo se tocó M4 y, en `shared/`, únicamente `permisos.py` y `permisos.ts` (más sus pruebas); sin cambios en `env.py`, `pyproject.toml`, `shared/contratos/comanda.py` ni la CI.
- [x] 9.7 [S] Preparar las notas del PR (ver abajo). No crear ni editar issues, comentarios, PR ni tarjetas sin confirmación de la persona.

## Notas para el PR

- `Closes #242`. Un solo PR hacia `develop`, con la plantilla `.github/pull_request_template.md`. Revisa otro integrante; el cambio de modelo y la migración caen en el módulo de Juan Ignacio Riquelme (M4).
- **Archivos compartidos:** `backend/app/shared/permisos.py` y `frontend/src/shared/auth/permisos.ts` cambian (permiso nuevo `COMANDAS_MARCAR_LISTO` en mozo, chef y encargado). Avisar a los responsables de `shared/` y de HU-TR-01.
- **Migración:** `down_revision` encadenada a la cabeza vigente; si HU-M4-11 agregó una migración, se rebasó antes del PR.
- Supuestos para validar con el equipo: S1 a S11 del spec `comanda-listo-cocina` (en especial S3, S5 y S6, aún pendientes), y la decisión L10 (el chef usa el botón «Ver detalle»).
- Diferencias frente a la maqueta, si las hay, anotadas en el PR.
- Todo lo generado es un borrador: lo revisa y lo aprueba otra persona antes de integrarlo.

## Pronóstico del presupuesto de revisión

Punto de control de 800 líneas por lado (no bloqueo; la HU no se divide en varios PR). Estimación del diseño, líneas cambiadas (código + pruebas):

| Lado | Código | Pruebas | Total | Límite | Riesgo |
| --- | --- | --- | --- | --- | --- |
| Backend (`backend/`) | ≈ 110 | ≈ 280 | ≈ 390 | 800 | Bajo: holgado |
| Frontend (`frontend/`) | ≈ 170 | ≈ 230 | ≈ 400 | 800 | Bajo: holgado |

La lista detallada de pruebas de las fases 1 a 8 podría empujar el backend hacia ≈ 500 y el frontend hacia ≈ 450; ambos siguen por debajo del límite. Entrega: un solo PR.

## Dependencias entre fases

```
0 ──► 1 ──► 2 ──► 3 ──► 4 ──► 5 ──┐
  └─► 6 ──► 7 ──► 8 ──────────────┴──► 9
```

- La fase 6 solo necesita el contrato del diseño y puede avanzar en paralelo con las fases 1 a 5; la integración real (9) exige ambos lados terminados. En la fase 6, 6.1 y 6.3 son paralelas entre sí.
- Cuellos de botella: la cabeza de Alembic (fase 1 y 9.1, puede cambiar si HU-M4-11 integra una migración antes) y los archivos compartidos de permisos (5.4 y 6.1 deben mantener la misma asignación).
