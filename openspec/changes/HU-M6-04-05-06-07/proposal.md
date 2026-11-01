# Propuesta: HU-M6-04 a HU-M6-07 (ABM y listado de medios de pago)

- **Issues:** #74, #75, #76, #77 · **Épica:** #73
- **Rama:** `feature/HU-M6-04-05-06-07-abm-medio-pago`
- **Cambio agrupado por ABM:** una misma entidad (`MedioPago`) y un mismo responsable (AGENTS.md §4).

## Intención

El módulo de Pagos todavía no permite configurar con qué se puede cobrar. Este cambio agrega la entidad `MedioPago` con su alta, modificación, baja lógica y listado, en el backend y en la pantalla `/pagos`, para que las facturas y los cobros (HU-M6-01 a 03, Sprint 3) tengan los medios de pago ya cargados.

## Alcance

### Incluido

- Entidad `MedioPago` y su migración de Alembic.
- `POST`, `PUT`, `DELETE` y `GET` sobre `/api/v1/medios-de-pago`.
- Pantalla `/pagos`: tabla de medios de pago, diálogo de alta y edición, confirmación de eliminación y aviso de lista vacía.
- Una prueba por criterio de aceptación de #74 a #77 (camino feliz y error o límite).

### Excluido

- Factura, cobro y comprobante (HU-M6-01 a 03, Sprint 3). Los criterios de #75 y #76 que dependen de `Cobro` quedan diferidos (S5).
- La segunda tabla de la maqueta (facturas con saldo pendiente).
- El reporte «recaudación por medio de pago y deuda pendiente».
- Autenticación y roles.

## Capacidades

### Nuevas

- `pagos-medios-de-pago`: alta, modificación, baja lógica y listado de medios de pago.

### Modificadas

- Ninguna.

## Decisiones tomadas

- **D1. Contrato REST.** `POST /medios-de-pago` (201), `PUT /medios-de-pago/{id}` (200, reemplazo completo con estado), `DELETE /medios-de-pago/{id}` (204) y `GET /medios-de-pago` (200, paginado). Verbos de D-23 y códigos de D-25.
- **D2. Nombre único normalizado.** `nombre_normalizado = strip().casefold()`, mantenido por un validador del modelo, con índice único parcial sobre los no eliminados.
- **D3. Baja lógica.** Eliminar marca `eliminado = true`. La fila se conserva, así los cobros futuros que la referencien siguen mostrando con qué se pagó.
- **D4. `TipoMedioPago` en `pagos/models.py`.** Solo lo usa el módulo de Pagos, así que no se toca `shared/`.
- **D5. Estado.** El alta no lo recibe (siempre `HABILITADO`); la modificación lo recibe y es obligatorio (#75).
- **D6. Listado.** Excluye siempre los eliminados, ordena por nombre sin distinguir mayúsculas y por defecto muestra solo los habilitados.
- **D7. Un solo diálogo.** `MedioPagoFormDialog` da de alta o edita según reciba un medio de pago, igual que el diálogo de sectores.

## Enfoque

Backend por capas (D-01 a D-03): el `router` solo delega, el `service` valida existencia y unicidad y confirma la transacción, el `repository` consulta sin confirmar (D-10). Frontend por módulo: toda llamada pasa por `modules/pagos/api.ts` (D-16); la pantalla usa `useApi` + `usePaginacion` y los componentes compartidos (`DataTable`, `Dialog`, `useConfirm`, `EmptyState`).

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | El cambio implementa HU-M6-07 como «Listar los medios de pago» (issue #77), no como el reporte que figura en el backlog. |
| S2 | `GET /medios-de-pago` muestra por defecto solo los habilitados (criterio de #77). El parámetro `incluir_deshabilitados=true` suma los deshabilitados, para poder volver a habilitarlos (#75). Nunca se devuelven los eliminados. |
| S3 | La unicidad del nombre cuenta solo los medios no eliminados: el nombre de uno eliminado puede reutilizarse. |
| S4 | Los valores de `tipo` en la API son `EFECTIVO`, `TARJETA`, `TRANSFERENCIA` y `BILLETERA_VIRTUAL` (diagrama de clases). |
| S5 | Los criterios que dependen de `Cobro` (eliminar con un cobro en curso; los cobros anteriores muestran el nombre y la forma de pago) se ejercitan cuando exista `Cobro` (Sprint 3). Hoy solo se comprueba que la fila se conserva y que el nombre se actualiza en el mismo registro. |
| S6 | Los caracteres permitidos del nombre son letras (con acentos y ñ), números, espacios, punto y guion. Los espacios intermedios repetidos se admiten; solo se recortan los de los extremos. |
| S7 | La descripción vacía o solo con espacios se guarda como `null`. |
| S8 | Un id inexistente o ya eliminado responde 404 con «El medio de pago {id} no existe». El nombre repetido responde 409 con «El medio de pago ya existe». |
| S9 | La pantalla es una sola para el encargado y el cajero. Una casilla «Mostrar deshabilitados» agrega los deshabilitados al listado. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/pagos/{models,schemas,repository,service,router}.py` | Modificado (hoy vacíos) |
| `backend/app/main.py` | Modificado: registra el router de pagos |
| `backend/alembic/versions/<id>_crea_medios_pago.py` | Nuevo |
| `backend/tests/modules/pagos/` | Nuevo |
| `frontend/src/modules/pagos/{api,types}.ts` | Modificado |
| `frontend/src/modules/pagos/components/` | Nuevo (tabla, diálogo y hooks) |
| `frontend/src/modules/pagos/pages/PagosPage.tsx` | Modificado |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Índice único parcial en SQLite. | Prueba de migración desde cero y prueba de reutilización del nombre. |
| Reemplazar el `EmptyState` de la pantalla. | Se actualiza su prueba en el mismo commit. |
| Cobro todavía no existe. | Los escenarios diferidos quedan marcados en la spec y en `verify-report.md`. |

## Plan de reversión

Revertir el merge elimina las rutas, la pantalla y la migración. `alembic downgrade -1` borra la tabla `medios_pago`; no hay datos de otras entidades que la referencien todavía.

## Dependencias

- Ninguna HU previa (la tarjeta dice «Depende de: —»).
- HU-M6-01 a 03 (Sprint 3) usan esta entidad.

## Criterios de éxito

- [ ] Cada criterio ejercitable de #74 a #77 tiene una prueba que pasa.
- [ ] CI en verde: `ruff`, `lint-imports`, `pytest` ≥ 70 %, `npm run lint`, `format:check`, `typecheck`, `test:coverage` ≥ 60 % y `build`.
- [ ] La migración se aplica desde cero sin errores.
- [ ] La pantalla `/pagos` permite crear, editar, eliminar y listar medios de pago.
