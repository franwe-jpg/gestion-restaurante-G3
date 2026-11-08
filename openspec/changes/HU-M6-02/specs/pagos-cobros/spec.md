# Especificación · Cobros de facturas (HU-M6-02)

**Estado:** BORRADOR para revisión · **Fuente:** issue #71, diagrama de clases y `proposal.md` (supuestos S1–S7).

## Contrato de la API

| Método y ruta | Entrada | Salida | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/facturas?limit&offset` | paginación (50 por defecto, máx. 100) | `200` `Pagina[FacturaResumenSalida]` | `422` |
| `POST /api/v1/facturas/{factura_id}/cobros` | `CobroCrear` | `201` `FacturaSalida` | `404`, `409`, `422` |

- `CobroCrear`: `medio_pago_id` (entero > 0) y `monto` (decimal > 0, hasta 2 decimales). Campos extra prohibidos.
- `FacturaResumenSalida`: `id`, `comanda_id`, `fecha_emision`, `total`, `saldo_pendiente` y `estado` (`ADEUDADA`/`PAGADA`). Orden: emisión descendente, id descendente.
- `FacturaSalida`: la misma que HU-M6-01 (`id`, `comanda_id`, `fecha_emision`, `total`, `saldo_pendiente`, `estado`, `detalles` y `cobros`).
- `Cobro`: `id`, `numero_comprobante` (= `id`), `monto`, `fecha_hora` y `medio_pago_id`.
- Importes como cadenas con 2 decimales. Errores `{"detalle": "mensaje"}` (D-26).

## Requisitos y escenarios

### R1 · Registrar un cobro sobre una factura adeudada
#### Escenario F01 (CA1, camino feliz)
- **Dado** una factura ADEUDADA con saldo pendiente **Cuando** registro un cobro con un medio habilitado y un monto menor al saldo **Entonces** responde `201`, el saldo baja por el monto, la factura sigue ADEUDADA y el cobro aparece en `cobros` con `numero_comprobante`.
#### Escenario F02 (CA1, límite)
- **Dado** el mismo caso **Cuando** el monto es igual al saldo pendiente **Entonces** el saldo queda `0.00` y la factura queda PAGADA.

### R2 · La factura ya está pagada
#### Escenario F03 (CA2, error)
- **Dado** una factura PAGADA **Cuando** intento registrar un cobro **Entonces** responde `409` con `La factura ya está pagada` y no se crea ningún cobro.

### R3 · Monto inválido
#### Escenario F04 (CA3, error)
- **Dado** un monto mayor al saldo pendiente **Cuando** registro el cobro **Entonces** responde `422` con `El monto no puede superar el saldo pendiente de la factura` y no se modifica nada.
#### Escenario F05 (CA3, límite)
- **Dado** un monto cero o negativo **Cuando** registro el cobro **Entonces** responde `422` (validación del esquema) y no se modifica nada.

### R4 · Medio de pago no utilizable
#### Escenario F06 (CA4, error)
- **Dado** un medio de pago DESHABILITADO **Cuando** registro el cobro **Entonces** responde `409` con `El medio de pago está deshabilitado` y no se modifica nada.
#### Escenario F07
- **Dado** un medio de pago inexistente o eliminado **Cuando** registro el cobro **Entonces** responde `404` y no se modifica nada.

### R5 · Medio ya usado en esa factura
#### Escenario F08 (CA5, error)
- **Dado** una factura con un cobro hecho con el medio de pago M **Cuando** intento registrar otro cobro con M **Entonces** responde `409` con `El medio de pago ya fue usado en esta factura` y no se crea el cobro. El primer cobro de HU-M6-01 cuenta como usado.

### R6 · Datos obligatorios
#### Escenario F09 (CA6, error)
- **Dado** un cobro sin `monto` o sin `medio_pago_id` **Cuando** lo envío **Entonces** responde `422` y no se modifica nada.

### R7 · Factura inexistente
#### Escenario F10
- **Dado** un `factura_id` que no existe **Cuando** registro el cobro **Entonces** responde `404` con `La factura {id} no existe`.

### R8 · Listado de facturas para la pantalla
#### Escenario F11
- **Dado** que existen facturas **Cuando** pido `GET /facturas` **Entonces** recibo `200` con la página, el total y las facturas ordenadas por emisión descendente.
#### Escenario F12 (límite)
- **Dado** que no existen facturas **Entonces** recibo `200` con `items` vacío y `total` 0.

### R9 · Atomicidad y coherencia
#### Escenario F13
- **Dado** que el cobro es inválido o falla un paso **Entonces** no queda cobro, ni cambia el saldo, ni cambia el estado (una sola transacción).
#### Escenario F14
- **Dado** una factura con varios cobros **Cuando** la consulto **Entonces** `saldo_pendiente = total − suma de los cobros` y `estado` es PAGADA solo si el saldo es `0.00`.

## Pantalla (guía: `SPRINT-2/S2-04-maqueta/pagos.html`)
- `PagosPage` con pestañas «Medios de pago» y «Facturas». La pestaña «Facturas» muestra N°, Comanda, Emisión, Total, Saldo pendiente, Estado y un botón «Cobrar» solo en las ADEUDADA.
- El diálogo muestra el saldo pendiente y los cobros ya registrados, pide medio de pago (solo habilitados y no usados en esa factura) e importe (por defecto el saldo), y avisa con un toast al registrar el cobro.
- **Diferencia con la maqueta:** no se muestra la columna Mesa (S5), no hay número de factura con formato `0001-...` (se usa el id) y el listado no filtra por estado (S2). Se anota en el PR.
