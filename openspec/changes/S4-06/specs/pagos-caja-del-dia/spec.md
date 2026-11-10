# Especificación · Caja del día (S4-06, capacidad `pagos-caja-del-dia`)

**Estado:** BORRADOR para revisión · **Fuente:** issue #213, `proposal.md` (supuestos 3, 4 y 5) y `exploration.md`.

## Contrato de la API

| Método y ruta | Entrada | Salida | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/reportes/caja-del-dia` | sin parámetros | `200` `CajaDelDiaSalida` | ninguno propio; `500` solo ante falla no controlada |

- Solo lectura: no crea ni modifica datos. Sin migración de Alembic.
- `CajaDelDiaSalida`:
  - `fecha`: día calculado, `YYYY-MM-DD`.
  - `por_medio_pago`: lista de `{medio_pago_id, nombre, tipo, cantidad_cobros, monto}`, ordenada por `nombre`.
  - `total_cobrado`: suma de los `monto` de `por_medio_pago`.
  - `adeudado`: `{cantidad_facturas, monto}`.
- Importes como cadenas con 2 decimales (igual que HU-M6-03). Errores con formato `{"detalle": "mensaje"}` (D-26).
- La agregación se hace en la base con `SUM`/`COUNT` y `GROUP BY`; no se cargan filas a memoria (D-11, D-28).
- Arquitectura: `router → service → repository`; el `router` solo delega y devuelve el schema, nunca un modelo.

## Requisitos y escenarios

### R1 · Cobrado hoy por medio de pago
- `Supuesto:` el día se calcula con la zona del restaurante UTC-3 (`ZONA_DEL_RESTAURANTE`); los cobros se guardan en UTC y se convierten al comparar.
- `Supuesto:` se agrupa por `MedioPago` (nombre), solo los medios con cobros hoy, incluidos los dados de baja.

#### Escenario K01 (camino feliz)
- **Dado** tres cobros de hoy: 1000,00 y 500,00 en «Efectivo» y 2000,00 en «Tarjeta» **Cuando** pido `GET /reportes/caja-del-dia` **Entonces** responde `200`, `por_medio_pago` trae «Efectivo» con `cantidad_cobros` 2 y `monto` `"1500.00"`, «Tarjeta» con 1 y `"2000.00"`, y `total_cobrado` es `"3500.00"`.
#### Escenario K02 (límite, día del restaurante)
- **Dado** un cobro registrado a las 01:00 UTC de hoy (22:00 de ayer en UTC-3) y otro a las 04:00 UTC de hoy (01:00 de hoy en UTC-3) **Cuando** pido la caja **Entonces** solo cuenta el segundo.
#### Escenario K03 (límite, cobros de otros días)
- **Dado** cobros de ayer y de mañana **Cuando** pido la caja **Entonces** no figuran en `por_medio_pago` ni en `total_cobrado`.
#### Escenario K04 (límite, medio dado de baja)
- **Dado** un medio de pago dado de baja con un cobro hoy **Cuando** pido la caja **Entonces** el medio aparece con su cobro.

### R2 · Sin cobros hoy
#### Escenario K05 (límite, vacío)
- **Dado** que no hay cobros hoy **Cuando** pido la caja **Entonces** responde `200` con `por_medio_pago` vacía y `total_cobrado` `"0.00"` (no `404`).
#### Escenario K06 (límite, sin datos)
- **Dado** una base sin medios de pago, facturas ni cobros **Cuando** pido la caja **Entonces** responde `200`, `total_cobrado` `"0.00"` y `adeudado` `{cantidad_facturas: 0, monto: "0.00"}`.

### R3 · Adeudado
- `Supuesto:` adeudado = facturas en estado `ADEUDADA` de cualquier fecha; el monto es la suma de `saldo_pendiente`.

#### Escenario K07 (camino feliz)
- **Dado** dos facturas `ADEUDADA` con saldo 300,00 y 200,50, y una `PAGADA` **Cuando** pido la caja **Entonces** `adeudado` es `{cantidad_facturas: 2, monto: "500.50"}`.
#### Escenario K08 (límite)
- **Dado** una factura `ADEUDADA` creada hace varios días **Cuando** pido la caja **Entonces** igual cuenta en `adeudado`.
#### Escenario K09 (límite, pago parcial)
- **Dado** una factura con un cobro parcial de hoy que deja saldo 100,00 **Cuando** pido la caja **Entonces** el cobro suma en `por_medio_pago` y el saldo de 100,00 suma en `adeudado`.

### R4 · Error
#### Escenario K10 (error)
- **Dado** que la consulta a la base falla **Cuando** pido la caja **Entonces** responde un error con cuerpo `{"detalle": "mensaje"}` y no expone trazas ni detalles internos.
#### Escenario K11 (límite, solo lectura)
- **Dado** cualquier estado de la base **Cuando** pido la caja dos veces seguidas **Entonces** las dos respuestas son iguales y la cantidad de cobros y facturas no cambia.
