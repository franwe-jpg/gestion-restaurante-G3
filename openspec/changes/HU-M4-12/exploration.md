# Exploración: HU-M4-12 · Marcar un producto como listo en cocina

Issue: #242. Depende de HU-M4-08 (entrega por cantidad) y HU-TR-01 (#172, inicio de sesión y roles), ambas integradas en `develop`.

## Estado actual

### Entregas por cantidad (HU-M4-08), el patrón a replicar

- **Modelo** (`backend/app/modules/atencion/models.py`, `DetalleComanda`): `cantidad_entregada: int` (default 0, `server_default="0"`), restricción `ck_detalles_comanda_cantidad_entregada_rango` (`0 <= cantidad_entregada <= cantidad`) y `estado_entrega` (`PENDIENTE` o `ENTREGADO`), derivado solo con `estado_segun_entrega(cantidad, entregada)`.
- **Contrato compartido** (`backend/app/shared/contratos/comanda.py`): `EstadoEntrega` tiene solo `PENDIENTE` y `ENTREGADO`. `DetalleComandaSalida` (dentro de `ComandaSalida`) expone `estado_entrega`, no `cantidad_entregada`. Lo usan M4, M5 y M6.
- **Migración modelo**: `a8c0e2b4d6f8_agrega_cantidad_entregada.py` (`batch_alter_table`, columna, restricción, relleno, `downgrade`). La cabeza actual de Alembic es `b8d0f2a4c6e8` (HU-TR-01).
- **Endpoints** (`router.py`): `GET /comandas/{id}/detalles` → `EntregasComanda` (`COMANDAS_VER`); `PUT /comandas/{id}/detalles/{detalle_id}/entrega` con `{"cantidad_entregada": n}` (`COMANDAS_OPERAR`).
- **Service y repository**: `service.registrar_entrega` → `repository.registrar_entrega`, un `UPDATE` condicional (el detalle pertenece a la comanda, comanda `ABIERTA`, `n <= cantidad`); luego recalcula `estado_entrega` y confirma. Si no afecta filas, `_rechazar_entrega` explica el motivo: 404 comanda, 404 detalle, 409 comanda no `ABIERTA`, 422 `n > cantidad`, 409 el detalle cambió.
- **Schemas** (`atencion/schemas.py`): `EntregaDetalle` (`extra=forbid`, `StrictInt ge=0`), `DetalleEntrega(DetallePendiente)` con `cantidad_entregada` y `estado_entrega`, y `EntregasComanda` (`comanda_id`, `estado`, `detalles`).
- **Estados de la comanda**: entregar, modificar, cerrar y anular exigen `ABIERTA`; reabrir exige `CERRADA`. El cierre se rechaza (409, `EntregasPendientesError`) mientras haya un detalle `PENDIENTE`.
- **Convención de la spec de HU-M4-08**: orden de validación 422 ruta/cuerpo, 404 comanda, 404 detalle, 409 no `ABIERTA`; el tope `n <= cantidad` es un 422 posterior a resolver el detalle.

### Permisos (HU-TR-01)

- **Backend**: `backend/app/shared/permisos.py` (`Permiso`, `PERMISOS_POR_ROL`). El chef tiene `CARTA_VER`, `MENUS_VER`, `COMANDAS_VER` y `RESERVAS_VER`; el mozo tiene `COMANDAS_OPERAR`; el encargado, todos. Los endpoints usan `requiere(Permiso.X)`.
- **Pruebas del backend**: `backend/tests/shared/test_matriz_permisos.py` (tabla `FILAS`; la fila de `/detalles/1/entrega` es encargado y mozo; `test_cada_ruta_protegida_declara_un_permiso`; `test_el_chef_ve_comandas_y_su_detalle_pero_no_las_modifica`) y `backend/tests/shared/test_permisos.py` (`TODOS`, `MOZO`, `CHEF`).
- **Frontend**: `frontend/src/shared/auth/permisos.ts` replica la matriz; `useSesion().puede('X')` en `AtencionPage.tsx`; `soloLectura={!opera}` llega a `EntregasComandaDialog`; `ComandasTabla` muestra solo «Ver detalle» sin `puedeOperar`. `AtencionPage.roles.test.tsx` afirma que el chef solo ve comandas.

### Entregas en el frontend (HU-M4-08)

- `EntregasComandaDialog.tsx`: lista de `EntregaFila` con «X de N», insignia (Entregado o Pendiente) y, si no es de solo lectura, botones −, + y «Entregar todo».
- Flujo de datos: `useEntregas.ts` → `api.ts` (`consultarEntregas`, `registrarEntrega`) → `types.ts`.
- La pantalla de inicio (`shared/components/inicio/ComandaDeLaMesa.tsx`, `detalleDeMesa.ts`) usa `ComandaSalida` y solo conoce `estado_entrega`.

## Áreas afectadas

- **Backend M4**: `models.py`, migración nueva (`down_revision = "b8d0f2a4c6e8"`), `repository.py`, `service.py`, `schemas.py`, `router.py` y sus pruebas (incluida la de migraciones).
- **Compartido**: `backend/app/shared/permisos.py`, `frontend/src/shared/auth/permisos.ts` y sus pruebas (`test_permisos.py`, `test_matriz_permisos.py`, `permisos.test.ts`).
- **Frontend M4**: `types.ts`, `api.ts`, `EntregasComandaDialog.tsx`, `useEntregas.ts`, `AtencionDialogs.tsx`, `AtencionPage.tsx`, `ComandasTabla.tsx` y sus pruebas, incluida `AtencionPage.roles.test.tsx`.

## Enfoques

1. **Contador `cantidad_lista` por línea (como HU-M4-08).** Columna `cantidad_lista` (0..`cantidad`), `PUT .../listo` con `{"cantidad_lista": n}`. Por unidad: entregadas = `cantidad_entregada`; listas sin servir = `max(cantidad_lista - cantidad_entregada, 0)`; pendientes = `cantidad - max(cantidad_lista, cantidad_entregada)`. Respeta el supuesto «por cantidad», reutiliza el patrón y no toca `EstadoEntrega` ni el contrato compartido. Esfuerzo bajo a medio.
2. **Estado por unidad** (tabla o enum por unidad). Contradice el supuesto y es desproporcionado. Esfuerzo alto.
3. **Agregar `LISTO` a `EstadoEntrega`.** No admite cantidades parciales, cambia el contrato que usan M5 y M6 y rompe la regla de cierre. Riesgo alto.

## Recomendación

Enfoque 1:

- Columna `cantidad_lista` (entero, no nulo, default 0, `0 <= cantidad_lista <= cantidad`). La migración la rellena con `cantidad` donde `estado_entrega = 'ENTREGADO'`.
- `PUT /comandas/{comanda_id}/detalles/{detalle_id}/listo`, cuerpo `{"cantidad_lista": n}`, respuesta `EntregasComanda` ampliada con `cantidad_lista`. Mismo orden de validación y códigos que HU-M4-08.
- Criterio 3: 409 si la línea ya está entregada por completo (`cantidad_entregada == cantidad`). Se puede bajar `cantidad_lista` para corregir un error.
- `registrar_entrega` no depende de `cantidad_lista` (el mozo puede entregar sin que el chef marque listo).
- `cantidad_lista` se expone solo en el schema de M4 (`GET .../detalles`), no en `DetalleComandaSalida` compartido.
- Permiso nuevo `COMANDAS_MARCAR_LISTO` para chef, mozo y encargado: el chef marca listo sin recibir `COMANDAS_OPERAR` (que le daría cerrar, anular y entregar).
- Frontend: el diálogo de entregas muestra tres estados por línea (Pendiente, Listo en espera de servir, Entregado) y separa los botones de listo (`COMANDAS_MARCAR_LISTO`) de los de entrega (`COMANDAS_OPERAR`). El chef accede al diálogo desde el listado de comandas.

## Riesgos y contradicciones

- La HU habla del producto «listo» como un estado, pero el código usa un contador y `estado_entrega` es binario: el estado visible se deriva en la API o en la pantalla.
- Las pruebas que afirman «el chef solo ve comandas» se actualizan a propósito, sin debilitarlas.
- Criterio 3 con entregas parciales es ambiguo. Supuesto: se rechaza solo si la línea está entregada por completo.
- Supuesto: si `cantidad_lista < cantidad_entregada`, las unidades entregadas cuentan como entregadas y no como listas.
- La pantalla de inicio no mostrará «listo» salvo que se amplíe el contrato compartido. Supuesto: queda fuera de alcance.
- Coordinación: M4 es de Juan Ignacio Riquelme (la tarjeta está asignada a Franco porque salió de HU-TR-01); `shared/permisos.py` y `permisos.ts` son compartidos.
- HU-M4-11 avanza en paralelo en `atencion/`: posibles conflictos en el router, el service, los schemas, `api.ts`, `types.ts`, la matriz de permisos y la cabeza de Alembic (si agrega una migración, hay que rebasar `down_revision`).
- Fuera de alcance: el chef recibe 403 en `GET /mozos` (se corrige en otro cambio).
