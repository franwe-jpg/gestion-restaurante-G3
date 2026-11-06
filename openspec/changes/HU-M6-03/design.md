# Diseño · HU-M6-03

## Datos

No hay migración ni model nuevo. Se leen `Cobro` (con `numero_comprobante` único), su `Factura` (relación `factura`) y el `MedioPago` del cobro. Nada se escribe en la base.

## Capas (`backend/app/modules/pagos/`)

- `schemas.py`:
  - `MedioPagoDelComprobante` (`from_attributes`): `id`, `nombre`, `tipo`.
  - `ComprobanteSalida`: `numero_comprobante`, `fecha_hora` (`InstanteUTC`), `monto` (`Importe`), `medio_pago`, `cobro_id`, `factura_id`, `comanda_id`, `total_factura` y `saldo_pendiente` (`Importe`).
- `repository.py`:
  - `obtener_cobro_por_comprobante(db, numero) -> Cobro | None`: `select(Cobro)` por `numero_comprobante`, con `selectinload(Cobro.factura)`. Consulta parametrizada.
  - Se reutiliza `obtener_medio_pago` (lee también los eliminados, S4). Si hace falta, se agrega un parámetro para incluirlos sin cambiar a los que ya lo llaman.
- `service.py`:
  - `obtener_comprobante(db, numero) -> ComprobanteSalida`: busca el cobro; si no existe, lanza `NoEncontradoError("No hay un pago registrado con el comprobante {numero}")`. Arma la salida con el cobro, su factura y su medio.
  - `generar_pdf_comprobante(db, numero) -> ArchivoComprobante` (`contenido: bytes`, `nombre: str`): reutiliza `obtener_comprobante`, arma el documento con `comprobante_pdf.componer` y lo dibuja con `shared.pdf.renderizar`.
  - Ninguna función supera 50 líneas; no importa FastAPI (contrato de `lint-imports`).
- `comprobante_pdf.py`: `componer(comprobante, generado) -> DocumentoPdf`. Título «Comprobante de pago N° {numero}», `periodo` con la factura y la comanda, `resumen` con fecha (hora del restaurante, UTC−3), medio de pago, importe pagado, total de la factura y saldo pendiente. Solo importa `shared.pdf` y los `schemas` del propio módulo.
- `router.py`:
  - `GET /comprobantes/{numero_comprobante}` → `service.obtener_comprobante`.
  - `GET /comprobantes/{numero_comprobante}/pdf` → `Response` con `media_type="application/pdf"` y `Content-Disposition: attachment; filename="comprobante-{numero}.pdf"`, igual que el reporte de M1.

## Frontend (`frontend/src/modules/pagos/`)

- `types.ts`: `Comprobante` y `MedioPagoDelComprobante`.
- `api.ts`: `obtenerComprobante(numero)` y `descargarComprobantePdf(numero)` (con `clienteHttp.obtenerArchivo`).
- `components/useComprobantesDeFactura.ts`: carga la factura con `obtenerFactura`, guarda el cobro elegido, carga su comprobante con `obtenerComprobante` y descarga el PDF con `guardarArchivo`; avisa los errores con `useToast`.
- `components/ComprobantesDialog.tsx`: dos vistas en el mismo `Dialog`: la lista de cobros (`Table`) y el detalle del comprobante (`DescriptionList`), con «Descargar PDF» y «Volver».
- `components/FacturasTabla.tsx`: agrega la acción «Comprobantes» en todas las filas, junto a «Cobrar».
- `components/FacturasPanel.tsx`: estado de la factura cuyos comprobantes se ven; monta `ComprobantesDialog`.

## Pruebas

- Backend: `tests/modules/pagos/test_comprobantes.py` (C01–C10), con la base migrada y las fábricas de `conftest.py` (`fabrica_comanda`, `fabrica_medio_pago`). Pruebas unitarias de `comprobante_pdf.componer`.
- Frontend: `api.test.ts`, `useComprobantesDeFactura.test.tsx`, `ComprobantesDialog.test.tsx`, `FacturasTabla.test.tsx` y `FacturasPanel`/`PagosPage.test.tsx`.

## Riesgos

- No se toca `shared/pdf.py`: si hiciera falta un cambio ahí, se coordina con Franco (M1).
- El número de comprobante es nullable en el model; el service siempre lo asigna. Un cobro sin número no se encuentra por la ruta y responde 404.
