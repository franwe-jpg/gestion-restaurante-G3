# Especificación: reservas-reporte-ausentismo

## Propósito

Reporte «reservas y ausentismo por período» del módulo M5 (issue #87, HU-M5-07): para un
período de fechas elegido, informa cuántas reservas hubo en total, cuántas fueron atendidas,
cuántas se cancelaron anticipadamente, cuántas se cancelaron por ausencia y qué porcentaje del
total representa el ausentismo. Es de solo lectura: no crea, modifica ni cancela ninguna reserva
(esas operaciones son de HU-M5-01 a HU-M5-05, capacidad `reservas-gestion`). Cuando el período no
tiene reservas, el reporte lo informa y no calcula ningún porcentaje (CA 2 del issue).

Capacidad nueva (no hay spec archivada de ningún reporte de `reservas/`): todo el contenido es
`ADDED`. No modifica `reservas-gestion` ni ninguna otra capacidad.

Origen: HU-M5-07 (issue #87), un solo cambio. Fuera de alcance (propuesta, sección «Excluido»):
cualquier migración de esquema, desgloses por día/franja/mesa/cliente, gráficos, CSV, paginación,
autenticación y roles, y cambios en otros módulos o en `backend/app/shared/`.

## Convención de los escenarios

Salvo que se indique otra cosa, los escenarios reutilizan el mismo reloj fijo que ya usan las
pruebas del módulo (`backend/tests/modules/reservas/conftest.py`, fixture `AHORA`): «hoy» es
`2026-11-02` y la hora actual de la zona del restaurante son las `12:00`. Este reporte no
consulta mesa ni cliente (no hay puente involucrado): una «reserva» de un escenario se describe
solo por su `fecha` y su `estado` (uno de `ACTIVA`, `ATENDIDA`, `CANCELADA_ANTICIPADA`,
`CANCELADA_POR_AUSENCIA`), y la hora de cada reserva no afecta ningún cálculo de este reporte
(el período se compara contra la `fecha`, no contra la `fecha` y la `hora` juntas). Ninguna
reserva del reporte necesita ser creada por `POST /reservas`: las pruebas de `repository`,
`reporte.py` y `service` pueden insertarla directamente, incluidas las `ATENDIDA`, porque HU-M5-06
(la transición real a `ATENDIDA`) todavía no existe.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y código 422 (D-25), igual
que el resto del módulo.

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `GET /reportes/reservas-ausentismo` | query `fecha_desde` y `fecha_hasta` (`YYYY-MM-DD`), las dos obligatorias | 200, `ResumenReservas` | 422 |
| `GET /reportes/reservas-ausentismo/pdf` | mismo query | 200, `application/pdf`, con `Content-Disposition: attachment` y un nombre de archivo que incluye el período | 422 |

Ninguna de las dos rutas tiene cuerpo ni modifica datos. El 422 de las dos rutas usa los mismos
cuatro mensajes literales y el mismo orden de validación (sección «Validación del período»); la
ruta `/pdf` responde el mismo 422 JSON que la ruta sin `/pdf` (no un PDF de error).

Esquema `ResumenReservas` (nombres JSON en `snake_case`, eco del diagrama con el campo `atendidas`
agregado por precedencia del issue sobre el diagrama, ver `proposal.md`, sección «Decisión: el DTO
incluye `atendidas`»):

| Campo | Tipo | Contenido |
| --- | --- | --- |
| `fecha_desde` | `date` | Eco del `fecha_desde` validado del período pedido. |
| `fecha_hasta` | `date` | Eco del `fecha_hasta` validado del período pedido. |
| `total_reservas` | `int` | Reservas con `fecha` en `[fecha_desde, fecha_hasta]`, en cualquier estado. |
| `atendidas` | `int` | De esas, las que están `ATENDIDA`. |
| `canceladas_anticipada` | `int` | De esas, las que están `CANCELADA_ANTICIPADA`. |
| `canceladas_por_ausencia` | `int` | De esas, las que están `CANCELADA_POR_AUSENCIA`. |
| `porcentaje_ausentismo` | `Decimal \| None` | `canceladas_por_ausencia / total_reservas × 100`, redondeado a 2 decimales con `ROUND_HALF_UP`; `None` cuando `total_reservas` es `0`. La representación exacta del `Decimal` en JSON la fija el diseño, siguiendo el resto de los reportes ya integrados (S3). |

El DTO no incluye un contador separado para `ACTIVA`: se puede calcular como
`total_reservas - atendidas - canceladas_anticipada - canceladas_por_ausencia` (proposal, sección
«DTO resultante»).

## ADDED Requirements

### Requisito: Calcular el resumen de reservas del período (HU-M5-07, sección «Datos»)

`GET /reportes/reservas-ausentismo` con un período válido DEBE responder 200 con un
`ResumenReservas` cuyos `total_reservas`, `atendidas`, `canceladas_anticipada` y
`canceladas_por_ausencia` cuenten, entre las reservas con `fecha` en `[fecha_desde, fecha_hasta]`
(los dos extremos incluidos), las que están en cualquier estado, en `ATENDIDA`, en
`CANCELADA_ANTICIPADA` y en `CANCELADA_POR_AUSENCIA` respectivamente. Una reserva `ACTIVA` DEBE
contar en `total_reservas` pero no en ninguno de los otros tres contadores (S2). El cálculo DEBE
hacerse con una sola consulta agregada por estado (`repository`, `GROUP BY`), sin traer cada
reserva al `service` para contarla en Python.

#### Escenario: Camino feliz con reservas en los cuatro estados

- DADO que el período es `2026-10-01` a `2026-10-31` y existen seis reservas con `fecha` dentro
  de ese rango: dos `ACTIVA`, una `ATENDIDA`, dos `CANCELADA_ANTICIPADA` y una
  `CANCELADA_POR_AUSENCIA`
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200 con `total_reservas` 6, `atendidas` 1, `canceladas_anticipada` 2 y
  `canceladas_por_ausencia` 1

#### Escenario: Reservas fuera del período no se cuentan

- DADO el mismo período (`2026-10-01` a `2026-10-31`) y, además de las seis reservas del
  escenario anterior, una reserva `ATENDIDA` con `fecha` `2026-09-30` y otra
  `CANCELADA_POR_AUSENCIA` con `fecha` `2026-11-01`
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200 con los mismos valores del escenario anterior: las dos reservas de fuera
  del período no afectan ningún contador

#### Escenario: Período de un solo día

- DADO una reserva `ATENDIDA` con `fecha` `2026-10-15` y ninguna otra reserva con esa `fecha`
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-15&fecha_hasta=2026-10-15`
- ENTONCES responde 200 con `total_reservas` 1 y `atendidas` 1

### Requisito: Período sin reservas informa que no hay datos (HU-M5-07 CA 2, S1)

Si ninguna reserva tiene `fecha` en `[fecha_desde, fecha_hasta]`, el sistema DEBE responder 200
(no 404) con `total_reservas`, `atendidas`, `canceladas_anticipada` y `canceladas_por_ausencia`
en `0`, y `porcentaje_ausentismo` en `None` (`null` en JSON). El sistema NO DEBE calcular ningún
porcentaje para ese período: ningún número, incluido `0`, DEBE aparecer en `porcentaje_ausentismo`
cuando `total_reservas` es `0`. La invariante `total_reservas == 0 ⇔ porcentaje_ausentismo is None`
DEBE cumplirse siempre, en los dos sentidos.

#### Escenario: Período sin ninguna reserva

- DADO que no existe ninguna reserva con `fecha` entre `2026-01-01` y `2026-01-31`
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-01-01&fecha_hasta=2026-01-31`
- ENTONCES responde 200 con `total_reservas` 0, `atendidas` 0, `canceladas_anticipada` 0,
  `canceladas_por_ausencia` 0 y `porcentaje_ausentismo` `null`

#### Escenario: Período sin reservas propias, aunque existan reservas en otras fechas

- DADO una reserva `ACTIVA` con `fecha` `2026-02-01` (fuera del período pedido)
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-01-01&fecha_hasta=2026-01-31`
- ENTONCES responde 200 con los cuatro contadores en 0 y `porcentaje_ausentismo` `null`, porque
  esa reserva no tiene su `fecha` dentro del período pedido

#### Escenario: La pantalla no muestra ningún porcentaje cuando no hay datos

- DADO un período sin ninguna reserva
- CUANDO la persona pide el reporte desde la pantalla
- ENTONCES la pantalla muestra «No hay datos para el período seleccionado» y no muestra ningún
  porcentaje de ausentismo, ni siquiera `0 %`

### Requisito: Cálculo del porcentaje de ausentismo (HU-M5-07, sección «Cálculo»; S3)

Cuando `total_reservas` es mayor a `0`, `porcentaje_ausentismo` DEBE calcularse como
`(canceladas_por_ausencia / total_reservas) × 100`, redondeado a 2 decimales con
`ROUND_HALF_UP`. El denominador DEBE ser el total de reservas del período (incluye `ACTIVA`,
`ATENDIDA` y las dos cancelaciones), nunca solo las canceladas o solo las no ausentes.

#### Escenario: Porcentaje con un resultado exacto

- DADO un período con `total_reservas` 10, de las cuales 2 están `CANCELADA_POR_AUSENCIA`
- CUANDO se pide el reporte de ese período
- ENTONCES `porcentaje_ausentismo` es `20.00`

#### Escenario: Porcentaje que requiere redondeo

- DADO un período con `total_reservas` 3, de las cuales 1 está `CANCELADA_POR_AUSENCIA`
  (`1 / 3 × 100 = 33.333...`)
- CUANDO se pide el reporte de ese período
- ENTONCES `porcentaje_ausentismo` es `33.33`

#### Escenario: Sin ausencias, el porcentaje es cero y no `None`

- DADO un período con `total_reservas` 5 y `canceladas_por_ausencia` 0
- CUANDO se pide el reporte de ese período
- ENTONCES `porcentaje_ausentismo` es `0.00`, no `null` (la invariante de «sin datos» exige
  `total_reservas == 0`, no `canceladas_por_ausencia == 0`)

#### Escenario: Todas las reservas del período fueron por ausencia

- DADO un período con `total_reservas` 4 y las cuatro `CANCELADA_POR_AUSENCIA`
- CUANDO se pide el reporte de ese período
- ENTONCES `porcentaje_ausentismo` es `100.00`

### Requisito: Validación del período (HU-M5-07, sección «Filtro»; S4)

`fecha_desde` y `fecha_hasta` DEBEN ser obligatorios y tener el formato `YYYY-MM-DD`.
`fecha_desde` DEBE ser menor o igual que `fecha_hasta`. El sistema DEBE verificar, en este orden,
las mismas cuatro reglas y usar los mismos mensajes literales que `productos/reporte.py` (las
mismas que ya usa M1 para su reporte, reimplementadas dentro de `reservas/`, S4): faltan las dos
fechas → «Faltan la fecha desde y la fecha hasta.»; falta solo `fecha_desde` → «Falta la fecha
desde.»; falta solo `fecha_hasta` → «Falta la fecha hasta.»; `fecha_desde` posterior a
`fecha_hasta` → «El período es inválido: la fecha desde es posterior a la fecha hasta.». Cualquiera
de los cuatro casos DEBE responder 422 con `{"detalle": "<mensaje>"}` y NO DEBE ejecutar ninguna
consulta de conteo. No hay una amplitud máxima de período (S4): un período de varios años es
válido si las dos fechas están presentes y en el orden correcto.

#### Escenario: Faltan las dos fechas

- DADO ninguna reserva en particular
- CUANDO se hace `GET /reportes/reservas-ausentismo` sin `fecha_desde` ni `fecha_hasta`
- ENTONCES responde 422 con `{"detalle": "Faltan la fecha desde y la fecha hasta."}`

#### Escenario: Falta la fecha desde

- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_hasta=2026-10-31`
- ENTONCES responde 422 con `{"detalle": "Falta la fecha desde."}`

#### Escenario: Falta la fecha hasta

- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01`
- ENTONCES responde 422 con `{"detalle": "Falta la fecha hasta."}`

#### Escenario: La fecha desde es posterior a la fecha hasta

- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-31&fecha_hasta=2026-10-01`
- ENTONCES responde 422 con `{"detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."}`

#### Escenario: Las dos fechas iguales son un período válido

- DADO una reserva `ATENDIDA` con `fecha` `2026-10-15`
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-15&fecha_hasta=2026-10-15`
- ENTONCES responde 200, porque `fecha_desde == fecha_hasta` no es un período inverso

#### Escenario: Formato de fecha inválido

- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=15/10/2026&fecha_hasta=2026-10-31`
- ENTONCES responde 422 nombrando el campo `fecha_desde`, sin ejecutar ninguna consulta

#### Escenario: La ruta `/pdf` valida el período igual que la ruta JSON

- CUANDO se hace `GET /reportes/reservas-ausentismo/pdf?fecha_desde=2026-10-31&fecha_hasta=2026-10-01`
- ENTONCES responde 422 con el mismo cuerpo `{"detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."}`, no un PDF

### Requisito: Los bordes del período cuentan, los días fuera no (HU-M5-07, sección «Filtro»; S2)

Una reserva con `fecha` igual a `fecha_desde` o igual a `fecha_hasta` DEBE contar en el reporte.
Una reserva con `fecha` un día antes de `fecha_desde` o un día después de `fecha_hasta` NO DEBE
contar. La comparación es por `fecha`, no por `fecha` y `hora`: la `hora` de una reserva en el
borde no afecta si cuenta o no.

#### Escenario: Reserva exactamente en `fecha_desde`

- DADO una reserva `ACTIVA` con `fecha` `2026-10-01` (igual a `fecha_desde`)
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES `total_reservas` incluye esa reserva

#### Escenario: Reserva exactamente en `fecha_hasta`

- DADO una reserva `ATENDIDA` con `fecha` `2026-10-31` (igual a `fecha_hasta`)
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES `total_reservas` y `atendidas` incluyen esa reserva

#### Escenario: Un día antes de `fecha_desde` no cuenta

- DADO una reserva `CANCELADA_POR_AUSENCIA` con `fecha` `2026-09-30` (un día antes de
  `fecha_desde`) y ninguna otra reserva en el período
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200 con `total_reservas` 0 y `porcentaje_ausentismo` `null` (esa reserva
  queda fuera)

#### Escenario: Un día después de `fecha_hasta` no cuenta

- DADO una reserva `CANCELADA_POR_AUSENCIA` con `fecha` `2026-11-01` (un día después de
  `fecha_hasta`) y ninguna otra reserva en el período
- CUANDO se hace `GET /reportes/reservas-ausentismo?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200 con `total_reservas` 0 y `porcentaje_ausentismo` `null`

### Requisito: Exportación a PDF del reporte (S5, S6, S7)

`GET /reportes/reservas-ausentismo/pdf` con el mismo `fecha_desde` y `fecha_hasta` que la ruta
JSON DEBE responder 200 con `Content-Type: application/pdf` y un encabezado
`Content-Disposition: attachment` cuyo nombre de archivo incluye el período pedido. El PDF DEBE
mostrar el período en formato `dd/mm/aaaa`, la fecha de generación en hora local, los cinco datos
del `ResumenReservas` (`total_reservas`, `atendidas`, `canceladas_anticipada`,
`canceladas_por_ausencia` y `porcentaje_ausentismo`) y una línea que explica el cálculo del
porcentaje (S6). Cuando el período no tiene reservas, el PDF DEBE decirlo («no hay datos para el
período») en lugar de mostrar los cinco datos en cero con un porcentaje inventado (S5).

#### Escenario: Descarga del PDF con datos

- DADO un período con reservas en los cuatro estados
- CUANDO se hace `GET /reportes/reservas-ausentismo/pdf?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200, `Content-Type` `application/pdf`, y el nombre de archivo del
  `Content-Disposition` incluye `2026-10-01` y `2026-10-31`

#### Escenario: Descarga del PDF sin datos

- DADO un período sin ninguna reserva
- CUANDO se hace `GET /reportes/reservas-ausentismo/pdf?fecha_desde=2026-01-01&fecha_hasta=2026-01-31`
- ENTONCES responde 200 con `application/pdf` y el documento informa que no hay datos para ese
  período, sin ningún porcentaje

### Requisito: Pantalla del reporte (frontend)

La pantalla del reporte DEBE vivir en la ruta `/reportes/reservas-ausentismo` (S7), accesible
desde una tarjeta nueva en el catálogo de `/reportes` (`frontend/src/shared/components/reportes.ts`,
una entrada más, mismo patrón que M1). La pantalla DEBE permitir elegir `fecha_desde` y
`fecha_hasta` y, al pedir el reporte, DEBE mostrar los cinco datos del `ResumenReservas` cuando
`total_reservas` sea mayor a `0`. Cuando `total_reservas` sea `0` (equivalente a
`porcentaje_ausentismo === null`), la pantalla DEBE mostrar «No hay datos para el período
seleccionado» y ningún porcentaje. Un botón «Descargar PDF» DEBE estar disponible siempre que el
período sea válido, también cuando no haya datos. Si el período local es inválido (falta una
fecha o `fecha_desde` es posterior a `fecha_hasta`), la pantalla NO DEBE llamar a la API: DEBE
mostrar el mismo mensaje que el backend devolvería para ese caso. Si la API responde 422, la
pantalla DEBE mostrar el `detalle` de esa respuesta.

#### Escenario: La tarjeta abre la pantalla del reporte

- DADO la pantalla `/reportes`
- CUANDO la persona abre la tarjeta del reporte de reservas y ausentismo
- ENTONCES se navega a `/reportes/reservas-ausentismo`

#### Escenario: La pantalla muestra los cinco datos de un período con reservas

- DADO un período con reservas en los cuatro estados
- CUANDO la persona elige ese período y pide el reporte
- ENTONCES la pantalla muestra `total_reservas`, `atendidas`, `canceladas_anticipada`,
  `canceladas_por_ausencia` y el porcentaje de ausentismo que devolvió la API

#### Escenario: Validación local sin llamar a la API

- DADO la pantalla del reporte
- CUANDO la persona pide el reporte sin elegir `fecha_hasta`
- ENTONCES la pantalla muestra «Falta la fecha hasta.» y no se llama a la API

#### Escenario: Un 422 de la API se muestra igual que el de la validación local

- DADO que la validación local no detecta el problema (por ejemplo, por un desajuste de reloj
  entre el navegador y el servidor) y la API responde 422 con
  `{"detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."}`
- CUANDO la persona pide el reporte
- ENTONCES la pantalla muestra ese mismo `detalle`

#### Escenario: El botón de descarga está disponible aunque no haya datos

- DADO un período sin ninguna reserva
- CUANDO la persona pide el reporte
- ENTONCES la pantalla muestra «No hay datos para el período seleccionado» y el botón «Descargar
  PDF» sigue disponible

### Requisito: Aislamiento del módulo y del esquema (AGENTS.md sección 9.3; proposal, sección «Excluido»)

El cambio NO DEBE agregar ninguna migración de Alembic: los cuatro valores de `EstadoReserva` y el
índice `ix_reservas_fecha_hora` ya existen desde HU-M5-01-02-03. El cambio NO DEBE modificar
código de `salon/` (M3), `atencion/` (M4), `menus/` (M2), `productos/` (M1), `pagos/` (M6) ni
`backend/app/shared/` (se usa `app/shared/pdf.py:renderizar()` sin modificarlo). El reporte NO DEBE
escribir, actualizar ni borrar ninguna reserva: las dos rutas son exclusivamente de lectura.

#### Escenario: Sin migración nueva

- DADO el repositorio con el cambio terminado
- CUANDO se ejecuta `alembic heads`
- ENTONCES muestra el mismo head que antes del cambio

#### Escenario: Contratos de importación

- DADO el módulo `reservas` con el reporte terminado
- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos y `reservas` no agrega ninguna importación nueva de
  otro módulo

#### Escenario: El reporte no modifica ninguna reserva

- DADO un conjunto de reservas en distintos estados
- CUANDO se pide el reporte, en JSON y en PDF, para el período que las incluye
- ENTONCES ninguna reserva cambia de estado, de fecha ni de ningún otro dato

## Supuestos

Los supuestos S1 a S7 son los de la propuesta (`openspec/changes/HU-M5-07/proposal.md`, sección
«Supuestos a validar por el equipo»), aplicados tal como están en esta spec, sin reabrirlos:
S1 (forma del DTO sin datos), S2 (qué es una reserva «del período»), S3 (cálculo e
`ROUND_HALF_UP` del porcentaje), S4 (validación del período, mensajes de `productos/reporte.py`),
S5 (exportación a PDF, por convención del equipo), S6 (contenido del PDF) y S7 (rutas). El equipo
los valida en el PR, como el resto de los supuestos del cambio.
