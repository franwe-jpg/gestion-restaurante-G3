# Diseño — S4-02 Aplicar las promociones en la comanda y la factura

## Decisiones

| # | Decisión | Alternativa descartada | Por qué |
| --- | --- | --- | --- |
| D1 | La vigencia y el cálculo viven en `menus/promociones.py`; `menus.service` los expone. | Calcular en `atencion/adaptadores.py`. | La promoción es de M2 y M4 no debe interpretar porcentajes, precios fijos ni NxM. |
| D2 | `promocion_para_linea` devuelve `PromocionAplicable(promocion_id, descuento)` con el importe absoluto ya redondeado. | Devolver la entidad o el porcentaje y calcular en M4. | El puerto `CatalogoPort` exige un descuento absoluto calculado por su dueño. |
| D3 | La consulta filtra por producto, estado y fechas en SQL; el día y la hora se evalúan en Python sobre la fecha local. | Filtrar el JSON `dias_semana` en SQL. | SQLite no ofrece una comparación simple y portable sobre el JSON; la lista es corta. |
| D4 | El día y la hora se interpretan en UTC-3 fijo (`ZONA_DEL_RESTAURANTE`), con una nota de unificación futura en `shared/`. | Usar UTC o mover la zona a `shared/`. | `salon/reporte.py` ya usa UTC-3; tocar `shared/` requiere coordinar con otros módulos. |
| D5 | La franja horaria es semiabierta: `hora_desde <= hora < hora_hasta`. | Incluir `hora_hasta`. | Evita solapamientos en el borde y coincide con los intervalos del reporte de salón. |
| D6 | Si dos promociones califican, se elige la de mayor descuento; en empate, la de menor id. | Aplicar la primera encontrada. | El resultado debe ser determinista y favorable al cliente. |
| D7 | Solo se asigna `promocion_id` cuando el descuento es mayor que cero. | Asignarlo siempre que la promoción esté vigente. | Una línea sin descuento no fue alcanzada por la promoción (por ejemplo, NxM incompleto) y el reporte la cuenta como regular. |
| D8 | `CatalogoDeCarta` acepta un reloj inyectable (`ahora`), con `datetime.now(UTC)` por defecto. | Usar `datetime.now` dentro de `cotizar`. | Permite pruebas deterministas sin congelar el reloj global. |
| D9 | El descuento se redondea a dos decimales con `ROUND_HALF_UP` y se acota entre 0 y el bruto de la línea. | Truncar o no acotar. | Coincide con el resto de los importes del sistema y evita descuentos negativos o mayores al total. |

## Cálculo

`bruto = precio_unitario * cantidad`

| Tipo | Descuento |
| --- | --- |
| `PORCENTAJE` | `bruto * descuento_porcentaje / 100` |
| `PRECIO_FIJO` | `max(0, (precio_unitario - precio_fijo) * cantidad)` |
| `NXM` | `precio_unitario * ((cantidad // cant_lleva) * (cant_lleva - cant_paga))` |

El resultado se cuantiza a `0.01` con `ROUND_HALF_UP` y se limita a `[0, bruto]`.

## Capas

- `menus/repository.py`: `promociones_del_producto(db, producto_id, fecha)` devuelve las promociones
  habilitadas que incluyen el producto y cubren la fecha, ordenadas por id.
- `menus/promociones.py`: `PromocionAplicable`, `es_vigente`, `calcular_descuento`,
  `elegir_promocion`.
- `menus/service.py`: `promocion_para_linea(...)` resuelve el menú ejecutivo (sin promoción),
  consulta el repositorio y elige la mejor promoción. No hace commit.
- `atencion/adaptadores.py`: `CatalogoDeCarta(ahora=...)`; `cotizar` obtiene el precio y luego
  completa `descuento` y `promocion_id`.
- `pagos/service.py`: sin cambios; ya copia `descuento` y calcula el subtotal.

## Importaciones

- `atencion` importa `menus.service`, permitido por el contrato (RNF-MAN-09).
- `menus.promociones` importa `menus.models`; `menus.service` importa `menus.promociones`.
- No se importan `repository`, `models` ni `schemas` de otros módulos.

## Pruebas

- `backend/tests/modules/menus/test_promociones.py`: vigencia por fecha, día y hora; porcentaje,
  precio fijo, NxM con remanente, descuento acotado, empate y menú ejecutivo.
- `backend/tests/modules/atencion/test_adaptadores.py`: línea con promoción vigente, sin promoción,
  finalizada y menú ejecutivo.
- `backend/tests/modules/pagos/test_facturas.py`: factura de una comanda creada con una promoción
  real, con el descuento y el subtotal correctos.
- `backend/tests/modules/menus/test_repository.py` (o el archivo equivalente): consulta de
  promociones por producto y fecha.

## Aislamiento

Sin migraciones ni cambios de esquema. El cambio queda en `backend/app/modules/menus/`,
`backend/app/modules/atencion/adaptadores.py`, `backend/tests/modules/{menus,atencion,pagos}/` y
`openspec/changes/S4-02/`. No se modifican rutas HTTP ni el contrato de Comanda.
