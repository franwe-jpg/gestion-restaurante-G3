# Especificación · Selectores y nombres en la comanda (S4-03)

**Estado:** BORRADOR para revisión · **Fuente:** issue #224, `proposal.md` y `exploration.md`. Solo frontend; no hay cambios de backend ni del contrato de Comanda (S2-01).

## Contrato de la API (sin cambios)

Se usan endpoints existentes desde `atencion/api.ts` (D-16: sin importar `salon/` ni `productos/`).

| Método y ruta | Uso | Notas |
| --- | --- | --- |
| `GET /api/v1/mesas?limit=100` | Selector de mesa | Sin filtro de estado: las `LIBRE` se filtran en el cliente. Devuelve `numero`, `sector.nombre` y `estado`. |
| `GET /api/v1/productos?limit=100` | Selector de producto | Por defecto `HABILITADO`. |
| `GET /api/v1/productos?estado=TODOS&limit=100` | Nombres en diálogos | Incluye deshabilitados. |
| `GET /api/v1/menus-ejecutivos?estado=HABILITADO&limit=100` | Selector de menú | |
| `GET /api/v1/menus-ejecutivos?limit=100` | Nombres en diálogos | Incluye deshabilitados. |

- `POST /comandas` y `PUT` de modificación mantienen su cuerpo (`mesa_id`, `producto_id`, `menu_ejecutivo_id`); solo cambia cómo la UI obtiene esos IDs.

## Supuestos

- Supuesto: el selector de mesa lista solo mesas `LIBRE` (el backend, `ocupar_mesa`, sigue rechazando otras con `409`).
- Supuesto: hasta 100 mesas, 100 productos y 100 menús; si se superan, se acuerda con M3 un filtro `estado` en el backend.
- Supuesto: el selector de producto y de menú muestra nombre y precio.
- Supuesto: `ModificarComandaDialog` usa los mismos selectores porque comparte `DetallePedidoFila`.
- Supuesto: si un ID no aparece en el mapa de nombres, se conserva «Producto #id» o «Menú #id».
- Supuesto: el formulario queda preparado para sumar el selector de mozo (S4-04) como una lista más del hook `useCatalogoComanda`.

## Requisitos y escenarios

### R1 · Selector de mesa en el alta de comanda
#### Escenario S01 (camino feliz)
- **Dado** mesas `LIBRE`, `OCUPADA` y `FUERA_DE_SERVICIO` **Cuando** abro «Nueva comanda» **Entonces** el campo «Mesa» es un selector que ofrece solo las `LIBRE`, con número y sector, y no hay campo numérico de ID.
#### Escenario S02 (camino feliz)
- **Dado** el selector de mesa **Cuando** elijo la mesa 4 y confirmo la comanda **Entonces** se envía `mesa_id` de la mesa 4.
#### Escenario S03 (límite)
- **Dado** que no hay mesas `LIBRE` **Cuando** abro el formulario **Entonces** el selector muestra «No hay mesas libres», no se puede elegir mesa y el envío queda bloqueado.
#### Escenario S04 (error)
- **Dado** que falla la carga de mesas **Cuando** abro el formulario **Entonces** se muestra el mensaje de error en un `Alert` y el formulario no se envía.
#### Escenario S05 (error)
- **Dado** una mesa elegida que otra persona ocupó antes de confirmar **Cuando** confirmo **Entonces** se muestra el error `409` del backend («La mesa N no está libre») y el diálogo sigue abierto.

### R2 · Selectores de producto y menú en cada línea
#### Escenario S06 (camino feliz)
- **Dado** productos habilitados **Cuando** agrego una línea de tipo «Producto» **Entonces** la referencia es un selector con nombre y precio de cada producto habilitado, sin campo «Referencia (ID)».
#### Escenario S07 (camino feliz)
- **Dado** menús ejecutivos habilitados **Cuando** cambio el tipo de la línea a «Menú» **Entonces** el selector pasa a listar los menús habilitados y se limpia la selección previa.
#### Escenario S08 (camino feliz)
- **Dado** una línea con un producto elegido y cantidad 2 **Cuando** confirmo **Entonces** el detalle enviado lleva `producto_id` y la cantidad, y para un menú lleva `menu_ejecutivo_id`.
#### Escenario S09 (límite)
- **Dado** que no hay productos (o menús) habilitados **Cuando** agrego una línea de ese tipo **Entonces** el selector muestra «No hay productos habilitados» (o menús) y no permite confirmar esa línea.
#### Escenario S10 (error)
- **Dado** una línea sin selección **Cuando** intento confirmar **Entonces** se muestra un error de validación en la línea y no se llama a la API.
#### Escenario S11 (error)
- **Dado** que falla la carga de productos o menús **Cuando** abro el formulario **Entonces** se muestra el error y no se permite enviar.

### R3 · Nombres en lugar de IDs en los diálogos
#### Escenario S12 (camino feliz)
- **Dado** una comanda con el producto 11 «Milanesa» **Cuando** abro el diálogo de cierre, el de entregas o el de modificación **Entonces** la línea muestra «Milanesa» y no «Producto #11»; los botones se llaman «Sumar una unidad de Milanesa».
#### Escenario S13 (camino feliz)
- **Dado** una línea de menú con nombre «Menú del día» **Cuando** abro cualquiera de los tres diálogos **Entonces** se muestra el nombre del menú y no «Menú #id».
#### Escenario S14 (límite)
- **Dado** un producto deshabilitado que sigue en una comanda abierta **Cuando** abro los diálogos **Entonces** se muestra su nombre (se piden también los deshabilitados).
#### Escenario S15 (límite)
- **Dado** un ID que no figura en las listas cargadas **Cuando** abro un diálogo **Entonces** se conserva «Producto #id» (o «Menú #id») y no falla.
#### Escenario S16 (error)
- **Dado** que falla la carga de nombres **Cuando** abro un diálogo **Entonces** el diálogo sigue funcionando con «Producto #id» y la acción no se bloquea.

### R4 · Modificación con selectores
#### Escenario S17 (camino feliz)
- **Dado** una comanda abierta **Cuando** abro «Modificar» y agrego una línea **Entonces** elijo producto o menú con los mismos selectores y se envía el ID correspondiente.

### R5 · Sin IDs manuales
#### Escenario S18 (criterio general)
- **Dado** el formulario de comanda y el de modificación **Cuando** los recorro **Entonces** ningún campo pide un ID a mano y desaparece la leyenda «las referencias se ingresan por ID».

## Pantalla (guía: `SPRINT-2/S2-04-maqueta/comanda-nueva.html`)

- Se usa el `Select` de `shared/components/ui/` y el formulario sigue en modal (AGENTS.md).
- El hook `useCatalogoComanda` carga las listas una vez al abrir el formulario.
- Las pruebas existentes que buscan «Producto #11» se actualizan al nombre.
