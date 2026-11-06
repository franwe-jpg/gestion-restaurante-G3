# Especificación · Facturas de comandas (HU-M6-01)

**Estado:** BORRADOR para revisión · **Fuente:** issue #70, diagrama de clases y `proposal.md` (supuestos S1–S8).

## Contrato de la API

| Método y ruta | Entrada | Salida | Errores |
| --- | --- | --- | --- |
| `GET /facturas/previsualizar?comanda_id=` | `comanda_id` entero > 0 | `200` `FacturaPrevia` | `404`, `409`, `422` |
| `POST /facturas` | `FacturaCrear` | `201` `FacturaSalida` | `404`, `409`, `422` |
| `GET /facturas/{factura_id}` | — | `200` `FacturaSalida` | `404` |

- `FacturaCrear`: `comanda_id` (entero > 0) y `cobro` = `{medio_pago_id` (entero > 0), `monto` (decimal > 0, 2 decimales)`}`.
- `FacturaPrevia`: `comanda_id`, `fecha_emision`, `total` y `detalles`.
- `FacturaSalida`: `id`, `comanda_id`, `fecha_emision`, `total`, `saldo_pendiente`, `estado` (`ADEUDADA`/`PAGADA`), `detalles` y `cobros`.
- Detalle: `producto_id` o `menu_ejecutivo_id` (uno solo), `descripcion`, `cantidad`, `precio_unitario`, `descuento`, `subtotal`.
- Cobro: `id`, `numero_comprobante`, `monto`, `fecha_hora`, `medio_pago_id`.
- Importes serializados como cadenas con 2 decimales (igual que Productos). Errores `{"detalle": "mensaje"}`.

## Requisitos y escenarios

### R1 · Vista previa de una comanda cerrada
#### Escenario F01 (CA1, camino feliz)
- **Dado** una comanda CERRADA sin factura **Cuando** pido la vista previa **Entonces** recibo `200` con una línea por cada línea de la comanda, la fecha de emisión y el total a pagar, y no se crea nada.

### R2 · Confirmar la factura junto con su primer cobro
#### Escenario F02 (CA2, camino feliz)
- **Dado** una comanda CERRADA y un medio de pago HABILITADO **Cuando** confirmo con `monto` igual al total **Entonces** responde `201`, la factura queda PAGADA con `saldo_pendiente` 0.00 y un cobro con `numero_comprobante`.
#### Escenario F03 (S3)
- **Dado** el mismo caso **Cuando** confirmo con un `monto` menor al total **Entonces** la factura queda ADEUDADA con `saldo_pendiente = total − monto`.
#### Escenario F04 (límite del cobro)
- **Dado** el mismo caso **Cuando** el `monto` es mayor que el total, cero o negativo **Entonces** responde `422` y no se crea factura ni cobro.
#### Escenario F05 (S7)
- **Dado** un medio de pago inexistente o eliminado **Entonces** `404`; **dado** uno DESHABILITADO **Entonces** `409`. En ambos casos no se crea nada.

### R3 · Solo comandas cerradas
#### Escenario F06 (CA3, error)
- **Dado** una comanda ABIERTA (o ANULADA, S8) **Cuando** intento facturarla (vista previa o confirmación) **Entonces** responde `409` con `La comanda no está cerrada` y no se crea nada.
#### Escenario F07
- **Dado** una comanda inexistente **Entonces** `404`.

### R4 · Detalle copiado de la comanda
#### Escenario F08 (CA4)
- **Dado** una comanda con productos y un menú ejecutivo, uno con descuento **Cuando** se genera la factura **Entonces** hay una línea por cada línea de la comanda con `producto_id` o `menu_ejecutivo_id`, `cantidad`, `precio_unitario` y `descuento` copiados, `subtotal = cantidad × precio_unitario − descuento`, y `total` = suma de subtotales.

### R5 · Una sola factura por comanda
#### Escenario F09 (CA5, error)
- **Dado** una comanda ya facturada **Cuando** intento facturarla otra vez **Entonces** responde `409` con `La comanda ya fue facturada` y no se crea otra factura ni otro cobro. Una carrera entre dos confirmaciones también termina en `409` (índice único sobre `comanda_id`).

### R6 · La factura conserva lo facturado
#### Escenario F10 (CA6)
- **Dado** una factura generada **Cuando** cambia el precio de un producto que contiene **Entonces** `GET /facturas/{id}` devuelve el `precio_unitario` original.
#### Escenario F11 (CA7)
- **Dado** una factura con un producto dado de baja después **Cuando** la consulto **Entonces** el producto sigue en el detalle con su `descripcion` y su `precio_unitario`.

### R7 · Consulta
#### Escenario F12
- `GET /facturas/{id}` existente devuelve `200` con la factura completa; inexistente devuelve `404`.

### R8 · Atomicidad
#### Escenario F13
- **Dado** que el cobro es inválido o falla algún paso **Entonces** no queda factura, detalle ni cobro (una sola transacción).

## Pantalla (guía: `SPRINT-2/S2-04-maqueta/pagos.html`)
- Botón «Facturar comanda» en `PagosPage`. Diálogo: N° de comanda → «Ver factura» (vista previa con detalle, fecha y total) → medio de pago (solo habilitados) e importe (por defecto el total) → «Confirmar». Errores del servidor visibles en el diálogo.
- **Diferencia con la maqueta:** no hay tabla de facturas con «Cobrar» (S6); se anota en el PR.
