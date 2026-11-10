# Especificación · Apertura de altas con `?nueva=1` (S4-06, capacidad `inicio-panel`)

**Estado:** BORRADOR para revisión · **Fuente:** issue #213 y `proposal.md`. Toca M4 (`AtencionPage`) y M5 (`ReservasPage`); coordinar con Juan Ignacio y Federico y anotarlo en el PR.

## Comportamiento

- Al montar la página con el parámetro `nueva=1` en la URL, se abre el alta (comanda o reserva) y el parámetro se quita de la URL sin recargar y sin agregar una entrada al historial (`replace`).
- Cualquier otro valor del parámetro (`nueva=0`, `nueva=x`) se ignora y no abre nada.
- No se pierden otros parámetros (por ejemplo `?mesa=<id>` de S4-03): solo se quita `nueva`.
- Sin `nueva`, las páginas se comportan como hasta ahora.
- Los cambios son mínimos: unas líneas por página y una prueba por página.

## Requisitos y escenarios

### R1 · Atención al público (M4)
#### Escenario N01 (camino feliz)
- **Dado** que navego a `/atencion?nueva=1` **Cuando** la página carga **Entonces** se abre el formulario de alta de comanda y la URL queda `/atencion`.
#### Escenario N02 (límite, sin parámetro)
- **Dado** que navego a `/atencion` **Cuando** la página carga **Entonces** no se abre ningún alta.
#### Escenario N03 (límite, valor inválido)
- **Dado** que navego a `/atencion?nueva=abc` **Cuando** la página carga **Entonces** no se abre el alta y no hay error.
#### Escenario N04 (límite, otros parámetros)
- **Dado** que navego a `/atencion?nueva=1&mesa=5` **Cuando** la página carga **Entonces** se abre el alta y la URL conserva `mesa=5`.
#### Escenario N05 (límite, cierre del alta)
- **Dado** el alta abierta por `?nueva=1` **Cuando** la cierro **Entonces** no se vuelve a abrir (el parámetro ya no está).

### R2 · Reservas (M5)
#### Escenario N06 (camino feliz)
- **Dado** que navego a `/reservas?nueva=1` **Cuando** la página carga **Entonces** se abre el panel de alta de reserva y la URL queda `/reservas`.
#### Escenario N07 (límite, sin parámetro)
- **Dado** que navego a `/reservas` **Cuando** la página carga **Entonces** se muestra el listado sin abrir el alta.
#### Escenario N08 (límite, valor inválido)
- **Dado** que navego a `/reservas?nueva=abc` **Cuando** la página carga **Entonces** no se abre el alta y no hay error.
#### Escenario N09 (límite, recarga)
- **Dado** que el alta se abrió por `?nueva=1` **Cuando** recargo la página **Entonces** no se vuelve a abrir.
