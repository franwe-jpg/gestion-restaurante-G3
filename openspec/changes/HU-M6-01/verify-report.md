# Verificación · HU-M6-01

| Escenario | Criterio de #70 | Prueba |
| --- | --- | --- |
| F01 | CA1 | `test_previsualizar_comanda_cerrada_muestra_detalle_fecha_y_total` |
| F02 | CA2 | `test_generar_con_monto_igual_al_total_deja_la_factura_pagada` |
| F03 | S3 | `test_generar_con_cobro_parcial_deja_la_factura_adeudada` |
| F04, F13 | límite del cobro | `test_generar_con_monto_invalido_responde_422_y_no_guarda_nada` |
| F05 | S7 | `test_generar_con_medio_de_pago_no_utilizable_...` |
| F06 | CA3 | `test_facturar_comanda_no_cerrada_responde_409` |
| F07 | — | `test_facturar_comanda_inexistente_responde_404` |
| F08 | CA4 | `test_generar_copia_una_linea_por_cada_linea_de_la_comanda` |
| F09 | CA5 | `test_generar_dos_veces_la_misma_comanda_responde_409_y_no_crea_otra` |
| F10 | CA6 | `test_consultar_conserva_el_precio_aunque_el_producto_cambie` |
| F11 | CA7 | `test_consultar_mantiene_el_producto_dado_de_baja_en_el_detalle` |
| F12 | — | `test_consultar_factura_inexistente_responde_404` |

Frontend: `FacturarComandaDialog.test.tsx` (CA1, CA2, CA3, CA5, validaciones), `validarCobro.test.ts`, `api.test.ts`, `PagosPage.test.tsx`.

## Resultado de la CI local (2026-11-05)
- Backend: `ruff check`, `ruff format --check`, `lint-imports` (10 contratos) y `pytest`: 1780 pruebas, cobertura 98,5 % (mínimo 70 %).
- Frontend: `lint`, `format:check`, `typecheck`, `test:coverage` (1020 pruebas, 76,4 % de líneas; mínimo 60 %) y `build`.
- Migración: se aplica de punta a punta sobre una base vacía (fixture `db` de las pruebas).

## Pendiente
- Comprobación manual en pantalla (no realizada en esta sesión).
- Avisar a Giuliano de que `Cobro` y `Factura` ya existen (S1).
