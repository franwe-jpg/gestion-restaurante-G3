# Propuesta: HU-M4-12 Marcar un producto como listo en cocina

- **Issue:** [#242](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/242). Rama: `feature/HU-M4-12-listo-en-cocina`.
- **Responsables:** implementa Franco Martín Soler (la tarjeta surgió de HU-TR-01); revisa Juan Ignacio Riquelme (responsable de M4).
- **Depende de:** HU-M4-08 (entregas por cantidad) y HU-TR-01 (#172, roles), ambas integradas en `develop`.

## Intención

Hoy el chef solo ve las comandas: no puede avisar qué productos ya salieron de cocina, y el mozo no sabe qué puede servir. La HU agrega el aviso «listo» por cantidad en cada línea, para que el mozo distinga lo pendiente, lo listo en espera de servir y lo entregado.

## Alcance

### Incluido

- Contador persistido `cantidad_lista` en `DetalleComanda` (0 ≤ `cantidad_lista` ≤ `cantidad`, por defecto 0), con migración de Alembic que lo fija en `cantidad` donde `estado_entrega = 'ENTREGADO'`.
- `PUT /api/v1/comandas/{comanda_id}/detalles/{detalle_id}/listo` con `{"cantidad_lista": n}`: valor absoluto, idempotente, permite bajar para corregir. Mismo orden de validación y códigos que HU-M4-08; 409 si la línea está entregada por completo (CA3).
- `EntregasComanda` (`GET .../detalles`) ampliado con `cantidad_lista`.
- Permiso nuevo `COMANDAS_MARCAR_LISTO` para chef, mozo y encargado.
- Frontend: el diálogo de entregas muestra tres estados por línea (Pendiente, Listo para servir, Entregado) y separa los botones de listo (`COMANDAS_MARCAR_LISTO`) de los de entrega (`COMANDAS_OPERAR`). El chef abre el diálogo desde el listado de comandas.
- Una prueba por criterio de aceptación, más los casos de error y de límite.

### Excluido

- Ampliar el contrato compartido `DetalleComandaSalida` y mostrar «listo» en la pantalla de inicio.
- Cambiar `EstadoEntrega` o la regla de cierre (A02).
- El 403 del chef en `GET /mozos` (se corrige en otro cambio).

## Capacidades

### Nuevas

- `comanda-listo-cocina`: marcar la cantidad lista de cada detalle y derivar el estado visible de la línea.

### Modificadas

- `comanda-entregas` (HU-M4-08, aún sin archivar): la consulta de detalles agrega `cantidad_lista`; el diálogo muestra el estado «Listo para servir».
- `control-de-acceso` (HU-TR-01, aún sin archivar): permiso `COMANDAS_MARCAR_LISTO` en la matriz de M4; el chef deja de ver el diálogo solo en lectura.

## Enfoque

Replicar el patrón de HU-M4-08: `UPDATE` condicional en `repository`, motivo del rechazo resuelto en `service`, `schemas` locales de M4 (`extra=forbid`, `StrictInt ge=0`). Estados derivados por unidad: entregadas = `cantidad_entregada`; listas sin servir = `max(cantidad_lista − cantidad_entregada, 0)`; pendientes = `cantidad − max(cantidad_lista, cantidad_entregada)`.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | «Listo» se registra por cantidad en cada línea (supuesto del issue). |
| S2 | Entregar no exige marcar listo antes (supuesto 2 del issue). |
| S3* | CA3 rechaza (409) solo si `cantidad_entregada == cantidad`; con entrega parcial se puede marcar listo. |
| S4* | Si `cantidad_lista < cantidad_entregada`, las unidades entregadas cuentan como entregadas, no como listas. |
| S5* | Solo una comanda `ABIERTA` admite marcar listo; otro estado → 409. |
| S6* | El chef no recibe `COMANDAS_OPERAR` (le daría entregar, cerrar y anular). |
| S7* | `cantidad_lista` solo se expone en los `schemas` de M4. |

## Ronda de preguntas de la propuesta

Ritmo automático: no se consultó a la persona. Validar en la revisión de la spec: S3 (CA3 con entregas parciales), S5 (marcar listo en comandas cerradas) y S6 (si el mozo también debe marcar listo).

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/atencion/{models,repository,service,schemas,router}.py` y `backend/tests/modules/atencion/` | Modificado |
| `backend/alembic/versions/` (`down_revision = "b8d0f2a4c6e8"`) | Migración nueva |
| `backend/app/shared/permisos.py`, `frontend/src/shared/auth/permisos.ts` y sus pruebas | Compartido, modificado |
| `frontend/src/modules/atencion/` (`types.ts`, `api.ts`, `useEntregas.ts`, `EntregasComandaDialog.tsx`, `AtencionDialogs.tsx`, `AtencionPage.tsx`, `ComandasTabla.tsx`) y sus pruebas | Modificado |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| HU-M4-11 avanza en paralelo en `atencion/` (router, service, schemas, `api.ts`, `types.ts`, matriz, cabeza de Alembic). | Actualizar la rama con `develop` antes del PR; rebasar `down_revision` si cambia la cabeza. |
| Se tocan archivos compartidos de permisos. | Cambio aditivo; avisar al equipo en el PR. |
| Pruebas que afirman «el chef solo ve comandas» cambian. | Actualizarlas a propósito, sin debilitarlas. |
| Componentes de M4 escritos por Juan. | Cambios mínimos; revisa Juan. |

## Plan de reversión

Revertir el merge en `develop` y ejecutar `alembic downgrade` de la migración nueva, que elimina `cantidad_lista` y su restricción. `cantidad_entregada` y `estado_entrega` no cambian, así que entregas y cierre siguen igual; solo se pierde el aviso «listo».

## Criterios de éxito

- [ ] Cada criterio de aceptación de #242 tiene pruebas que pasan en el backend y en el frontend.
- [ ] El chef marca listo y no puede entregar, cerrar ni anular.
- [ ] La migración sube y baja sin perder entregas.
- [ ] CI en verde y el equipo valida S1 a S7.
