# Delta para promociones (HU-M2-07-08-09)

Capacidad nueva: `promociones`. No modifica `menus-ejecutivos` ni `menus-del-dia`.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-25/D-26).

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `POST /promociones` | `PromocionCrear` (JSON) | `201` `PromocionSalida` | `404` producto inexistente · `409` nombre repetido o producto deshabilitado · `422` datos inválidos |
| `PUT /promociones/{id}` | `PromocionModificar` (JSON) | `200` `PromocionSalida` | `404` no existe · `409` finalizada, aplicada o nombre repetido · `422` datos inválidos |
| `POST /promociones/{id}/finalizar` | — | `200` `PromocionSalida` con `estado` `DESHABILITADO` | `404` no existe · `409` ya finalizada |
| `GET /promociones?estado=&limit=&offset=` | — | `200` `Pagina[PromocionListado]` | `422` filtro inválido |

`PromocionCrear`: `nombre` (1..100), `tipo` (`PORCENTAJE`, `PRECIO_FIJO`, `NXM`), `descripcion`
(0..500, opcional), `producto_ids` (mínimo 1, sin repetidos), `fecha_desde`, `fecha_hasta`,
`dias_semana` (mínimo 1, sin repetidos), `hora_desde` y `hora_hasta` (opcionales, ambas o ninguna),
y los campos del tipo: `descuento_porcentaje` (entero 1..100), `precio_fijo` (decimal > 0, dos
decimales) o `cant_lleva`/`cant_paga` (enteros > 0, `cant_paga < cant_lleva`). `extra="forbid"`: el
`estado` lo fija el sistema en `HABILITADO`.

`PromocionSalida`: los campos anteriores más `id`, `estado`, `fecha_hora_finalizacion`,
`productos` (`ProductoResumen`) y las horas como `HH:MM`; `precio_fijo` se serializa con dos
decimales.

## ADDED Requirements

### Requisito: Registrar una promoción

El sistema DEBE registrar la promoción, asociarla a los productos seleccionados y dejarla en estado
`HABILITADO`.

- **Dado** todos los datos requeridos y válidos, **cuando** se guarda, **entonces** responde `201`,
  la promoción queda persistida con sus productos y `estado = HABILITADO`.

### Requisito: Datos obligatorios

El sistema NO DEBE guardar una promoción a la que le falte nombre, tipo, vigencia, días o productos.

- **Dado** que falta uno de esos datos, **cuando** se intenta guardar, **entonces** responde `422` y
  el campo faltante aparece en el detalle.

### Requisito: Nombre único

El sistema NO DEBE admitir dos promociones con el mismo nombre normalizado.

- **Dado** un nombre ya registrado, **cuando** se intenta guardar otra promoción con ese nombre,
  **entonces** responde `409` con un mensaje que invita a elegir un nombre único.

### Requisito: Vigencia coherente

El sistema NO DEBE aceptar `fecha_hasta` anterior a `fecha_desde`.

- **Dado** un rango de fechas inválido, **cuando** se intenta guardar, **entonces** responde `422`.
- **Dado** `fecha_hasta` igual a `fecha_desde`, **cuando** se guarda, **entonces** es válido.

### Requisito: Franja horaria coherente

El sistema DEBE aceptar la franja vacía o ambas horas con `hora_hasta > hora_desde`.

- **Dado** solo una de las dos horas, **cuando** se intenta guardar, **entonces** responde `422`.
- **Dado** `hora_hasta` igual o anterior a `hora_desde`, **cuando** se intenta guardar,
  **entonces** responde `422`.

### Requisito: Días y productos

El sistema DEBE exigir al menos un día y al menos un producto.

- **Dado** que no se selecciona ningún día, **cuando** se intenta guardar, **entonces** responde
  `422`.
- **Dado** que no se selecciona ningún producto, **cuando** se intenta guardar, **entonces**
  responde `422`.

### Requisito: Valores según el tipo

El sistema DEBE exigir únicamente el campo correspondiente al tipo y validar su rango.

- **Dado** el tipo `PORCENTAJE`, **cuando** el descuento no es un entero entre 1 y 100,
  **entonces** responde `422`.
- **Dado** el tipo `PRECIO_FIJO`, **cuando** el precio no es mayor a 0 o tiene más de dos
  decimales, **entonces** responde `422`.
- **Dado** el tipo `NXM`, **cuando** `cant_paga` es mayor o igual a `cant_lleva`, **entonces**
  responde `422`.
- **Dado** un tipo distinto de `PORCENTAJE`, **cuando** llega un `descuento_porcentaje` no nulo,
  **entonces** responde `422`. En la pantalla el campo se oculta y se limpia al cambiar de tipo.


### Requisito: Modificar una promoción habilitada y no aplicada

`PUT /api/v1/promociones/{id}` DEBE reemplazar todas las condiciones de una promoción
`HABILITADA` que no haya sido aplicada en ninguna comanda.

- **Dado** una promoción `HABILITADA` sin uso en comandas, **cuando** se envían datos válidos,
  **entonces** responde `200` y la promoción queda con las nuevas reglas y productos.

### Requisito: Bloquear promociones finalizadas

El sistema NO DEBE modificar una promoción en estado `DESHABILITADO`.

- **Dado** una promoción finalizada, **cuando** se intenta modificar, **entonces** responde `409`
  con un mensaje que indica que no se pueden modificar promociones finalizadas.

### Requisito: Bloquear promociones ya aplicadas

El sistema NO DEBE modificar una promoción que ya aparece en una línea de comanda.

- **Dado** una promoción usada en al menos una comanda, **cuando** se intenta modificar,
  **entonces** responde `409` y sugiere finalizarla y crear una nueva para no alterar el historial.

### Requisito: Validaciones de la modificación

La modificación DEBE aplicar las mismas validaciones que el alta: datos obligatorios, nombre único,
vigencia coherente, horario coherente, días y productos, y campos exclusivos del tipo.

- **Dado** que se borra un obligatorio, **cuando** se guarda, **entonces** responde `422`.
- **Dado** que se cambia el tipo, **cuando** falta el valor del nuevo tipo o llega un campo del
  anterior, **entonces** responde `422`.
- **Dado** una fecha hasta anterior a la desde, **cuando** se guarda, **entonces** responde `422`.


### Requisito: Finalizar una promoción

`POST /api/v1/promociones/{id}/finalizar` DEBE pasar una promoción `HABILITADA` a
`DESHABILITADA`, registrar la fecha y hora exacta de la interrupción y no modificar comandas
anteriores.

- **Dado** una promoción habilitada, **cuando** se confirma la finalización, **entonces** responde
  `200`, queda `DESHABILITADA` y deja de aplicarse en pedidos nuevos.
- **Dado** una promoción ya deshabilitada, **cuando** se intenta finalizar, **entonces** responde
  `409` con un aviso de que ya está finalizada.
- **Dado** una promoción finalizada, **cuando** se consultan comandas anteriores, **entonces** sus
  precios, descuentos y subtotales no cambian.
- **Dado** una promoción finalizada antes de su fecha de fin, **cuando** se consulta su salida,
  **entonces** `fecha_hora_finalizacion` contiene el instante exacto.

### Requisito: Aplicación en la venta (fuera de alcance de M2)

El cálculo del remanente NxM sobre una venta corresponde a M4. M2 solo persiste la regla.

- **Dado** una promoción NxM «lleva 2, paga 1», **cuando** M4 cotice 3 unidades, **entonces** M4
  aplicará la promoción a 2 y dejará 1 a precio regular. Este escenario se verifica en el cambio de
  M4, no en este.
