# Propuesta · HU-M6-03 Generar el comprobante de pago

- **Issue:** [#72](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/72) · **Épica:** #69
- **Rama:** `feature/HU-M6-03-comprobante-pago`
- **Responsable:** Héctor Sánchez.

## Intención

Como cajero, quiero generar el comprobante de pago para entregarlo al cliente. Cada cobro registrado (el primero de HU-M6-01 y los siguientes de HU-M6-02) ya tiene su número de comprobante. Esta HU expone ese comprobante con los datos del cobro, de la factura y de la comanda, lo muestra en la pantalla de pagos y permite descargarlo en PDF para entregarlo.

## Alcance

### Incluido

- `GET /api/v1/comprobantes/{numero_comprobante}`: datos del comprobante en JSON.
- `GET /api/v1/comprobantes/{numero_comprobante}/pdf`: el mismo comprobante en PDF, con `backend/app/shared/pdf.py`.
- Acción «Comprobantes» en cada fila de la pestaña «Facturas» (adeudadas y pagadas): un diálogo lista los cobros de la factura y muestra el comprobante del cobro elegido, con el botón «Descargar PDF».
- Una prueba por criterio de aceptación de #72 (camino feliz y error o límite).

### Excluido

- Anular, reimprimir con otro número o enviar el comprobante por correo.
- Datos fiscales (CUIT, condición frente al IVA, punto de venta): la consigna no los pide.
- Cambios en la factura, el cobro o la comanda.

## Decisiones

- **D1. Sin entidad nueva ni migración.** El comprobante es la vista del `Cobro` (`verComprobante()` del diagrama de clases). Su número es `Cobro.numero_comprobante`, que ya es único. «Generar» el comprobante es construirlo a partir del cobro guardado.
- **D2. Contrato REST.** `GET /comprobantes/{numero}` (200) devuelve `ComprobanteSalida`; `GET /comprobantes/{numero}/pdf` (200) devuelve `application/pdf` como adjunto. Un número sin cobro responde 404 (D-25).
- **D3. Idempotencia.** Las dos rutas son de solo lectura: pedir el mismo comprobante otra vez devuelve los mismos datos y no crea filas (CA4).
- **D4. PDF con el ayudante compartido.** Se usa `renderizar` de `shared/pdf.py` sin modificarlo. El nombre del medio de pago sale de `MedioPago`, que es del mismo módulo.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | El comprobante se identifica por su `numero_comprobante` (hoy igual al `id` del cobro), no por el id de la factura: una factura con varios cobros tiene varios comprobantes, uno por cobro. |
| S2 | «No hay ningún pago registrado» (CA3) se interpreta como pedir un número de comprobante que no corresponde a ningún cobro. Responde 404 con `No hay un pago registrado con el comprobante {numero}`. |
| S3 | El comprobante se entrega en PDF, además de verse en pantalla, porque la HU dice «para entregarlo al cliente». Si el equipo prefiere solo la vista en pantalla, se quita la ruta `/pdf` y el botón sin tocar lo demás. |
| S4 | Si el medio de pago se eliminó o se renombró después del cobro, el comprobante muestra su nombre actual (la baja es lógica y la fila se conserva). |
| S5 | La fecha del comprobante es la `fecha_hora` del cobro. En el PDF se escribe en la hora del restaurante (UTC−3), igual que el reporte de M1. |
| S6 | El comprobante muestra también el total de la factura y su saldo pendiente actual, como referencia para el cajero. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/pagos/{schemas,repository,service,router}.py` | Modificado |
| `backend/app/modules/pagos/comprobante_pdf.py` | Nuevo: arma el `DocumentoPdf` |
| `backend/tests/modules/pagos/test_comprobantes.py` | Nuevo |
| `frontend/src/modules/pagos/{api,types}.ts` | Modificado |
| `frontend/src/modules/pagos/components/` | Nuevo: diálogo y hook de comprobantes; `FacturasTabla` y `FacturasPanel` modificados |

No hay migración: no cambia el esquema, así que no hace falta plan de reversión de la base.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se crea más de un comprobante para el mismo cobro (CA4) | El número es una columna única del cobro y las rutas son de solo lectura; una prueba pide dos veces y compara. |
| La ruta `/comprobantes/{numero}` choca con `/comprobantes/{numero}/pdf` | Rutas distintas por segmento; pruebas de las dos. |
| Texto fuera de latin-1 en el PDF | `shared/pdf.py` normaliza el texto; prueba con un medio de pago con acentos y ñ. |
