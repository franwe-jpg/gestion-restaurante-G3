# Verificación: HU-M6-04 a HU-M6-07

## Comandos (AGENTS.md §7)

| Comando | Resultado |
| --- | --- |
| `ruff check .` y `ruff format --check .` | Sin errores; 101 archivos formateados |
| `lint-imports` | 10 contratos cumplidos, 0 rotos |
| `pytest` | 1014 pruebas pasan; cobertura 99,34 % (mínimo 70 %) |
| `alembic heads` | Una sola cabeza: `e7a9c1b3d5f7` |
| `npm run lint` | 0 errores, 0 advertencias |
| `npm run format:check` y `npm run typecheck` | Sin errores |
| `npm run test:coverage` | 607 pruebas pasan; cobertura 75,09 % de sentencias (mínimo 60 %) |
| `npm run build` | Correcto |

## Escenarios

Back: `backend/tests/modules/pagos/`. Front: `frontend/src/modules/pagos/`.

| Escenario | Resultado | Prueba |
| --- | --- | --- |
| #74 CA 1 alta con nombre y tipo | Cumple | `test_crear_responde_201_con_medio_pago_salida`, `test_crear_medio_pago_queda_habilitado_y_disponible`, diálogo «envía nombre, tipo y descripción recortados» |
| #74 CA 2 nombre repetido | Cumple | `test_crear_con_nombre_repetido_responde_409`, diálogo «muestra el nombre repetido bajo el campo Nombre» |
| #74 CA 3 nombre vacío | Cumple | `test_crear_con_datos_invalidos_responde_422[vacio]`, validador y diálogo |
| #74 CA 4 largo del nombre | Cumple | `[corto]`, `[largo]`, `test_crear_admite_nombre_en_los_limites`, validador |
| #74 CA 5 caracteres no permitidos | Cumple | `[caracteres]`, `test_crear_rechaza_caracteres_no_permitidos`, validador |
| #74 CA 6 tipo no elegido | Cumple | `[sin-tipo]`, `[tipo]`, validador y diálogo |
| #74 CA 7 descripción larga | Cumple | `[descripcion]`, validador |
| #74 CA 8 estado inicial | Cumple | `[estado]` (422), `test_crear_medio_pago_queda_habilitado_y_disponible` |
| #74 CA 9 duplicado por mayúsculas o espacios | Cumple | `test_crear_medio_pago_con_nombre_repetido_lanza_regla_de_negocio`, `test_nombre_normalizado_es_unico_entre_los_no_eliminados` |
| S3 nombre de un eliminado | Cumple | `test_crear_medio_pago_con_el_nombre_de_uno_eliminado`, `test_el_nombre_de_un_medio_eliminado_se_puede_reutilizar` |
| #75 CA 1 cambio de datos | Cumple | `test_modificar_responde_200_con_los_datos_nuevos`, diálogo «precarga los datos…» |
| #75 CA 2, 3, 4, 7, 8 datos inválidos | Cumple | `test_modificar_con_datos_invalidos_responde_422_y_no_cambia` |
| #75 CA 5 nombre de otro medio | Cumple | `test_modificar_con_nombre_de_otro_medio_responde_409` |
| #75 CA 6 mismo nombre | Cumple | `test_modificar_sin_cambiar_el_nombre_no_es_duplicado` |
| #75 CA 9 deshabilitar y volver a habilitar | Cumple | `test_deshabilitar_y_volver_a_habilitar`, diálogo (estado `DESHABILITADO`) |
| #75 CA 10 cancelar | Cumple | Diálogo «cancelar cierra sin llamar a la API» |
| #75 CA 11 medio eliminado | Cumple | `test_modificar_medio_eliminado_responde_404`, diálogo |
| #75 CA 12 cobros con el nombre actualizado | **Diferido (S5)** | Hoy: `test_modificar_nombre_actualiza_la_misma_fila` |
| #76 CA 1 eliminar con confirmación | Cumple | `test_eliminar_responde_204_y_deja_de_listarse`, `useBajaMedioPago`, `PagosPage` |
| #76 CA 2 cancelar la eliminación | Cumple | `useBajaMedioPago` «al cancelar no llama a la API» |
| #76 CA 3 cobros anteriores | **Diferido (S5)** | Hoy: `test_eliminar_medio_pago_es_baja_logica` (la fila se conserva) |
| #76 CA 4 eliminar de nuevo | Cumple | `test_eliminar_de_nuevo_responde_404` |
| #76 CA 5 cobro en curso | **Diferido (S5)** | Sin prueba: `Cobro` no existe |
| #76 CA 6 eliminar un deshabilitado | Cumple | `test_eliminar_medio_deshabilitado_no_se_puede_volver_a_habilitar` |
| #77 CA 1 habilitados con nombre y tipo | Cumple | `test_listar_responde_habilitados_ordenados_por_nombre`, tabla y pantalla |
| #77 CA 2 sin deshabilitados ni eliminados | Cumple | `test_listar_muestra_solo_habilitados_no_eliminados` |
| #77 CA 3 sin habilitados | Cumple | `test_listar_sin_habilitados_responde_200_vacio`, pantalla |
| #77 CA 4 orden por nombre | Cumple | `test_listar_ordena_por_nombre_sin_distinguir_mayusculas` |
| S2 incluir deshabilitados | Cumple | `test_listar_con_deshabilitados`, casilla en `PagosPage` |
| Paginación | Cumple | `test_listar_pagina_con_limit_y_offset`, `test_listar_con_limit_mayor_a_100_responde_422` |

## Pendiente para el Sprint 3

Cuando exista `Cobro` (HU-M6-02): impedir eliminar un medio con un cobro en curso (#76 CA 5, 409) y probar que los cobros muestran el nombre actual y el medio eliminado (#75 CA 12 y #76 CA 3).
