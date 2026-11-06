# Verificación · HU-M6-02

| Escenario | Criterio de #71 | Prueba |
| --- | --- | --- |
| F01 | CA1 (camino feliz) | `test_cobrar_factura_adeudada_baja_el_saldo` |
| F02 | CA1 (límite) | `test_cobrar_el_saldo_completo_deja_la_factura_pagada` |
| F03 | CA2 | `test_cobrar_una_factura_pagada_responde_409_y_no_crea_cobro` |
| F04 | CA3 | `test_cobrar_mas_que_el_saldo_responde_422_y_no_cambia_nada` |
| F05 | CA3 (límite) | `test_cobrar_con_monto_no_positivo_responde_422` |
| F06 | CA4 | `test_cobrar_con_medio_deshabilitado_responde_409` |
| F07 | — | `test_cobrar_con_medio_inexistente_o_eliminado_responde_404` |
| F08 | CA5 | `test_cobrar_con_un_medio_ya_usado_en_la_factura_responde_409` |
| F09 | CA6 | `test_cobrar_sin_monto_o_sin_medio_responde_422` |
| F10 | — | `test_cobrar_una_factura_inexistente_responde_404` |
| F11 | listado | `test_listar_facturas_devuelve_la_mas_reciente_primero` |
| F12 | listado (límite) | `test_listar_facturas_sin_datos_devuelve_pagina_vacia` |
| F13 | atomicidad | Las pruebas de error comprueban que `_contar(db)` no cambia |
| F14 | coherencia | `test_el_saldo_es_el_total_menos_la_suma_de_los_cobros` |

Frontend: `CobrarFacturaDialog.test.tsx` (CA1, CA2, CA3, CA6 y error de carga), `FacturasTabla.test.tsx` (listado y solo cobrar adeudadas), `PagosPage.test.tsx` (pestaña y apertura del cobro), `validarCobro.test.ts` y `api.test.ts`.

## Resultado de la CI local (2026-11-06)
- Backend: `ruff check`, `ruff format --check`, `lint-imports` (10 contratos) y `pytest`: 1872 pruebas, cobertura 98,53 % (mínimo 70 %).
- Frontend: `lint`, `format:check`, `typecheck`, `test:coverage` (1083 pruebas, 77,73 % de sentencias; mínimo 60 %) y `build`.

## Pendiente
- Comprobación manual en pantalla.
- Abrir el PR de la HU con `Closes #71` y anotar que la implementó Giuliano.
- Avisar a Héctor de que el cobro ya está en la rama: el comprobante (HU-M6-03) puede apoyarse en `numero_comprobante`.
