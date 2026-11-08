# Especificación · Comprobante de pago (HU-M6-03)

**Estado:** BORRADOR para revisión · **Fuente:** issue #72, diagrama de clases (`Cobro.numeroComprobante`, `verComprobante()`) y `proposal.md` (supuestos S1–S6).

## Contrato de la API

| Método y ruta | Entrada | Salida | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/comprobantes/{numero_comprobante}` | `numero_comprobante` entero | `200` `ComprobanteSalida` | `404`, `422` |
| `GET /api/v1/comprobantes/{numero_comprobante}/pdf` | `numero_comprobante` entero | `200` `application/pdf`, adjunto `comprobante-{numero}.pdf` | `404`, `422` |

- `ComprobanteSalida`:
  - `numero_comprobante`, `fecha_hora` (del cobro, UTC) y `monto`.
  - `medio_pago`: `id`, `nombre` y `tipo`.
  - `cobro_id`, `factura_id` y `comanda_id`.
  - `total_factura` y `saldo_pendiente` de la factura (S6).
- Importes como cadenas con 2 decimales. Errores `{"detalle": "mensaje"}` (D-26).
- Un `numero_comprobante` no numérico responde `422` (validación de FastAPI).

## Requisitos y escenarios

### R1 · Datos del comprobante
#### Escenario C01 (CA1, camino feliz)
- **Dado** un cobro registrado con un medio de pago **Cuando** pido `GET /comprobantes/{numero}` **Entonces** responde `200` con el número de comprobante, la fecha y hora del cobro, el importe pagado y el nombre y el tipo del medio de pago.
#### Escenario C02 (CA1, límite)
- **Dado** una factura con dos cobros (HU-M6-01 y HU-M6-02) **Cuando** pido el comprobante del segundo **Entonces** muestra solo el importe y el medio de ese cobro, no los del primero ni el total.

### R2 · Asociación con el cobro, la factura y la comanda
#### Escenario C03 (CA2, camino feliz)
- **Dado** un cobro de la factura F de la comanda C **Cuando** pido su comprobante **Entonces** `cobro_id`, `factura_id` y `comanda_id` son los de ese cobro, F y C.
#### Escenario C04 (CA2, límite)
- **Dado** dos facturas de comandas distintas **Cuando** pido el comprobante de un cobro de cada una **Entonces** cada comprobante queda asociado a su propia factura y comanda.

### R3 · Sin pago registrado
#### Escenario C05 (CA3, error)
- **Dado** un `numero_comprobante` que no corresponde a ningún cobro **Cuando** pido el comprobante (JSON o PDF) **Entonces** responde `404` con `No hay un pago registrado con el comprobante {numero}` y no se crea nada.
#### Escenario C06 (CA3, límite)
- **Dado** que no hay ningún cobro registrado **Cuando** pido el comprobante `1` **Entonces** responde `404`.

### R4 · Un único comprobante por cobro
#### Escenario C07 (CA4, camino feliz)
- **Dado** un comprobante ya pedido **Cuando** lo pido otra vez **Entonces** responde `200` con exactamente los mismos datos y la cantidad de cobros y facturas no cambia.
#### Escenario C08 (CA4, límite)
- **Dado** un cobro **Cuando** pido el JSON y el PDF de su comprobante **Entonces** los dos llevan el mismo número de comprobante.

### R5 · Comprobante en PDF (S3)
#### Escenario C09
- **Dado** un cobro registrado **Cuando** pido `GET /comprobantes/{numero}/pdf` **Entonces** responde `200`, `Content-Type: application/pdf`, `Content-Disposition` adjunto con el nombre `comprobante-{numero}.pdf`, y el contenido empieza con `%PDF`.
#### Escenario C10 (límite)
- **Dado** un medio de pago con acentos y ñ en el nombre **Cuando** pido el PDF **Entonces** se genera sin error.

## Pantalla (guía: `SPRINT-2/S2-04-maqueta/pagos.html`)

- La pestaña «Facturas» agrega la acción «Comprobantes» en cada fila, adeudada o pagada.
- El diálogo «Comprobantes de la factura #F» lista los cobros (medio, monto, fecha y número de comprobante) con el botón «Ver comprobante».
- Al elegir un cobro se muestran los datos del comprobante (número, fecha, importe, medio de pago, factura y comanda), el botón «Descargar PDF» y el botón «Volver» a la lista.
- Si la carga falla o el comprobante no existe, se muestra el mensaje del backend en un `Alert` (CA3).
- **Diferencia con la maqueta:** la maqueta no dibuja el comprobante; se usa el mismo estilo de diálogos y tablas de la pestaña. Se anota en el PR.
