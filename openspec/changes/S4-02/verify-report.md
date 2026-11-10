# Verificación — S4-02 Aplicar las promociones en la comanda y la factura

## Estado

Implementación completa. **La suite completa de `pytest` no se ejecutó por indicación de la
persona**; queda pendiente para cerrar el cambio. Los controles de lint, formato y contratos de
importación sí pasaron.

## Evidencia

| Control | Resultado |
| --- | --- |
| `pytest` de los cuatro archivos afectados | 94 passed (antes del formateo final) |
| `ruff check .` | Sin errores |
| `ruff format --check .` | 146 archivos formateados |
| `lint-imports` | 10 contratos mantenidos, 0 roto |
| `pytest` completo + cobertura ≥ 70 % | Pendiente (no ejecutado por indicación) |

## Cobertura de requisitos

| Requisito | Prueba |
| --- | --- |
| Aplicar la promoción vigente | `test_cotizar_producto_con_promocion_vigente_aplica_descuento`, `test_promocion_para_linea_devuelve_la_vigente` |
| No aplicar promociones no vigentes | `test_cotizar_producto_con_promocion_finalizada_no_aplica`, `test_cotizar_producto_con_promocion_fuera_de_vigencia_no_aplica`, `test_no_es_vigente_*` |
| Descuento según el tipo | `test_calcular_descuento_porcentaje*`, `test_calcular_descuento_precio_fijo*`, `test_calcular_descuento_nxm*` |
| Descuento acotado | `test_calcular_descuento_precio_fijo_mayor_al_precio_es_cero`, `test_calcular_descuento_porcentaje_del_cien_es_el_bruto` |
| Varias promociones vigentes | `test_elegir_promocion_toma_la_de_mayor_descuento`, `test_elegir_promocion_en_empate_toma_la_de_menor_id` |
| Menús ejecutivos sin promoción | `test_cotizar_menu_ejecutivo_no_aplica_promocion`, `test_promocion_para_linea_de_menu_ejecutivo_devuelve_none` |
| La factura conserva el descuento | `test_previsualizar_factura_de_comanda_con_promocion_conserva_el_descuento` |
| Historial inmutable | `test_finalizar_promocion_no_cambia_la_comanda_ya_cotizada` |

## Observaciones

- No hubo cambios de esquema ni migraciones: no aplica plan de reversión de base de datos.
- `pagos/service.py` no se modificó; la factura ya restaba y copiaba el descuento.
- La corrida acotada reportó 69 % de cobertura global, pero ese número no es representativo porque
  solo incluyó cuatro archivos de prueba.
- Antes del PR falta correr la suite completa y actualizar este informe con el resultado.
