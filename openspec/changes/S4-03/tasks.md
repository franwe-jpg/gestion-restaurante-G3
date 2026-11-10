# Tareas · S4-03 Selectores y enlaces entre pantallas

Strict TDD: cada tarea empieza con la prueba que falla (se ejecuta y se comprueba el rojo) y sigue con el código que la pasa. Solo frontend. Si el texto de la UI del diseño difiere de la spec, gana la spec. Referencias: S01–S18 (`comanda-seleccion-catalogo`), E01–E14 (`enlaces-entre-pantallas`), D1–D9 (`design.md`).

## 1. Fundamentos de Atención (api, tipos, funciones puras)

- [x] 1.1 Prueba (rojo): URLs y parámetros de `listarMesas` (`limit=100`), `listarProductos` (`estado=TODOS&limit=100`) y `listarMenusEjecutivos` (`limit=100`) en `atencion/api.test.ts`. D2, D3.
- [x] 1.2 Tipos `MesaSeleccionable`, `ProductoSeleccionable`, `MenuEjecutivoSeleccionable`, `CatalogoComanda` en `atencion/types.ts`, y las tres funciones en `atencion/api.ts` (sin importar otros módulos, D-16). Pasa 1.1.
- [x] 1.3 Prueba (rojo) en `atencion/components/catalogoComanda.test.ts`: `cargarCatalogo` filtra mesas `LIBRE` y productos/menús `HABILITADO`, sin `conMesas` no pide mesas, propaga el error; `nombreDeDetalle` devuelve el nombre, incluye deshabilitados y usa el respaldo «Producto #id» / «Menú #id» (spec S15; prevalece sobre D8). S01, S06, S09, S12–S16; D2, D3, D8.
- [x] 1.4 `atencion/components/catalogoComanda.ts`: `cargarCatalogo`, `nombreDeDetalle` y etiquetas de opción (nombre y precio; número y sector). Pasa 1.3.
- [x] 1.5 Prueba (rojo) de `useCatalogoComanda` (carga, `cargando`, `error`, `nombreDe`, `mesasLibres`, `productos`, `menus`). S04, S11, S16; D1, D4.
- [x] 1.6 `atencion/components/useCatalogoComanda.ts` con una sola llamada a `useApi` y la opción `conMesas`. Pasa 1.5.

## 2. Selectores en el formulario de comanda

- [x] 2.1 Prueba (rojo) en `DetallePedidoFila.test.tsx`: línea de producto con `Select` de nombre y precio, cambio de tipo a menú que vacía la selección, mensaje «No hay productos habilitados» / «No hay menús habilitados», sin campo «Referencia (ID)». S06, S07, S09; D4.
- [x] 2.2 `DetallePedidoFila.tsx`: `Select` según el tipo; `LineaPedido` sin cambios. Pasa 2.1.
- [x] 2.3 Prueba (rojo) en `ComandaForm.test.tsx`: selector de mesa solo `LIBRE` con número y sector, envío de `mesa_id` elegido, «No hay mesas libres» con envío bloqueado, `Alert` por error de carga, error `409` con el diálogo abierto, validación de línea sin selección sin llamar a la API, envío de `producto_id` / `menu_ejecutivo_id` con cantidad, ausencia de la leyenda «las referencias se ingresan por ID». S01–S05, S08, S10, S11, S18.
- [x] 2.4 `ComandaForm.tsx` (`CampoMesa` con `Select`, aviso de error del catálogo, envío bloqueado) y `usePedido.ts` (validación de selección). Pasa 2.3.
- [x] 2.5 Prueba (rojo) en `ModificarComandaDialog.test.tsx`: agregar línea con los mismos selectores y envío del ID correspondiente; sin campos de ID. S17, S18.
- [x] 2.6 `ModificarComandaDialog.tsx` con selectores y nombres. Pasa 2.5.

## 3. Nombres en los diálogos

- [x] 3.1 Prueba (rojo) en `CierreComandaDialog.test.tsx` y `EntregasComandaDialog.test.tsx`: producto y menú con nombre, botones «Sumar una unidad de Milanesa», deshabilitado con nombre, ID desconocido y error de carga con respaldo sin bloquear la acción. Actualizar las fábricas simuladas de `../api` (las tres funciones nuevas, listas vacías por defecto) y las pruebas que buscan «Producto #11». S12–S16; D8.
- [x] 3.2 `CierreComandaDialog.tsx`, `EntregasComandaDialog.tsx` y los nombres de `ModificarComandaDialog.tsx` con `nombreDeDetalle`. Pasa 3.1.

## 4. Enlace Mesa → Comanda

- [x] 4.1 Prueba (rojo) en `salon/components/MesasTabla.test.tsx`: «Abrir comanda» solo en `LIBRE`, no en `OCUPADA` ni `FUERA_DE_SERVICIO`, y llama a `onAbrirComanda`. E01 (parte de la tabla), E03; D5.
- [x] 4.2 `MesasTabla.tsx` con la acción y callback `onAbrirComanda`. Pasa 4.1.
- [x] 4.3 Prueba (rojo) en `SalonPage.test.tsx` (`render` local con `wrapper: MemoryRouter`, D9): el clic navega a `/atencion?mesa=<id>`. E01; D5.
- [x] 4.4 `SalonPage.tsx` con `useNavigate`. Pasa 4.3.
- [x] 4.5 Prueba (rojo) en `AtencionPage.test.tsx` con `MemoryRouter initialEntries`: `?mesa=1` abre el formulario con la mesa elegida y limpia el parámetro; `?mesa=99` (no libre o inexistente) abre sin preselección ni error; `?mesa=abc`, `0` y negativo se ignoran; sin parámetro el formulario queda cerrado. E02, E04, E05, E06; D6, D7.
- [x] 4.6 `useEnlacesAtencion` en `AtencionPage.tsx`, `mesaInicial` en `AtencionDialogs`, `ComandasPanel`, `ComandaForm` y `usePedido`; descarte de la mesa si no está entre las libres al terminar la carga. Pasa 4.5.

## 5. Enlace Comanda → Factura

- [x] 5.1 Prueba (rojo) en `AtencionPage.test.tsx` y de `ComandasTabla`: «Facturar» solo en `CERRADA` (no en `ABIERTA` ni `ANULADA`), lista vacía sin acciones, clic navega a `/pagos?comanda=<id>`. E07, E12, E13; D5.
- [x] 5.2 `ComandasTabla.tsx`, `ComandasPanel.tsx` y `AtencionPage.tsx` con `onFacturar` y navegación. Pasa 5.1.
- [x] 5.3 Prueba (rojo) en `pagos/pages/PagosPage.test.tsx` y `FacturarComandaDialog.test.tsx`: `?comanda=12` abre el diálogo con el número cargado y la vista previa visible y limpia el parámetro; comanda inexistente muestra el `404` en un `Alert` y permite corregir; comanda ya facturada muestra el error y no crea otra factura; `?comanda=abc` se ignora; botón de Pagos sin parámetro mantiene el campo «N° de comanda». E08–E11, E14; D6, D7.
- [x] 5.4 `PagosPage.tsx`, `FacturarComandaDialog.tsx` y `useFacturarComanda.ts` con `comandaInicial` y carga automática de la vista previa reutilizando la validación de `pedirPrevia`. Pasa 5.3.

## 6. Verificación

- [x] 6.1 Comprobar que cada escenario S01–S18 y E01–E14 tiene al menos una prueba y que las funciones nuevas tienen 50 líneas como máximo (RNF-MAN-05).
- [x] 6.2 Desde `frontend/`: `npm run format`, luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %).
- [x] 6.3 Anotar en el PR los supuestos S1–S6 de la propuesta, las diferencias con la maqueta, el aviso a los responsables de M3, M4 y M6 (AGENTS.md, regla 3) y `Closes #224`.

## Presupuesto de revisión (Review Workload Forecast)

| Lado | Pronóstico | Límite |
| --- | --- | --- |
| `frontend/` | ~800 líneas (≈ 400 de código y ≈ 420 de pruebas, −20 retiradas) | 800 |
| `backend/` | 0 líneas (sin cambios) | 800 |

Es un punto de control, no un bloqueo: un solo PR (`delivery_strategy: single-pr`) y no se divide aunque se supere el límite.

## Orden y paralelismo

- Secuencial: 1 (fundamentos) → 2 → 3 (dependen del catálogo y de `DetallePedidoFila`).
- La fase 4 depende de 2.4 (`mesaInicial`); la fase 5.1–5.2 depende solo de la fase 1 y puede hacerse antes o en paralelo con 2–4.
- La fase 5.3–5.4 (Pagos) es independiente de Atención y puede hacerse en paralelo con 2–4.
- La fase 6 va al final.
