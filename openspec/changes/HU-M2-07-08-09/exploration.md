# Exploración: HU-M2-07-08-09 Crear, modificar y finalizar una promoción

## Contexto

- Issues: [#29](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/29) (crear), [#30](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/30) (modificar) y [#31](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/31) (finalizar). Épica: [#28](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/28).
- Módulo: M2 Menús y Promociones (`backend/app/modules/menus/`, `frontend/src/modules/menus/`).
- Rama: `feature/HU-M2-07-08-09-promociones`, desde `develop`.

## Estado verificado

| Elemento | Estado |
| --- | --- |
| `backend/app/modules/menus/models.py` | Solo `MenuEjecutivo` y su tabla intermedia. Sin `Promocion`. |
| `backend/app/modules/menus/schemas.py` | Schemas de menús. Sin promociones. |
| `backend/app/modules/menus/router.py` | Rutas de menús ejecutivos y del día. Sin `/promociones`. |
| `frontend/src/modules/menus/pages/MenusPage.tsx` | Tercera pestaña con `EmptyState` de «Sprint 3». |
| `backend/app/modules/atencion/adaptadores.py` | Comenta que las promociones «todavía no existen» y no calcula descuento. |
| `backend/app/modules/atencion/models.py` | `DetalleComanda.promocion_id` existe como escalar sin FK; sirve para saber si una promoción fue aplicada. |
| Diagrama de clases | `Promocion` con nombre único, tipo, vigencia, días, franja horaria, campos por tipo, estado y `fechaHoraFinalizacion`. |
| Alembic | Cabeza actual `d6f8a0c2e4b6`; `app.modules.menus.models` ya está registrado en `alembic/env.py`. |
| Contratos de importación | `menus` no puede importar `productos.{router,repository,models,schemas}`; solo su `service`. |

## Dependencias

- No hay issues bloqueantes abiertos para HU-M2-07.
- La aplicación de la promoción en una venta (CA 11) pertenece a M4. La spec de M4
  (`openspec/changes/HU-M4-04-07-09-comandas/`) todavía tiene pendiente la fórmula, el redondeo y el
  alcance del descuento.

## Decisiones que necesitan acuerdo

6. **Finalización y historial.** Finalizar solo cambia `promociones.estado` y guarda `fecha_hora_finalizacion`; no toca `detalles_comanda`. M4 ya conserva precio y descuento históricos.

1. **CA 11 fuera de alcance de M2.** Este cambio guarda la regla NxM; M4 la aplica al cotizar.
2. **Detección de uso.** M2 consulta `atencion.service.promocion_fue_aplicada`, una función de solo lectura de M4; el contrato de importaciones permite usar el `service` de otro módulo. Avisar a Juan Ignacio (M4).
2. **Productos permitidos.** Se aceptan productos habilitados de cualquier categoría, incluido
   `MENU_DEL_DIA`. Los menús ejecutivos no son `Producto` y no aplican.
3. **Días en JSON.** Se guardan como lista de `DiaSemana`; la API valida que no esté vacía ni tenga
   repetidos. SQLite no lo impone en la base.
4. **Descripción opcional.** El diagrama la define `[0..1]`; el issue no la pide. Se acepta como
   campo opcional.
5. **`fechaHoraFinalizacion`.** No se agrega en este cambio; la incorpora HU-M2-09 con su migración.
