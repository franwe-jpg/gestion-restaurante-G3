# Verificación · HU-M6-03

**Resultado:** cumple la spec. Fecha: 2026-11-06.

## Criterios de aceptación (#72)

| CA | Escenarios | Pruebas | Estado |
| --- | --- | --- | --- |
| CA1 Datos del cobro | C01, C02 | `test_obtener_comprobante_muestra_numero_fecha_importe_y_medio`, `test_obtener_comprobante_de_un_segundo_cobro_muestra_solo_ese_cobro`; `ComprobantesDialog` «muestra el número…» | Cumple |
| CA2 Asociado al cobro, la factura y la comanda | C03, C04 | `test_obtener_comprobante_queda_asociado_al_cobro_la_factura_y_la_comanda`, `test_obtener_comprobante_de_facturas_distintas_se_asocia_a_cada_una` | Cumple |
| CA3 Sin pago registrado | C05, C06 | `test_obtener_comprobante_inexistente_responde_404_y_no_crea_nada`, `test_obtener_comprobante_sin_ningun_cobro_responde_404`; `ComprobantesDialog` «avisa cuando no hay un pago…» | Cumple |
| CA4 Un único comprobante por cobro | C07, C08 | `test_obtener_comprobante_dos_veces_devuelve_el_mismo_y_no_crea_otro`, `test_obtener_comprobante_json_y_pdf_llevan_el_mismo_numero`; `ComprobantesDialog` «vuelve a la lista…» | Cumple |
| S3 PDF | C09, C10 | `test_descargar_comprobante_pdf_devuelve_un_adjunto_pdf`, `test_descargar_comprobante_pdf_con_acentos_y_enie_en_el_medio`, `test_componer_comprobante_…` | Cumple |

## Controles de la CI

| Control | Resultado |
| --- | --- |
| `ruff check .` · `ruff format --check .` | Sin errores |
| `lint-imports` | 10 contratos respetados, 0 rotos |
| `pytest` | 1886 pruebas pasan; cobertura total 98,56 %; `comprobante_pdf.py`, `repository.py`, `router.py` y `schemas.py` de pagos al 100 % |
| `npm run lint` · `format:check` · `typecheck` · `build` | Sin errores |
| `npm run test:coverage` | 1094 pruebas pasan; umbral cumplido |

## Observaciones

- La cobertura del frontend de la CI solo incluye `src/App.tsx` y `src/shared/` (`vite.config.ts`). Medida aparte, la carpeta `src/modules/pagos/` queda en 95 % de sentencias y 97 % de líneas. No se cambió la configuración (AGENTS.md, regla 9.8).
- `FacturarComandaDialog.test.tsx` falló una vez de forma intermitente en una corrida y pasó en las siguientes; no comparte archivos con este cambio.
- No hay migración: el esquema no cambia.
