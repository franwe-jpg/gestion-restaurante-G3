# Exploración — S4-02 Aplicar las promociones en la comanda y la factura

- **Issue:** [#223](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/223)
- **Rama:** `feature/S4-02-aplicar-promociones`
- **Módulos:** M2 `menus/` (dueño de la regla) y M4 `atencion/` (dueño de la comanda).

## Estado actual

- `Crear`, `modificar` y `finalizar` promociones existen desde HU-M2-07-08-09; `Promocion` guarda
  tipo, vigencia, días, horario y productos.
- `atencion/adaptadores.py::CatalogoDeCarta.cotizar` siempre deja `descuento = 0` y
  `promocion_id = None`; el comentario «las promociones todavía no existen» quedó desactualizado.
- El contrato de comanda (`shared/contratos/comanda.py`) ya tiene `precio_unitario`, `descuento` y
  `promocion_id` en `DetalleComandaSalida`.
- `pagos/service.py` calcula `subtotal = cantidad * precio_unitario - descuento` y ya copia ese
  descuento a la factura; `FacturarComandaDialog` muestra la columna «Descuento».
- `DetalleComanda.promocion_id` no tiene FK entre módulos; se guarda como dato histórico.

## Dónde encaja el cambio

| Punto | Archivo | Qué falta |
| --- | --- | --- |
| Regla de vigencia y descuento | `backend/app/modules/menus/` | Resolver la promoción aplicable a una línea y devolver el descuento absoluto. |
| Cotización de la comanda | `backend/app/modules/atencion/adaptadores.py` | Completar `descuento` y `promocion_id` usando solo `menus.service` (RNF-MAN-09). |
| Factura | `backend/app/modules/pagos/service.py` | Ya resta y copia el descuento; solo falta comprobarlo con una promoción real. |

## Restricciones y hallazgos

- Los contratos de importación permiten que M4 importe `menus.service`, nunca `repository`,
  `models` ni `schemas`.
- `precio_unitario` y `descuento` son importes por línea: el descuento es el total de la línea, no
  el de una unidad (`DetalleComanda` y la factura ya lo tratan así).
- La promoción se asocia solo a `Producto` (incluye categoría `MENU_DEL_DIA`); un `MenuEjecutivo`
  no tiene promociones en el modelo ni en la spec de M2.
- El restaurante trabaja en UTC-3 fijo. `salon/reporte.py` ya define esa zona con una nota de
  unificación futura en `shared/`.
- El cálculo NxM quedó explícitamente fuera de alcance en M2: «lleva 2, paga 1» sobre 3 unidades
  aplica a 2 y deja 1 a precio regular.

## Riesgos del cambio

| Riesgo | Mitigación |
| --- | --- |
| Duplicar la zona horaria del restaurante | Constante local documentada y `Supuesto:` de unificación futura. |
| Dos promociones vigentes para el mismo producto | Se elige la de mayor descuento y, en empate, la de menor id (`Supuesto:`). |
| Promociones con descuento cero (NxM sin grupo completo) | La línea queda sin promoción y sin descuento. |
| Cambios históricos al finalizar una promoción | La línea guarda `promocion_id` y el descuento calculado; nada se recalcula después. |
