# Propuesta: HU-M4-08 Marcar un producto como entregado

- **Issue:** [#57](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/57). Épica: #56. Prioridad: Alta. Rama: `feature/HU-M4-08-marcar-entregado`.
- **Responsables:** implementa Franco Martín Soler (decisión del equipo, plan del Sprint 3); revisa Juan Ignacio Riquelme (responsable de M4).

## Intención

No existe ninguna operación que registre la entrega de un `DetalleComanda`; las pruebas lo hacen con SQL. Como el cierre exige todos los detalles entregados (A02), ninguna comanda real se puede cerrar, y eso bloquea la facturación (M6) y la reapertura (HU-M4-10). El mozo necesita registrar cada entrega, incluso por unidades (por ejemplo, 3 de 10 pizzas servidas), corregir un error y ver qué falta servir.

## Alcance

Alcance ampliado por decisión de la persona el 01/11/2026 (revisión de la propuesta original, que marcaba solo la línea completa y sin desmarcar).

### Incluido

- Registrar la entrega **por cantidad en cada línea**: un detalle con `cantidad` 10 puede tener de 0 a 10 unidades entregadas (CA1).
- Campo persistido nuevo `cantidad_entregada` en `DetalleComanda` (0 ≤ `cantidad_entregada` ≤ `cantidad`, por defecto 0), con migración de Alembic que lo fija en `cantidad` para los detalles que ya están `ENTREGADO`.
- `estado_entrega` se mantiene y es coherente: `ENTREGADO` si y solo si `cantidad_entregada == cantidad`; en otro caso `PENDIENTE`.
- Una sola operación que fija la cantidad entregada absoluta (`PUT .../entrega`). Cubre la entrega parcial, «entregar todo» (n = `cantidad`) y **desmarcar** (n menor, hasta 0). Es idempotente.
- Consultar los detalles de una comanda con su cantidad y su cantidad entregada.
- Frontend: acción «Entregas» en cada fila del listado y en el modal de cierre. El modal muestra cada línea como «{entregadas} de {cantidad}» con un contador − / + y un botón «Entregar todo». Con todo entregado, informa «No falta servir nada» (CA2).
- Una prueba por criterio de aceptación, más los casos de error y de límite.

### Excluido

- Columna «Entregados» del listado de la maqueta: cambiaría `ComandaResumen` (contrato compartido S2-01).
- Detalle de mesa en Inicio (maqueta `index.html`, módulo M3).
- Nombres de productos en lugar de referencias (dependen de los adaptadores de #207).
- Corregir entregas de una comanda cerrada (corresponde a HU-M4-10, reabrir).
- Modificar, anular o reabrir comandas; promociones; factura; autenticación.

## Capacidades

### Nuevas

- `comanda-entregas`: registro de la cantidad entregada de cada detalle y consulta del estado de entrega de los detalles de una comanda.

### Modificadas

- Ninguna. `openspec/specs/` no tiene especificaciones de Comanda. La regla A02 del cierre (HU-M4-04-07-09) y el contrato compartido `backend/app/shared/contratos/comanda.py` no cambian, porque `estado_entrega` sigue siendo la fuente que lee el cierre.

## Enfoque

- Backend M4 por capas. Acción: `PUT /api/v1/comandas/{comanda_id}/detalles/{detalle_id}/entrega` con cuerpo `{"cantidad_entregada": n}`. Lectura: `GET /api/v1/comandas/{comanda_id}/detalles`. El diseño fija las respuestas y la validación.
- `schemas` locales de M4 (`DetalleEntrega`, `EntregasComanda`), sin tocar `backend/app/shared/contratos/comanda.py`.
- Migración de Alembic: agrega `cantidad_entregada` (no nula, por defecto 0) y la completa para los detalles `ENTREGADO`. El `model` se actualiza en el módulo M4.
- Frontend: llamadas solo en `atencion/api.ts`; modal con `Dialog`, `Badge` y `Button` de `frontend/src/shared/components/ui/`.

## Supuestos

Los marcados con * van más allá del texto de la HU y los valida el equipo.

| # | Supuesto: |
| --- | --- |
| S1 | Solo las comandas `ABIERTA` cambian entregas; `CERRADA` o `ANULADA` → 409. Las correcciones tras el cierre pasan por HU-M4-10 (reabrir). |
| S2* | La entrega se registra por cantidad en cada línea, no solo por línea completa. |
| S3* | Se puede desmarcar bajando la cantidad entregada (hasta 0) mientras la comanda esté `ABIERTA`. |
| S4 | Comanda inexistente o detalle que no pertenece a la comanda → 404. |
| S5 | Sin autenticación todavía: cualquier usuario del sistema puede registrar entregas. |
| S6 | Entregar la última unidad no cierra la comanda; el cierre sigue siendo `POST .../cerrar`. |
| S7* | Repetir el mismo valor es idempotente: 200 sin cambios (no es un error). |
| S8* | `GET .../detalles` funciona en cualquier estado de la comanda y no se pagina (como `/pendientes`). |
| S9* | El modal muestra «Producto #id» o «Menú ejecutivo #id»; los nombres quedan para después. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/atencion/{router,service,repository,schemas,models}.py`, `backend/tests/modules/atencion/` | Modificado |
| `backend/alembic/versions/` | Migración nueva |
| `frontend/src/modules/atencion/{api,types}.ts`, `components/` (modal nuevo, `ComandasTabla`, `CierreComandaDialog`) y sus pruebas | Nuevo y modificado |
| Compartidos o módulos ajenos | Ninguno |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El PR #207 modifica `service.py`, `router.py` y las pruebas de atención. | Aplicar después de integrar #207 y actualizar la rama con `develop`. |
| Dos mozos cambian la misma línea a la vez. | Gana el último valor (PUT absoluto); si la comanda se cerró, el segundo recibe 409 y el modal recarga. |
| La migración toca el esquema y la cadena de Alembic (ya hubo conflicto en #205). | Encadenar a la última revisión de `develop` y probar subir y bajar. |
| Se modifican componentes escritos por Juan. | Cambios mínimos; los revisa Juan. |

## Plan de reversión

Revertir el merge en `develop` y ejecutar `alembic downgrade` de la migración nueva, que elimina `cantidad_entregada`. `estado_entrega` se conserva y sigue siendo coherente, de modo que el cierre no cambia. Se pierde solo el detalle parcial; las líneas parcialmente entregadas quedan `PENDIENTE`.

## Dependencias

- PR #206 integrado (comandas). PR #207 integrado antes de `/sdd-apply`.

## Criterios de éxito

- [ ] CA1 y CA2 tienen pruebas que pasan en el backend y en el frontend.
- [ ] Una comanda se puede cerrar después de entregar todo, sin SQL manual, y no se puede cerrar tras desmarcar una unidad.
- [ ] La migración conserva el estado de las líneas ya `ENTREGADO`.
- [ ] CI en verde.
- [ ] El equipo valida S1 a S9.
