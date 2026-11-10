# Delta para promociones-en-comanda (S4-02)

Capacidad nueva. No modifica el contrato HTTP de la comanda ni de la factura.

## Datos

| Campo | Tipo | Origen |
| --- | --- | --- |
| `descuento` | decimal (texto `"0.00"`) | Descuento absoluto de la línea, calculado por M2 al cotizar. |
| `promocion_id` | entero o nulo | `promociones.id` de la promoción aplicada a la línea. |
| `precio_unitario` | decimal (texto) | Precio de lista del producto o menú ejecutivo (sin promoción). |

La línea de comanda conserva el descuento y la promoción como datos históricos. La factura copia
`descuento` y calcula `subtotal = cantidad * precio_unitario - descuento`.

## Contrato interno

`menus.service.promocion_para_linea(db, *, producto_id, menu_ejecutivo_id, precio_unitario, cantidad, momento)`
devuelve `PromocionAplicable(promocion_id, descuento)` o `None`. Es de solo lectura: no confirma ni
revierte la transacción del llamador.

`atencion.adaptadores.CatalogoDeCarta.cotizar` DEBE completar `descuento` y `promocion_id` con ese
resultado. Si no hay promoción aplicable, `descuento` DEBE ser `0.00` y `promocion_id` DEBE ser nulo.

## ADDED Requirements

### Requisito: Aplicar la promoción vigente

El sistema DEBE aplicar a cada línea nueva de comanda la promoción que esté `HABILITADA`, cuya
vigencia incluya la fecha y hora de la cotización, cuyo día de la semana esté seleccionado y que
incluya el producto pedido.

- **DADO** un producto con una promoción vigente del 10 % y una línea de 2 unidades a 1500.50,
  **CUANDO** se cotiza la comanda, **ENTONCES** la línea guarda `descuento = 300.10` y el
  `promocion_id` de esa promoción.

### Requisito: No aplicar promociones no vigentes

El sistema NO DEBE aplicar una promoción `DESHABILITADA`, fuera del rango de fechas, fuera de los
días seleccionados o fuera de la franja horaria.

- **DADO** un producto cuya única promoción fue finalizada, **CUANDO** se cotiza la comanda,
  **ENTONCES** la línea guarda `descuento = 0.00` y `promocion_id = null`.
- **DADO** una promoción que no incluye el día local de la cotización, **CUANDO** se cotiza,
  **ENTONCES** no se aplica.
- **DADO** una promoción con franja de 17:00 a 20:30 y una cotización a las 20:30, **CUANDO** se
  cotiza, **ENTONCES** no se aplica (franja semiabierta).

### Requisito: Descuento según el tipo

El sistema DEBE calcular el descuento absoluto de la línea según el tipo de promoción.

- **DADO** el tipo `PORCENTAJE`, **CUANDO** se cotiza, **ENTONCES** el descuento es
  `cantidad * precio_unitario * porcentaje / 100`, redondeado a dos decimales.
- **DADO** el tipo `PRECIO_FIJO`, **CUANDO** se cotiza, **ENTONCES** el descuento es
  `max(0, (precio_unitario - precio_fijo) * cantidad)`, redondeado a dos decimales.
- **DADO** el tipo `NXM` con «lleva 2, paga 1», **CUANDO** se cotizan 3 unidades,
  **ENTONCES** el descuento equivale a 1 unidad y la unidad restante queda a precio regular.
- **DADO** el tipo `NXM` con «lleva 2, paga 1», **CUANDO** se cotiza 1 unidad,
  **ENTONCES** el descuento es `0.00` y la línea no lleva `promocion_id`.

### Requisito: Descuento acotado

El descuento DEBE ser mayor o igual a cero y no puede superar el importe bruto de la línea
(`cantidad * precio_unitario`).

- **DADO** un precio fijo mayor o igual al precio de lista, **CUANDO** se cotiza,
  **ENTONCES** el descuento es `0.00`.
- **DADO** un porcentaje del 100 %, **CUANDO** se cotiza, **ENTONCES** el descuento es el importe
  bruto de la línea.

### Requisito: Varias promociones vigentes

Si más de una promoción califica para la misma línea, el sistema DEBE aplicar la de mayor
descuento.

- **DADO** dos promociones vigentes del 10 % y del 25 %, **CUANDO** se cotiza,
  **ENTONCES** se aplica la del 25 %.
- **DADO** dos promociones con el mismo descuento, **CUANDO** se cotiza,
  **ENTONCES** se aplica la de menor id.

### Requisito: Menús ejecutivos sin promoción

El sistema NO DEBE aplicar promociones a una línea de menú ejecutivo.

- **DADO** una línea con `menu_ejecutivo_id` y promociones vigentes para sus productos,
  **CUANDO** se cotiza, **ENTONCES** la línea guarda `descuento = 0.00` y
  `promocion_id = null`.

### Requisito: La factura conserva el descuento

La factura DEBE copiar el descuento de la línea y restarlo del subtotal.

- **DADO** una comanda con una línea que aplicó una promoción vigente, **CUANDO** se previsualiza
  o se genera la factura, **ENTONCES** el detalle muestra el mismo `descuento` y el
  `subtotal = cantidad * precio_unitario - descuento`.

### Requisito: Historial inmutable

Finalizar o modificar una promoción NO DEBE cambiar el descuento ni la promoción guardados en las
líneas existentes.

- **DADO** una comanda con una promoción aplicada, **CUANDO** la promoción se finaliza y se
  consulta la comanda, **ENTONCES** su `descuento` y su `promocion_id` no cambian.
