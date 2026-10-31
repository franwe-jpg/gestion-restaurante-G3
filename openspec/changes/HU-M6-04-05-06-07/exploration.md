# Exploración: HU-M6-04 a HU-M6-07 (ABM y listado de medios de pago)

- **Issues:** [#74](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/74) (HU-M6-04 Crear), #75 (HU-M6-05 Modificar), #76 (HU-M6-06 Eliminar) y #77 (HU-M6-07 Listar) · **Épica:** #73
- **Rama:** `feature/HU-M6-04-05-06-07-abm-medio-pago`, creada desde `develop` en `33ad371`.
- **Cambio agrupado:** AGENTS.md §4 permite juntar el ABM y el listado de una misma entidad con el mismo responsable. La tarea madre pide las cuatro HU, con la migración, las pruebas y las pantallas.

## Estado del repositorio

| Pieza | Estado |
| --- | --- |
| `backend/app/modules/pagos/` | Cinco archivos vacíos (`router`, `service`, `repository`, `models`, `schemas`) con un comentario. |
| `backend/alembic/env.py` | Ya registra `app.modules.pagos.models`. |
| `backend/pyproject.toml` | Ya tiene el contrato de importación «Otros módulos solo usan el service de pagos». |
| `backend/app/main.py` | Registra los routers de `menus`, `productos` y `salon`; falta el de `pagos`. |
| Migraciones | Una sola cabeza: `0e9f2fe2e157` (une menús y mozos). |
| `Estado` | `HABILITADO` / `DESHABILITADO` en `app/shared/models/enums.py`, listo para usar. |
| `TipoMedioPago` | No existe: el diagrama lo define con `EFECTIVO`, `TARJETA`, `TRANSFERENCIA` y `BILLETERA_VIRTUAL`. |
| Frontend `/pagos` | `PagosPage` es un `EmptyState` «Módulo pendiente de implementación». `api.ts` y `types.ts` traen un `listarPagos` y un `ComprobantePago` de relleno. |
| `clienteHttp` | Tiene `get`, `post`, `put` y `delete` (lo usa Salón). |

## Entidad en el diagrama de clases

`MedioPago` (M6): `id`, `nombre` (3 a 50, único), `tipo` (`TipoMedioPago`), `descripcion` (opcional, hasta 200), `estado` (`Estado`, por defecto `HABILITADO`) y `eliminado` (`bool`, por defecto `false`, **baja lógica**).

## Contradicciones y huecos detectados

1. **HU-M6-07 en el backlog.** `G3_Backlog.xlsx` describe HU-M6-07 como el reporte «recaudación por medio de pago y deuda pendiente». El issue #77 dice «Listar los medios de pago». Por AGENTS.md §2 gana el issue: este cambio implementa el listado.
2. **El listado de #77 solo muestra los habilitados, pero #75 pide poder volver a habilitar.** Un medio deshabilitado no aparecería en ninguna pantalla y no se podría volver a habilitar. Se resuelve con un parámetro opcional que incluye los deshabilitados (Supuesto S2).
3. **Criterio de #76 sobre «cobro en curso» y criterios sobre «cobros anteriores».** `Cobro` es de HU-M6-02 (Sprint 3) y no existe. Esos escenarios no se pueden ejercitar todavía (Supuesto S5).
4. **Unicidad frente a la baja lógica.** Los issues no dicen si el nombre de un medio eliminado queda reservado. Se propone que no (Supuesto S3).
5. **La maqueta (`pagos.html`) muestra dos tablas.** La primera (Nombre, Tipo, Descripción, Estado, Acciones, con el formulario «Nuevo medio de pago») es de este cambio. La segunda (N.º comanda, Mesa, Emisión, Total, Saldo pendiente) es de las facturas (Sprint 3) y queda fuera.
6. **No hay autenticación ni roles.** «Encargado» y «cajero» usan la misma pantalla.

## Patrón de referencia en el repositorio

El ABM de sectores del módulo Salón (`salon/`) fija el patrón y se reutiliza casi igual:

- Nombre único sin distinguir mayúsculas ni espacios: columna `nombre_normalizado` mantenida por un validador del modelo e índice único.
- `service`: obtener (404) → validar nombre libre excluyendo el propio id (409) → asignar → `commit` con `IntegrityError` → 409 y `rollback`.
- Esquemas `XCrear` (prohíbe campos extra), `XModificar` y `XSalida`; listado con `Pagina[T]` y `ParametrosPaginacion`.
- Frontend: diálogo de formulario reutilizado para alta y edición, hook de formulario, validador local, hook de baja con `useConfirm`, tabla con `DataTable`, listado con `useApi` + `usePaginacion`.

## Riesgos de implementación

| Riesgo | Mitigación |
| --- | --- |
| Índice único parcial (`WHERE eliminado = 0`) en SQLite. | SQLAlchemy y Alembic lo soportan con `sqlite_where`; hay prueba de migración y de reutilización del nombre. |
| El patrón de caracteres con Unicode en Pydantic. | Prueba con acentos y ñ aceptados y con símbolos rechazados. |
| Reemplazar el `EmptyState` de `PagosPage`. | Se actualizan las pruebas del módulo en el mismo commit. |
| Quitar `listarPagos` / `ComprobantePago` de relleno. | Se comprueba que nada más los use antes de borrarlos; si los usa algo, se dejan. |
