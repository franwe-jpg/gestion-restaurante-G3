# Propuesta — S4-02 Aplicar las promociones en la comanda y la factura

- **Issue:** [#223](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/223) — **Rama:** `feature/S4-02-aplicar-promociones`
- **Módulos:** M2 `menus/` y M4 `atencion/`. Sin cambios de esquema ni de API.

## Intención

Hoy una comanda nunca aplica promociones: `CatalogoDeCarta.cotizar` deja siempre `descuento = 0`
y `promocion_id = None`. El reporte de impacto de promociones (#81) depende de estos datos, y la
factura tampoco puede mostrar un descuento que nunca se calcula. Este cambio completa la aplicación
de la promoción vigente al cotizar cada línea.

## Alcance

### Incluido

- Resolver en `menus.service` la promoción vigente para un producto en un instante dado, según
  estado, fechas, día de la semana y franja horaria.
- Calcular el descuento absoluto de la línea para los tipos `PORCENTAJE`, `PRECIO_FIJO` y `NXM`.
- Aplicar el descuento y guardar `promocion_id` en cada línea nueva de la comanda, desde
  `atencion/adaptadores.py` y usando solo el `service` de M2.
- Elegir la promoción de mayor descuento cuando más de una califique.
- Comprobar que la factura copia el descuento de la línea.
- Pruebas de: línea con promoción vigente, sin promoción, con promoción finalizada, fuera de
  vigencia, por tipo y con remanente NxM.

### Excluido

- Cambios de esquema, migraciones, rutas HTTP o del contrato de Comanda (S2-01).
- Recalcular comandas ya guardadas al modificar o finalizar una promoción.
- Promociones sobre menús ejecutivos.
- Mostrar el nombre de la promoción en la comanda o en la factura.
- El reporte de impacto de promociones (#81).

## Capacidades

### Nuevas

- `promociones-en-comanda`: aplicación de la promoción vigente a cada línea de comanda y su
  descuento en la factura.

### Modificadas

- Ninguna spec archivada.

## Enfoque

- `menus/promociones.py` concentra la vigencia y el cálculo puro; `menus.service` expone
  `promocion_para_linea`, que devuelve `promocion_id` y el descuento absoluto ya redondeado.
- `CatalogoDeCarta.cotizar` consulta esa función después de resolver el precio y completa la salida.
- La factura no cambia: ya resta y copia `descuento`; se agrega una prueba con una promoción real.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | La promoción se asocia solo a `Producto` (incluye `MENU_DEL_DIA`); un `MenuEjecutivo` nunca recibe promoción. |
| S2 | El día y la hora se evalúan en UTC-3 fijo, igual que el reporte de salón; se unificará en `shared/` más adelante. |
| S3 | La franja horaria es semiabierta: `hora_desde <= hora < hora_hasta`. |
| S4 | Si dos promociones califican, se aplica la de mayor descuento; en empate, la de menor id. |
| S5 | Si el descuento calculado es cero (por ejemplo, NxM sin grupo completo), la línea no lleva `promocion_id`. |
| S6 | El descuento se redondea a dos decimales con `ROUND_HALF_UP` y se limita al importe bruto de la línea. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/menus/{promociones,service,repository}.py` | Nuevo cálculo y consulta de vigencia. |
| `backend/app/modules/atencion/adaptadores.py` | Cotización con descuento y promoción. |
| `backend/tests/modules/menus/` y `backend/tests/modules/atencion/` | Pruebas nuevas. |
| `backend/tests/modules/pagos/test_facturas.py` | Prueba de la factura con promoción real. |
| `openspec/changes/S4-02/` | Artefactos del cambio. |
