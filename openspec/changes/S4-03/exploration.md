# Exploración · S4-03 Selectores y enlaces entre pantallas

- **Issue:** [#224](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/224) · **Rama:** `feature/S4-03-selectores-y-enlaces`
- **Módulos tocados:** M3 `salon/`, M4 `atencion/`, M6 `pagos/` (solo frontend).

## Hallazgos

1. **Alta de comanda por ID.** `ComandaForm.tsx` pide «Mesa (ID)» con un `Input` numérico y avisa que «las referencias se ingresan por ID». Cada línea (`DetallePedidoFila.tsx`) pide tipo y «Referencia (ID)». `usePedido.ts` convierte esos textos a `mesa_id`, `producto_id` o `menu_ejecutivo_id`.
2. **`DetallePedidoFila` también se usa al modificar.** `ModificarComandaDialog.tsx` agrega líneas con el mismo componente (`useModificacionComanda.ts` lee `linea.referencia`). Cambiar la fila cambia los dos formularios.
3. **«Producto #id» en tres diálogos.** `CierreComandaDialog.tsx` (líneas 68-70), `EntregasComandaDialog.tsx` (13-15) y `ModificarComandaDialog.tsx` (16-21). Las pruebas de `EntregasComandaDialog.test.tsx` y `AtencionPage.test.tsx` buscan botones por ese texto («Sumar una unidad de Producto #11»).
4. **Endpoints de listado disponibles (sin cambios de backend):**
   - `GET /productos`: filtro `estado` (por defecto `HABILITADO`; acepta `TODOS`), paginado, `limit` ≤ 100.
   - `GET /menus-ejecutivos`: filtro `estado` opcional, paginado.
   - `GET /mesas`: **sin filtro de estado**, paginado, `limit` ≤ 100. Devuelve `numero`, `sector.nombre` y `estado`.
5. **El backend ya protege la mesa.** `salon_service.ocupar_mesa` rechaza una mesa que no está `LIBRE` («La mesa N no está libre»), así que el selector es una ayuda, no la única barrera.
6. **Facturar pide el número a mano.** `FacturarComandaDialog.tsx` muestra «N° de comanda» y `useFacturarComanda.ts` pide la vista previa con `verFactura()`. `PagosPage.tsx` abre el diálogo con un estado local `facturando`.
7. **Patrón de enlaces.** `ProductosPage.tsx` usa `useNavigate` y `useSearchParams` (`?pestania=secciones`). Rutas `/salon`, `/atencion` y `/pagos` en `App.tsx`.
8. **Contrato D-16.** `atencion/api.ts` no tiene funciones para mesas, productos ni menús; hay que agregarlas allí (y sus tipos en `atencion/types.ts`), sin importar `salon/` ni `productos/`.

## Dependencias

- Ninguna bloqueante. S4-04 (#225) agregará el selector de mozo al mismo formulario.
