# Especificación · Enlaces entre pantallas (S4-03)

**Estado:** BORRADOR para revisión · **Fuente:** issue #224 y `proposal.md`. Solo frontend; sin cambios de backend.

## Contrato de rutas (parámetros de URL)

| Ruta | Parámetro | Efecto |
| --- | --- | --- |
| `/atencion?mesa=<id>` | `mesa` entero positivo | Abre «Nueva comanda» con esa mesa elegida. |
| `/pagos?comanda=<id>` | `comanda` entero positivo | Abre «Facturar comanda» con la vista previa de esa comanda. |

- Las páginas leen el parámetro con `useSearchParams` (patrón de `ProductosPage`), actúan una vez y lo limpian de la URL.
- No hay llamadas nuevas al backend: la vista previa usa `verFactura()` y el alta usa los endpoints de R1 de `comanda-seleccion-catalogo`.

## Supuestos

- Supuesto: la acción «Abrir comanda» aparece solo en mesas `LIBRE`; las `OCUPADA` no enlazan a su comanda (fuera de alcance).
- Supuesto: «Facturar» aparece en toda comanda `CERRADA`; si ya tiene factura, el diálogo muestra el error del backend (no hay endpoint nuevo).
- Supuesto: un parámetro inválido o desconocido no rompe la pantalla (ver E04, E05, E09, E10).
- Supuesto: el campo «N° de comanda» del diálogo abierto desde Pagos sigue disponible.

## Requisitos y escenarios

### R1 · Mesa → Comanda
#### Escenario E01 (camino feliz)
- **Dado** una mesa `LIBRE` en la tabla de Salón **Cuando** pulso «Abrir comanda» **Entonces** navega a `/atencion?mesa=<id>`.
#### Escenario E02 (camino feliz)
- **Dado** que llego a `/atencion?mesa=<id>` con la mesa `LIBRE` **Cuando** carga la pantalla **Entonces** el formulario «Nueva comanda» está abierto con esa mesa elegida y el parámetro se quita de la URL.
#### Escenario E03 (límite)
- **Dado** una mesa `OCUPADA` o `FUERA_DE_SERVICIO` **Cuando** miro sus acciones **Entonces** no aparece «Abrir comanda».
#### Escenario E04 (error)
- **Dado** `/atencion?mesa=<id>` con una mesa que ya no está `LIBRE` o que no existe **Cuando** carga la pantalla **Entonces** el formulario se abre sin mesa preseleccionada y sin error.
#### Escenario E05 (error)
- **Dado** `/atencion?mesa=abc` (o `0`, o negativo) **Cuando** carga la pantalla **Entonces** se ignora el parámetro, el formulario no se abre por esa vía y no hay error.
#### Escenario E06 (límite)
- **Dado** `/atencion` sin parámetro **Cuando** carga **Entonces** el formulario permanece cerrado (comportamiento actual).

### R2 · Comanda → Factura
#### Escenario E07 (camino feliz)
- **Dado** una comanda `CERRADA` en la lista de Atención **Cuando** pulso «Facturar» **Entonces** navega a `/pagos?comanda=<id>`.
#### Escenario E08 (camino feliz)
- **Dado** que llego a `/pagos?comanda=<id>` de una comanda cerrada sin factura **Cuando** carga la pantalla **Entonces** el diálogo «Facturar» está abierto con el número de comanda cargado y la vista previa visible, y el parámetro se quita de la URL.
#### Escenario E09 (error)
- **Dado** `/pagos?comanda=<id>` de una comanda inexistente **Cuando** carga **Entonces** el diálogo muestra el error `404` del backend en un `Alert` y permite corregir el número.
#### Escenario E10 (error)
- **Dado** `/pagos?comanda=abc` **Cuando** carga **Entonces** se ignora el parámetro y la pantalla se muestra normal, sin diálogo ni error.
#### Escenario E11 (error)
- **Dado** una comanda ya facturada **Cuando** abro «Facturar» desde el enlace **Entonces** se muestra el error del backend y no se crea una segunda factura.

### R3 · Visibilidad de «Facturar»
#### Escenario E12 (límite)
- **Dado** comandas `ABIERTA` y `ANULADA` **Cuando** miro sus acciones **Entonces** no aparece «Facturar»; solo en las `CERRADA`.
#### Escenario E13 (límite)
- **Dado** que la lista de comandas está vacía **Cuando** carga Atención **Entonces** se muestra el estado vacío existente y ninguna acción.

### R4 · Alternativa manual
#### Escenario E14 (límite)
- **Dado** que abro «Facturar» desde el botón de Pagos (sin parámetro) **Cuando** se muestra el diálogo **Entonces** sigue el campo «N° de comanda» para escribir el número.

## Pantalla

- «Abrir comanda» en `MesasTabla` y «Facturar» en la tabla de comandas, con el mismo estilo de botones de acción de cada tabla.
- Cambios acotados a la UI de M3 y M6; se avisa a sus responsables y a Juan (M4) en el PR (AGENTS.md, regla 3).
- Pruebas: una por escenario como mínimo en los `*.test.tsx` de `salon/`, `atencion/` y `pagos/`.
