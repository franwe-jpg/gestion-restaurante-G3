# Especificación: pagos-reporte-recaudacion

## Propósito

Reporte «recaudación por medio de pago y deuda pendiente» del módulo M6 (issue #89, HU-M6-08): para un período de fechas elegido, informa cuánto se cobró con cada medio de pago, el total cobrado y cuánto queda adeudado en facturas emitidas en el período. Es de solo lectura: no crea, modifica ni anula cobros ni facturas. Cuando el período no tiene cobros ni deuda, el reporte lo informa (CA 2 del issue).

Capacidad nueva (no hay specs de pagos en `openspec/specs/`): todo el contenido es `ADDED`. No modifica `caja-del-dia` (S4-06): su comportamiento no cambia.

Origen: HU-M6-08 (issue #89), un solo cambio. Fuera de alcance (propuesta, «Excluido»): migraciones e índices nuevos, filtro por medio de pago, gráficos, CSV, paginación, saldo histórico al cierre del período, y cambios en otros módulos o en `backend/app/shared/`.

## Convención de los escenarios

Los importes se escriben como texto con 2 decimales, igual que la API. Una «factura» se describe por `fecha_emision`, `estado` (`ADEUDADA` o `PAGADA`) y `saldo_pendiente`; un «cobro», por `fecha_hora`, `monto` y medio de pago. Las horas se dan en la zona del restaurante (UTC-3) salvo que se indique UTC. Las pruebas de `repository`, `reporte.py` y `service` pueden insertar facturas y cobros directamente.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y código 422 (D-25).

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `GET /reportes/recaudacion-por-medio-de-pago` | query `fecha_desde` y `fecha_hasta` (`YYYY-MM-DD`), las dos obligatorias | 200, `ResumenRecaudacion` | 422 |
| `GET /reportes/recaudacion-por-medio-de-pago/pdf` | mismo query | 200, `application/pdf`, con `Content-Disposition: attachment; filename="recaudacion-medio-pago_<desde>_<hasta>.pdf"` | 422 |

Ninguna ruta tiene cuerpo ni modifica datos. Los parámetros son opcionales en la firma del router a propósito: la validación la hace `reporte.validar_periodo`. La ruta `/pdf` responde el mismo 422 JSON que la ruta sin `/pdf` (no un PDF de error).

Esquema `ResumenRecaudacion` (JSON en `snake_case`; los importes son `Importe`, texto con 2 decimales):

| Campo | Tipo | Contenido |
| --- | --- | --- |
| `fecha_desde` | `date` | Eco del `fecha_desde` validado. |
| `fecha_hasta` | `date` | Eco del `fecha_hasta` validado. |
| `por_medio_pago` | `list[CobradoPorMedio]` | Un elemento por medio de pago con cobros en el período, ordenado por `nombre`. |
| `total_cobrado` | `Importe` | Suma de los `monto` de `por_medio_pago`, redondeada a 2 decimales. |
| `adeudado` | `AdeudadoSalida` | Deuda del período: `cantidad_facturas` (`int`) y `monto` (`Importe`). |

`CobradoPorMedio` (existente, S4-06): `medio_pago_id` (`int`), `nombre` (`str`), `tipo` (`TipoMedioPago`), `cantidad_cobros` (`int`), `monto` (`Importe`). `AdeudadoSalida` (existente): `cantidad_facturas` (`int`), `monto` (`Importe`).

## ADDED Requirements

### Requisito: Cobrado por medio de pago en el período (CA 1 y CA 3; S1, S3)

`GET /reportes/recaudacion-por-medio-de-pago` con un período válido DEBE responder 200 con un `ResumenRecaudacion` cuyo `por_medio_pago` agrupe los `Cobro` con `fecha_hora` en el intervalo del período por medio de pago, con `cantidad_cobros` y `monto` de cada grupo, y cuyo `total_cobrado` sea la suma de los montos. Los medios sin cobros en el período NO DEBEN aparecer. Los medios dados de baja (`eliminado`) con cobros en el período DEBEN aparecer (S3). El orden DEBE ser por `nombre`. La agregación DEBE hacerse en SQL (`GROUP BY`), reutilizando `sumar_cobros_por_medio`, sin traer cada cobro al `service`.

#### Escenario: Cobros agrupados por medio con total cobrado (CA 1, CA 3)

- DADO el período `2026-10-01` a `2026-10-31` y, dentro de él, tres cobros: dos con «Efectivo» por `1000.00` y `500.00`, y uno con «Tarjeta» por `2000.00`
- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200 con `por_medio_pago` de dos elementos ordenados por nombre: «Efectivo» con `cantidad_cobros` 2 y `monto` `1500.00`, y «Tarjeta» con `cantidad_cobros` 1 y `monto` `2000.00`; y `total_cobrado` `3500.00`

#### Escenario: Los cobros fuera del período no cuentan

- DADO el mismo período y, además, un cobro con «Efectivo» el `2026-09-30 23:59` y otro el `2026-11-01 00:00`
- CUANDO se pide el reporte de ese período
- ENTONCES esos dos cobros no afectan ningún monto ni cantidad

#### Escenario: Un medio sin cobros en el período no aparece

- DADO un medio «Billetera» habilitado sin cobros en el período
- CUANDO se pide el reporte
- ENTONCES `por_medio_pago` no contiene a «Billetera»

#### Escenario: Un medio dado de baja con cobros aparece (S3)

- DADO un medio «Cheque» con `eliminado = true` y un cobro suyo en el período
- CUANDO se pide el reporte
- ENTONCES `por_medio_pago` contiene «Cheque» con su `cantidad_cobros` y `monto`

### Requisito: Deuda del período (CA 1 y CA 4; S2)

El campo `adeudado` DEBE contar y sumar, entre las facturas con `fecha_emision` en el intervalo del período y estado `ADEUDADA`, su cantidad (`cantidad_facturas`) y la suma de su `saldo_pendiente` actual (`monto`). Las facturas `PAGADA` NO DEBEN contar. Una factura con un cobro parcial es `ADEUDADA` y cuenta con su saldo restante, no con su total. La deuda DEBE depender del período: facturas `ADEUDADA` emitidas fuera de él NO DEBEN contar. `resumir_facturas_adeudadas` DEBE aceptar `desde` y `hasta` opcionales y, sin ellos, mantener el snapshot actual usado por `caja-del-dia`.

#### Escenario: El reporte incluye el total adeudado (CA 4)

- DADO el período `2026-10-01` a `2026-10-31` con dos facturas `ADEUDADA` emitidas en él, con `saldo_pendiente` `800.00` y `450.50`
- CUANDO se pide el reporte de ese período
- ENTONCES `adeudado` es `{"cantidad_facturas": 2, "monto": "1250.50"}`

#### Escenario: Cobrado y adeudado en la misma respuesta (CA 1)

- DADO cobros por `3500.00` y una factura `ADEUDADA` con saldo `800.00` en el período
- CUANDO se pide el reporte
- ENTONCES la respuesta trae `por_medio_pago`, `total_cobrado` `3500.00` y `adeudado.monto` `800.00`

#### Escenario: Una factura pagada no es deuda

- DADO una factura `PAGADA` emitida en el período
- CUANDO se pide el reporte
- ENTONCES no suma a `adeudado`

#### Escenario: Factura con cobro parcial cuenta por su saldo

- DADO una factura `ADEUDADA` de total `1000.00` emitida en el período, con un cobro parcial de `400.00` y `saldo_pendiente` `600.00`
- CUANDO se pide el reporte
- ENTONCES `adeudado.monto` incluye `600.00` y `adeudado.cantidad_facturas` la cuenta como 1

#### Escenario: Deuda emitida fuera del período no cuenta

- DADO una factura `ADEUDADA` emitida el `2026-09-30` y otra el `2026-11-01`
- CUANDO se pide el reporte de `2026-10-01` a `2026-10-31`
- ENTONCES ninguna suma a `adeudado`

#### Escenario: `caja-del-dia` conserva su snapshot

- DADO facturas `ADEUDADA` de cualquier fecha
- CUANDO se hace `GET /reportes/caja-del-dia`
- ENTONCES `deuda_pendiente` sigue contando todas, sin filtro por fecha, como antes del cambio

### Requisito: Período sin datos (CA 2; S5)

Si el período no tiene cobros ni facturas `ADEUDADA` emitidas en él, el sistema DEBE responder 200 (no 404) con `por_medio_pago` vacío, `total_cobrado` `0.00` y `adeudado` con `cantidad_facturas` `0` y `monto` `0.00`. La pantalla DEBE mostrar «No hay datos para el período seleccionado». El PDF DEBE generarse igual, con ese mismo texto y sin tablas.

#### Escenario: Período sin cobros ni deuda (CA 2)

- DADO que no existen cobros ni facturas `ADEUDADA` emitidas entre `2026-01-01` y `2026-01-31`
- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_desde=2026-01-01&fecha_hasta=2026-01-31`
- ENTONCES responde 200 con `por_medio_pago` `[]`, `total_cobrado` `0.00` y `adeudado` `{"cantidad_facturas": 0, "monto": "0.00"}`

#### Escenario: La pantalla informa que no hay datos (CA 2)

- DADO un período sin cobros ni deuda
- CUANDO la persona pide el reporte desde la pantalla
- ENTONCES la pantalla muestra «No hay datos para el período seleccionado» y no muestra tabla por medio

#### Escenario: Deuda con cero cobros

- DADO un período sin cobros y con una factura `ADEUDADA` con saldo `800.00` emitida en él
- CUANDO se pide el reporte
- ENTONCES responde 200 con `por_medio_pago` `[]`, `total_cobrado` `0.00` y `adeudado.monto` `800.00`; y la pantalla muestra la deuda y «Sin cobros en el período», no «No hay datos para el período seleccionado»

#### Escenario: Cobros sin deuda

- DADO un período con cobros y sin facturas `ADEUDADA`
- CUANDO se pide el reporte
- ENTONCES `adeudado` es cero y la pantalla muestra la tabla por medio, no el estado vacío

### Requisito: Validación del período (S9)

`fecha_desde` y `fecha_hasta` DEBEN ser obligatorios y tener formato `YYYY-MM-DD`; `fecha_desde` DEBE ser menor o igual que `fecha_hasta`. El sistema DEBE verificar, en este orden, cuatro reglas con mensajes literales (copia local en `pagos/reporte.py`, sin importar de otro módulo): faltan las dos → «Faltan la fecha desde y la fecha hasta.»; falta `fecha_desde` → «Falta la fecha desde.»; falta `fecha_hasta` → «Falta la fecha hasta.»; `fecha_desde` posterior a `fecha_hasta` → «El período es inválido: la fecha desde es posterior a la fecha hasta.». Cada caso DEBE responder 422 con `{"detalle": "<mensaje>"}` y NO DEBE ejecutar ninguna consulta. No hay amplitud máxima.

#### Escenario: Faltan las dos fechas

- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago` sin parámetros
- ENTONCES responde 422 con `{"detalle": "Faltan la fecha desde y la fecha hasta."}`

#### Escenario: Falta la fecha desde

- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_hasta=2026-10-31`
- ENTONCES responde 422 con `{"detalle": "Falta la fecha desde."}`

#### Escenario: Falta la fecha hasta

- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_desde=2026-10-01`
- ENTONCES responde 422 con `{"detalle": "Falta la fecha hasta."}`

#### Escenario: Período inverso

- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_desde=2026-10-31&fecha_hasta=2026-10-01`
- ENTONCES responde 422 con `{"detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."}`

#### Escenario: Fechas iguales son un período válido

- DADO un cobro el `2026-10-15 12:00`
- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_desde=2026-10-15&fecha_hasta=2026-10-15`
- ENTONCES responde 200 e incluye ese cobro

#### Escenario: Formato de fecha inválido

- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago?fecha_desde=15/10/2026&fecha_hasta=2026-10-31`
- ENTONCES responde 422 nombrando el campo `fecha_desde`, sin ejecutar consultas

#### Escenario: La ruta `/pdf` valida igual que la ruta JSON

- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago/pdf?fecha_desde=2026-10-31&fecha_hasta=2026-10-01`
- ENTONCES responde 422 con el mismo cuerpo JSON del período inverso, no un PDF

### Requisito: Límites inclusivos del período en UTC-3 (S1)

El período DEBE traducirse al intervalo semiabierto `[00:00 local de fecha_desde, 00:00 local de fecha_hasta + 1 día)` con zona UTC-3, expresado en UTC (`intervalo_utc`, copia local). Se aplica a `Cobro.fecha_hora` y a `Factura.fecha_emision`. Los dos extremos son inclusivos como fechas.

#### Escenario: Cobro en el primer instante de `fecha_desde`

- DADO un cobro con `fecha_hora` `2026-10-01 00:00` local (`2026-10-01 03:00` UTC)
- CUANDO se pide el reporte de `2026-10-01` a `2026-10-31`
- ENTONCES el cobro cuenta

#### Escenario: Cobro en el último instante de `fecha_hasta`

- DADO un cobro el `2026-10-31 23:59` local (`2026-11-01 02:59` UTC)
- CUANDO se pide el reporte de `2026-10-01` a `2026-10-31`
- ENTONCES el cobro cuenta, aunque su fecha UTC sea `2026-11-01`

#### Escenario: Un instante antes y uno después no cuentan

- DADO un cobro el `2026-09-30 23:59` local y otro el `2026-11-01 00:00` local
- CUANDO se pide el reporte de `2026-10-01` a `2026-10-31`
- ENTONCES ninguno cuenta

#### Escenario: La deuda usa el mismo intervalo

- DADO una factura `ADEUDADA` emitida el `2026-10-31 23:30` local y otra el `2026-11-01 00:00` local
- CUANDO se pide el reporte de `2026-10-01` a `2026-10-31`
- ENTONCES solo la primera suma a `adeudado`

### Requisito: Exportación a PDF (S8)

`GET /reportes/recaudacion-por-medio-de-pago/pdf` con el mismo período DEBE responder 200 con `Content-Type: application/pdf` y `Content-Disposition: attachment` con nombre `recaudacion-medio-pago_<desde>_<hasta>.pdf` (fechas `YYYY-MM-DD`). El PDF DEBE mostrar el período como «Período: dd/mm/aaaa al dd/mm/aaaa», la fecha de generación en hora local, la tabla por medio (nombre, tipo, cantidad de cobros, monto), un recuadro resumen con total cobrado y total adeudado (con cantidad de facturas) y un párrafo que explica que la deuda es la suma del saldo pendiente actual de las facturas adeudadas emitidas en el período (S2). Reutiliza el resultado del reporte JSON y `shared.pdf.renderizar` sin modificarlo.

#### Escenario: Descarga del PDF con datos

- DADO un período con cobros y deuda
- CUANDO se hace `GET /reportes/recaudacion-por-medio-de-pago/pdf?fecha_desde=2026-10-01&fecha_hasta=2026-10-31`
- ENTONCES responde 200, `Content-Type` `application/pdf` y `Content-Disposition` con `attachment` y `filename="recaudacion-medio-pago_2026-10-01_2026-10-31.pdf"`

#### Escenario: Descarga del PDF sin datos

- DADO un período sin cobros ni deuda
- CUANDO se pide el PDF
- ENTONCES responde 200 con `application/pdf` y el documento dice «No hay datos para el período seleccionado», sin tablas

### Requisito: Pantalla del reporte y tarjeta en el hub (S6, S9)

La pantalla DEBE vivir en `/reportes/recaudacion-por-medio-de-pago`, accesible desde una tarjeta nueva, al final del catálogo de `frontend/src/shared/components/reportes.ts`, que no importa de `modules/`. Debe permitir elegir las dos fechas y pedir el reporte. Con datos, DEBE mostrar tarjetas de total cobrado y de total adeudado (con cantidad de facturas), una tabla por medio (nombre, tipo, cantidad de cobros, monto) y una nota que aclara que la deuda es el saldo pendiente actual de las facturas emitidas en el período. Los importes se formatean es-AR con `formatearMoneda`. El botón «Descargar PDF» DEBE estar disponible siempre que haya resultado, también sin datos. Si el período local es inválido, NO DEBE llamar a la API y DEBE mostrar el mismo mensaje del backend (`validarPeriodo.ts`, copia local); si la API responde 422, DEBE mostrar el `detalle`. Un error de descarga se muestra en un aviso.

#### Escenario: La tarjeta abre la pantalla

- DADO la pantalla `/reportes`
- CUANDO la persona abre la tarjeta de recaudación por medio de pago
- ENTONCES navega a `/reportes/recaudacion-por-medio-de-pago`

#### Escenario: La pantalla muestra cobrado por medio y adeudado (CA 1, 3, 4)

- DADO una respuesta con cobros en «Efectivo» y «Tarjeta» y deuda de 2 facturas
- CUANDO la persona elige el período y pide el reporte
- ENTONCES se ven el total cobrado, el total adeudado con «2 facturas», y la tabla con una fila por medio

#### Escenario: Validación local sin llamar a la API

- CUANDO la persona pide el reporte sin elegir `fecha_hasta`
- ENTONCES muestra «Falta la fecha hasta.» y no se llama a la API

#### Escenario: Un 422 de la API se muestra

- DADO que la API responde 422 con `{"detalle": "El período es inválido: la fecha desde es posterior a la fecha hasta."}`
- CUANDO la persona pide el reporte
- ENTONCES la pantalla muestra ese `detalle`

#### Escenario: El botón de descarga está disponible sin datos

- DADO un período sin cobros ni deuda
- CUANDO la persona pide el reporte
- ENTONCES se ve «No hay datos para el período seleccionado» y «Descargar PDF» sigue disponible

#### Escenario: Falla la descarga

- DADO que la descarga del PDF falla
- CUANDO la persona pulsa «Descargar PDF»
- ENTONCES se muestra un aviso de error y el resultado en pantalla se conserva

### Requisito: Aislamiento del módulo y del esquema (AGENTS.md §9.3; S7)

El cambio NO DEBE agregar migraciones ni índices. NO DEBE modificar código de otros módulos ni de `backend/app/shared/`; en el frontend solo agrega una entrada en `reportes.ts`, una `<Route>` en `App.tsx` y una prueba de la tarjeta en `ReportesPage.test.tsx`. Las dos rutas son exclusivamente de lectura. El router solo delega al `service`, el `service` no importa FastAPI y los importes se serializan como texto con 2 decimales.

#### Escenario: Sin migración nueva

- CUANDO se ejecuta `alembic heads`
- ENTONCES muestra el mismo head que antes del cambio

#### Escenario: Contratos de importación

- CUANDO se ejecuta `lint-imports`
- ENTONCES pasa sin cambios en los contratos y `pagos` no importa nada nuevo de otro módulo

#### Escenario: El reporte no modifica datos

- DADO facturas y cobros existentes
- CUANDO se pide el reporte en JSON y PDF
- ENTONCES ningún cobro ni factura cambia

## Supuestos

Los supuestos S1 a S9 son los de la propuesta (`openspec/changes/HU-M6-08/proposal.md`, «Supuestos a validar por el equipo») y se aplican sin reabrirlos:

| # | Supuesto: |
| --- | --- |
| S1 | Cobros del período: `Cobro.fecha_hora` en `[00:00 local de desde, 00:00 local de hasta + 1)`, UTC−3; extremos inclusivos. |
| S2 | Deuda del período: facturas con `fecha_emision` en el mismo intervalo y estado `ADEUDADA`; monto = suma del `saldo_pendiente` actual (no el saldo al cierre). Se aclara en pantalla y en el PDF. |
| S3 | Se agrupan los medios con cobros en el período, incluidos los dados de baja; los medios sin cobros no aparecen. Orden por nombre. |
| S4 | Sin filtro por medio de pago: el diagrama no lo tiene; el «medio de pago» del issue es la agrupación. |
| S5 | Sin datos: sin cobros ni deuda → 200 en cero y «No hay datos para el período seleccionado»; el PDF se genera igual. Con deuda y sin cobros: se muestra la deuda y «Sin cobros en el período». |
| S6 | Importes como texto con 2 decimales; en pantalla, formato es-AR (`formatearMoneda`). |
| S7 | Sin migración ni índices nuevos. Seguimiento: si el equipo exige RNF-REN-05 al pie de la letra, agregar `ix_cobros_fecha_hora` e `ix_facturas_fecha_emision`. |
| S8 | PDF incluido, por la convención de HU-M1-15 y HU-M5-07. |
| S9 | Mensajes de validación y `validarPeriodo.ts` son copias locales, no importados de otro módulo. |

Supuesto adicional de la spec: `total_cobrado` se calcula a partir de `por_medio_pago` (suma redondeada a 2 decimales), no con una consulta aparte.

## Trazabilidad de los criterios de aceptación

| CA del issue #89 | Escenarios |
| --- | --- |
| 1. Cobrado por medio y adeudado | «Cobros agrupados por medio con total cobrado», «Cobrado y adeudado en la misma respuesta», «La pantalla muestra cobrado por medio y adeudado» |
| 2. Período sin cobros: no hay datos | «Período sin cobros ni deuda», «La pantalla informa que no hay datos», «Deuda con cero cobros» (matiz S5) |
| 3. Cobros agrupados por medio | «Cobros agrupados por medio con total cobrado», «Un medio sin cobros en el período no aparece», «Un medio dado de baja con cobros aparece» |
| 4. Total adeudado | «El reporte incluye el total adeudado», «Factura con cobro parcial cuenta por su saldo», «Deuda emitida fuera del período no cuenta» |
