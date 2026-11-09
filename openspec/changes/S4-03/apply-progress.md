# Apply progress · S4-03 Selectores y enlaces entre pantallas

Modo: Strict TDD (Vitest). Solo frontend. 27/27 tareas completas.

## Evidencia del ciclo TDD

| Tareas | Prueba (rojo) | Código (verde) | Refactor |
| --- | --- | --- | --- |
| 1.1-1.2 | `api.test.ts`: `listarMesas/Productos/MenusEjecutivos` fallan (no existen) | `atencion/api.ts`, `types.ts` | Constante `LIMITE_CATALOGO` |
| 1.3-1.4 | `catalogoComanda.test.ts` falla (módulo inexistente) | `catalogoComanda.ts` | `primerError` extraído por complejidad (RNF-MAN-05) |
| 1.5-1.6 | `useCatalogoComanda.test.tsx` falla (módulo inexistente) | `useCatalogoComanda.ts` | `SIN_CATALOGO` por complejidad |
| 2.1-2.2 | `DetallePedidoFila.test.tsx`: 3 fallan | `DetallePedidoFila.tsx` (`SelectorReferencia`) | - |
| 2.3-2.4 | `ComandaForm.test.tsx`: 9 fallan | `ComandaForm.tsx`, `usePedido.ts` | Placeholder de mesa distinto del mensaje de validación |
| 2.5-2.6 | `ModificarComandaDialog.test.tsx`: validación fallaba | `ModificarComandaDialog.tsx`, `useModificacionComanda.ts` | `CuerpoModificar` extraído |
| 3.1-3.2 | `CierreComandaDialog.test.tsx` y `EntregasComandaDialog.test.tsx`: 3 fallan | `CierreComandaDialog.tsx`, `EntregasComandaDialog.tsx` | `InsigniaEntrega` extraída |
| 4.1-4.2 | `MesasTabla.test.tsx` falla | `MesasTabla.tsx` | - |
| 4.3-4.4 | `SalonPage.test.tsx` falla | `SalonPage.tsx` (navegación en `SeccionMesas`) | - |
| 4.5-4.6 | `AtencionPage.test.tsx` (E02, E04-E06) fallan | `AtencionPage.tsx` (`useEnlacesAtencion`), `AtencionDialogs`, `ComandaForm` | - |
| 5.1-5.2 | `AtencionPage.test.tsx` (E07, E12, E13) fallan | `ComandasTabla.tsx` (`AccionFacturar`), `ComandasPanel.tsx` | - |
| 5.3-5.4 | `PagosPage.test.tsx` y `FacturarComandaDialog.test.tsx` (E08-E11, E14) fallan | `PagosPage.tsx`, `FacturarComandaDialog.tsx`, `useFacturarComanda.ts` | `useEstadoFactura`, `usePreviaInicial` |
| 6.1-6.3 | - | Verificación completa | - |

## Work Unit Evidence

| Evidencia | Valor |
| --- | --- |
| Comando focalizado | `npx vitest run src/modules/atencion src/modules/salon src/modules/pagos`: todo verde |
| Arnés de ejecución | N/A: sin frontera de ejecución nueva; las pruebas de página usan `MemoryRouter` |
| Límite de reversión | `frontend/src/modules/{atencion,salon,pagos}`; ningún cambio en `shared/` ni en backend |

## Decisiones y desviaciones

- Spec sobre diseño: el respaldo de menú es «Menú #id» (spec S15), no «Menú ejecutivo #id».
- El catálogo devuelve también `nombres` (mapas por id) para `nombreDeDetalle`.
- `onAbrirComanda` es opcional en `MesasTabla` para no tocar las pruebas existentes de la tabla.
- Pre-existente corregido: `ModificarComandaDialog` nunca mostraba `mod.error`; ahora lo muestra (necesario para la validación de línea sin selección).
- Pruebas existentes de `AtencionPage`, `AtencionClientes` y `SalonPage` usan un `render` local con `MemoryRouter` (D9).
- Presupuesto de revisión: el frontend supera el punto de control de 800 líneas (≈1380 añadidas, 139 quitadas, pruebas incluidas); es un solo PR por regla.
