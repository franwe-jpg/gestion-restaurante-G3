# Delta para atencion-clientes — HU-M4-01 (#48)

## MODIFIED Requirements

### Requisito: Alta de cliente vinculada a la primera reserva (#48)

En el alta de una reserva, el formulario de Cliente nuevo DEBE estar contenido dentro del formulario de Reserva; no DEBE presentarse como un alta independiente. El sistema DEBE registrar un cliente nuevo únicamente como parte del guardado exitoso de su primera reserva, asociarlo a esa reserva y confirmar ambos registros como una sola operación atómica. Si falla cualquier parte del alta conjunta, NO DEBE persistir ni el cliente nuevo ni la reserva. `nombre` y `telefono` DEBEN estar presentes y no vacíos. El nombre DEBE contener solo letras según #48 (`Supuesto:` letras acentuadas y espacios permitidos; ver la última sección de la especificación de referencia). Nombres repetidos DEBEN estar permitidos.

(Previously: El requisito vinculaba el registro del cliente con el guardado de la primera reserva y prohibía dejarlo persistido si la reserva fallaba, pero no explicitaba que el formulario de Cliente debía estar contenido en el formulario de Reserva ni expresaba la confirmación/reversión como atomicidad de ambos registros.)

#### Escenario: Cliente nuevo y primera reserva guardados (#48 CA1)

- Dado que se cargan nombre y teléfono de un cliente nuevo dentro del formulario de alta de una reserva
- Cuando se guarda exitosamente la reserva
- Entonces quedan registrados tanto el cliente como la reserva, asociados entre sí
- Y el cliente no queda registrado por separado antes de ese guardado.

#### Escenario: Cancelar el borrador de cliente nuevo

- Dado que se cargaron los datos de un cliente nuevo en el formulario de reserva
- Cuando se cancela el alta del cliente
- Entonces se ocultan y descartan solo los campos y datos del cliente nuevo
- Y se conservan los demás datos de la reserva
- Y se puede seleccionar un cliente existente.

#### Escenario: Falta un dato obligatorio del cliente (#48 CA2)

- Dado que al crear la reserva falta `nombre` o `telefono` del cliente nuevo
- Cuando se intenta guardar
- Entonces no se guarda el cliente ni la reserva
- Y se indica qué dato obligatorio falta.

#### Escenario: Nombre con números o caracteres especiales (#48 CA3)

- Dado que se informa un nombre de cliente con números o caracteres especiales
- Cuando se intenta registrar junto con la reserva
- Entonces no se guardan ni el cliente ni la reserva
- Y se advierte que el nombre solo debe contener letras.

#### Escenario: Fallo de la reserva tras validar el cliente (#48 CA1, límite)

- Dado que los datos del cliente son válidos pero la reserva no puede guardarse
- Cuando se intenta confirmar el alta conjunta
- Entonces el cliente tampoco queda registrado.
