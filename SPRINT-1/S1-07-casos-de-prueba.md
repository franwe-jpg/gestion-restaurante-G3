# Casos de Prueba — Sprint 1

## Asignación de Casos de Prueba

| Caso | Historia de Usuario | Tipo / Descripción | Responsable |
| :---: | :--- | :--- | :--- |
| **1** | **HU-M1-01** Crear un plato | Caso del módulo M1 | Franco |
| **2** | **HU-M2-01** Crear un menú ejecutivo | Caso del módulo M2 | Joaquín |
| **3** | **HU-M3-05** Crear una mesa | Caso del módulo M3 | Giuliano |
| **4** | **HU-M4-01** Crear un cliente | Caso del módulo M4 | Juan |
| **5** | **HU-M5-01** Crear una reserva | Caso del módulo M5 | Federico |
| **6** | **HU-M6-04** Crear un medio de pago | Caso del módulo M6 | Héctor |
| **7** | **HU-M4-04** Crear una comanda | Flujo crítico | Juan |
| **8** | **HU-M4-09** Cerrar una comanda | Flujo crítico | Juan |
| **9** | **HU-M5-06** Crear una comanda a partir de una reserva | Flujo crítico | Federico |
| **10** | **HU-M6-01** Generar la factura de una comanda | Flujo crítico | Héctor |
| **11** | **HU-M6-02** Cobrar una factura adeudada | Flujo crítico | Héctor |

---

## Caso 1: CP-HU-M1-01 — Alta Plato
* **ID:** CP-HU-M1-01
* **Historia de Usuario:** *"Como encargado de cocina, quiero crear un plato para incorporarlo al menú del restaurante."*
* **Responsable:** Franco

### Datos de Entrada
* **Nombre:** Obligatorio, texto de 1 a 100 caracteres, único.
* **Categoría:** Obligatorio, enumerado `{ENTRADA, PLATO_PRINCIPAL, POSTRE, BEBIDA}`.
* **Precio:** Obligatorio, decimal mayor a 0, hasta 2 decimales.
* **Ingredientes:** Lista de textos, al menos 1 ingrediente salvo que la Categoría sea `BEBIDA`.
* **Descripción:** Texto libre, de 0 a 200 caracteres, opcional.
* **Imagen:** Archivo de imagen, formatos JPG/PNG/HEIC, máximo 5MB, opcional.
* **Etiquetas:** Lista de textos, cada una hasta 30 caracteres, sin duplicados, opcional.
* **Estado:** Obligatorio, enumerado `{HABILITADO, DESHABILITADO}`. Asignado por defecto en `HABILITADO`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Nombre** | Texto 1 a 100 caracteres, único. | Texto 1-100 caracteres no registrado | Vacío · Más de 100 caracteres · Ya registrado | `"Milanesa"` *(Válido)* · `(vacío)` *(Inválido)* · `[Texto de 101 char]` *(Inválido)* · `"Milanesa"` *(Ya existe - Inválido)* |
| **Categoría** | Enumerado obligatorio. | Valor del enumerado | Vacío · Fuera del enumerado | `PLATO_PRINCIPAL` *(Válido)* · `(vacío)` *(Inválido)* · `"SNACK"` *(Inválido)* |
| **Precio** | Decimal > 0, hasta 2 decimales. | Decimal positivo | Vacío · $\le 0$ · Más de 2 decimales · No numérico | `1500.50` *(Válido)* · `(vacío)` *(Inválido)* · `0` *(Inválido)* · `1500.555` *(Inválido)* · `"mil"` *(Inválido)* |
| **Ingredientes** | $\ge 1$ salvo `BEBIDA`. | $\ge 1$ ingredientes (o 0 si es BEBIDA) | Lista vacía cuando NO es BEBIDA | `["Carne"]` *(Válido)* · `[]` con `PLATO_PRINCIPAL` *(Inválido)* |
| **Descripción** | Opcional, hasta 200 caracteres. | 0 a 200 caracteres | Más de 200 caracteres | `(vacío)` *(Válido)* · `[Texto de 201 char]` *(Inválido)* |
| **Imagen** | Opcional, JPG/PNG/HEIC, $\le$ 5MB. | Vacío · Archivo válido $\le$ 5MB | Formato no permitido · $> 5MB$ | `plato.jpg (2MB)` *(Válido)* · `receta.pdf` *(Inválido)* |
| **Etiquetas** | Opcional, $\le 30$ caracteres c/u, únicas. | Etiquetas válidas | Etiqueta $> 30$ char · Duplicados | `["sin-gluten"]` *(Válido)* · `["casero", "casero"]` *(Inválido)* |
| **Estado** | Enumerado, defecto HABILITADO. | `HABILITADO` | Vacío · Fuera de enumerado | `HABILITADO` *(Válido)* · `(vacío)` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** El plato queda registrado exitosamente en estado `HABILITADO`.
* **Con datos inválidos:** El plato no se guarda y el sistema indica qué dato falla.

### Prueba Realizada
* **Fecha:** _[Pendiente de ejecución - Sprint 2]_
* **Resultado:** _[Pendiente]_

---

## Caso 2: CP-HU-M2-01 — Crear un menú ejecutivo
* **ID:** CP-HU-M2-01
* **Historia de Usuario:** *"Como encargado, quiero crear un menú ejecutivo para ofrecer un conjunto de platos a precio fijo."*
* **Responsable:** Joaquín

### Datos de Entrada
* **Nombre:** Obligatorio, texto de 1 a 100 caracteres, único.
* **Precio:** Obligatorio, decimal mayor a 0, hasta 2 decimales.
* **Platos:** Obligatorio, lista de relaciones (Platos existentes), mínimo 1 plato.
* **Estado:** Enumerado `{HABILITADO, DESHABILITADO}`, defecto `HABILITADO`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Nombre** | Texto 1 a 100 caracteres, único. | Texto 1-100 caracteres no registrado | Vacío · $> 100$ caracteres · Ya registrado | `"Menú del Día"` *(Válido)* · `(vacío)` *(Inválido)* · `"Menú del Día"` *(Ya existe)* |
| **Precio** | Decimal > 0. | Decimal positivo | Vacío · $\le 0$ · No numérico | `6500.00` *(Válido)* · `0` *(Inválido)* · `-500` *(Inválido)* |
| **Platos** | Selección $\ge 1$ plato existente. | Lista con platos válidos | Lista vacía · Platos inexistentes | `[Plato #1, Plato #5]` *(Válido)* · `[]` *(Inválido)* |
| **Estado** | Enumerado, defecto HABILITADO. | `HABILITADO` | Vacío · Valor no permitido | `HABILITADO` *(Válido)* · `"BORRADO"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** El menú ejecutivo se guarda correctamente con sus platos asociados.
* **Con datos inválidos:** El sistema bloquea el alta y marca el campo erróneo (ej: *"Debe seleccionar al menos un plato"*).

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 3: CP-HU-M3-05 — Alta Mesa
* **ID:** CP-HU-M3-05
* **Historia de Usuario:** *"Como encargado, quiero crear una mesa para organizar el salón."*
* **Responsable:** Giuliano

### Datos de Entrada
* **Número:** Entero positivo (1 a 99), obligatorio, único.
* **Capacidad:** Entero positivo (1 a 20), obligatorio.
* **Estado:** Enumerado `{LIBRE, OCUPADA, RESERVADA, INHABILITADA}`, defecto `LIBRE`.
* **Sector:** Relación obligatoria a un Sector activo.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Número** | Entero 1 a 99, único. | Entero de 1 a 99 no registrado | $\le 0$ · $> 99$ · No numérico · Vacío · Ya asignado | `12` *(Válido)* · `0` *(Inválido)* · `105` *(Inválido)* · `3` *(Ya asignado)* |
| **Capacidad** | Entero 1 a 20. | Entero 1 a 20 | $\le 0$ · $> 20$ · Decimal · Vacío | `4` *(Válido)* · `-2` *(Inválido)* · `25` *(Inválido)* · `4.5` *(Inválido)* |
| **Estado** | Enumerado, defecto LIBRE. | `LIBRE` | Vacío · Fuera del enumerado | `LIBRE` *(Válido)* · `"INEXISTENTE"` *(Inválido)* |
| **Sector** | Obligatorio, Sector activo. | Sector existente y habilitado | Vacío · Sector inexistente / inhabilitado | `"Salón Principal"` *(Válido)* · `"Patio 2"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** La mesa fue dada de alta en el sistema asociada al sector correspondiente y con estado inicial `LIBRE`.
* **Con datos inválidos:** La mesa no se registra y se despliega un mensaje indicando el dato que falla.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 4: CP-HU-M4-01 — Alta Cliente
* **ID:** CP-HU-M4-01
* **Historia de Usuario:** *"Como mozo, quiero crear un cliente para asociarlo a comandas y reservas."*
* **Responsable:** Juan

### Datos de Entrada
* **Nombre:** Texto, 1 a 100 caracteres, obligatorio.
* **Teléfono:** Texto/Numérico, 7 a 20 caracteres, opcional.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Nombre** | Obligatorio, 1-100 caracteres. | 1 a 100 caracteres | Vacío · $> 100$ caracteres | `"Juan Pérez"` *(Válido)* · `(vacío)` *(Inválido)* · `[Texto 101 char]` *(Inválido)* |
| **Teléfono** | Opcional, 7-20 caracteres. | Vacío · 7 a 20 caracteres válidos | $< 7$ caracteres · $> 20$ caracteres | `"2804123456"` *(Válido)* · `(vacío)` *(Válido)* · `"123"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** El cliente fue dado de alta en el sistema exitosamente.
* **Con datos inválidos:** El cliente no se guarda en el sistema y se muestra el mensaje de error.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 5: CP-HU-M5-01 — Alta Reserva
* **ID:** CP-HU-M5-01
* **Historia de Usuario:** *"Como encargado, quiero crear una reserva para asegurar una mesa al cliente."*
* **Responsable:** Federico

### Datos de Entrada
* **Mesa:** Relación obligatoria (mesa registrada y disponible).
* **Fecha:** Formato `DD/MM/AAAA`, $\ge$ fecha actual, obligatoria.
* **Hora:** Formato `HH:MM`, en horario de atención, obligatoria.
* **CantidadPersonas:** Entero positivo, obligatorio.
* **Estado:** Enumerado, defecto `PENDIENTE`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Mesa** | Relación obligatoria. | Mesa habilitada | Vacío · Mesa inexistente | `Mesa 4` *(Válido)* · `Mesa 99` *(Inválido)* |
| **Fecha** | Obligatoria, $\ge$ hoy. | Fecha futura válida | Vacío · Fecha pasada · Formato inválido | `25/11/2026` *(Válido)* · `01/01/2020` *(Inválido)* |
| **Hora** | Obligatoria, en horario comercial. | Hora válida en rango | Vacío · Fuera de rango | `21:30` *(Válido)* · `04:15` *(Inválido)* |
| **CantidadPersonas**| Entero positivo $\le$ capacidad. | Entero válido | $\le 0$ · Supera límite · Decimal | `4` *(Válido)* · `0` *(Inválido)* · `50` *(Inválido)* |
| **Estado** | Defecto PENDIENTE. | `PENDIENTE` | Vacío · Valor no enumerado | `PENDIENTE` *(Válido)* · `"ACTIVA"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** La reserva queda dada de alta en estado `PENDIENTE`.
* **Con datos inválidos:** La reserva no se crea y se emite mensaje de error.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 6: CP-HU-M6-04 — Alta medio de pago
* **ID:** CP-HU-M6-04
* **Historia de Usuario:** *"Como encargado, quiero crear un medio de pago para aceptarlo en el cobro."*
* **Responsable:** Héctor

### Datos de Entrada
* **Nombre:** Texto, 1 a 100 caracteres, obligatorio.
* **Tipo:** Enumerado `{EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA, MERCADO_PAGO}`.
* **Descripción:** Texto libre, hasta 255 caracteres, opcional.
* **Estado:** Enumerado, defecto `ACTIVO`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Nombre** | 1 a 100 caracteres, obligatorio. | 1 a 100 caracteres | Vacío · $> 100$ caracteres | `"Visa Débito"` *(Válido)* · `(vacío)` *(Inválido)* |
| **Tipo** | Enumerado obligatorio. | Valor válido del enumerado | Vacío · Fuera de enumerado | `TARJETA_DEBITO` *(Válido)* · `"CRIPTOMONEDA"` *(Inválido)* |
| **Descripción** | Opcional, hasta 255 char. | Vacío · Texto válido | $> 255$ caracteres | `"Terminal Posnet"` *(Válido)* · `[Texto 256 char]` *(Inválido)* |
| **Estado** | Defecto ACTIVO. | `ACTIVO` | Vacío · Fuera de enumerado | `ACTIVO` *(Válido)* · `"HABILITADO"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** El medio de pago es dado de alta en estado `ACTIVO`.
* **Con datos inválidos:** El medio de pago no se crea, el sistema informa regla no cumplida.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 7: CP-HU-M4-04 — Alta comanda
* **ID:** CP-HU-M4-04
* **Historia de Usuario:** *"Como mozo, quiero crear una comanda para registrar el pedido de una mesa."*
* **Responsable:** Juan

### Datos de Entrada
* **Mesa:** Relación obligatoria, debe estar libre.
* **FechaHora:** Automática actual.
* **Turno:** Enumerado, turno operativo activo, obligatorio.
* **Observaciones:** Texto hasta 255 caracteres, opcional.
* **Estado:** Defecto `ABIERTA`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Mesa** | Obligatoria, estado LIBRE. | Mesa existente libre | Vacío · Inexistente · Ya ocupada | `Mesa 5` *(Válido)* · `Mesa 2` *(Ya ocupada - Inválido)* |
| **FechaHora** | Asignada por el sistema. | Fecha y hora actual válida | Formato inválido | `21/10/2026 22:15` *(Válido)* · `"31-13-2026"` *(Inválido)* |
| **Turno** | Coincidente con turno activo. | Turno activo | Vacío · Turno cerrado | `NOCHE` *(Válido)* · `"MADRUGADA"` *(Inválido)* |
| **Observaciones** | Opcional, $\le 255$ caracteres. | Texto $\le 255$ chars | $> 255$ caracteres | `"Sin sal"` *(Válido)* · `[Texto 256 char]` *(Inválido)* |
| **Estado** | Defecto ABIERTA. | `ABIERTA` | Vacío · Crear como CERRADA | `ABIERTA` *(Válido)* · `"CERRADA"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** Comanda registrada en estado `ABIERTA`, la mesa pasa a estado ocupada.
* **Con datos inválidos:** La comanda no se crea.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 8: CP-HU-M4-09 — Cerrar una comanda
* **ID:** CP-HU-M4-09
* **Historia de Usuario:** *"Como mozo, quiero cerrar una comanda para pasarla a facturación."*
* **Responsable:** Juan

### Datos de Entrada
* **Comanda:** Relación obligatoria (estado `ABIERTA`).
* **Estado:** Se actualiza a `CERRADA`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Comanda** | Debe existir y estar ABIERTA. | Comanda en estado ABIERTA | Vacío · Inexistente · Ya CERRADA o CANCELADA | `Comanda #104` *(Válido)* · `Comanda #101` *(Ya cerrada - Inválido)* |
| **Estado** | Se actualiza a CERRADA. | `CERRADA` | Vacío · Estado no permitido | `CERRADA` *(Válido)* · `"CANCELADA"` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** La comanda cambia a `CERRADA` y queda lista para facturar.
* **Con datos inválidos:** La comanda no cambia de estado.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 9: CP-HU-M5-06 — Crear una comanda a partir de una reserva
* **ID:** CP-HU-M5-06
* **Historia de Usuario:** *"Como mozo, quiero crear una comanda a partir de una reserva para atender al cliente."*
* **Responsable:** Federico

### Datos de Entrada
* **Reserva:** Relación obligatoria (estado `CONFIRMADA` o `PENDIENTE`).
* **FechaHora:** Automática.
* **Turno:** Obligatorio (turno activo).
* **Observaciones:** Opcional.
* **Estado:** Defecto `ABIERTA`.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Reserva** | Obligatoria, CONFIRMADA/PENDIENTE. | Reserva válida | Vacío · Inexistente · CANCELADA | `Reserva #45` *(Válido)* · `Reserva #12` *(Cancelada - Inválido)* |
| **FechaHora** | Asignada por el sistema. | Fecha y hora válida | Vacío · Formato inválido | `22/10/2026 13:00` *(Válido)* |
| **Turno** | Coincidente con turno activo. | Turno activo | Vacío · Turno inactivo | `TARDE` *(Válido)* |
| **Observaciones** | Opcional, $\le 255$ char. | Texto $\le 255$ chars | $> 255$ caracteres | `"Cliente vip"` *(Válido)* · `[Texto 256 char]` *(Inválido)* |
| **Estado** | Defecto ABIERTA. | `ABIERTA` | Crear como CERRADA | `ABIERTA` *(Válido)* |

### Salida Esperada
* **Con datos válidos:** Comanda creada en `ABIERTA` vinculada a la reserva; la reserva pasa a `EN ATENCIÓN`.
* **Con datos inválidos:** La comanda no se crea.

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 10: CP-HU-M6-01 — Generar la factura de una comanda
* **ID:** CP-HU-M6-01
* **Historia de Usuario:** *"Como cajero, quiero generar la factura a partir de una comanda cerrada para cobrarle al cliente."*
* **Responsable:** Héctor

### Datos de Entrada
* **Comanda:** Relación obligatoria. Debe existir, estar en estado `CERRADA` y sin facturar.
* **Tipo Comprobante:** Enumerado `{FACTURA_A, FACTURA_B, FACTURA_C, TICKET}`, obligatorio.
* **Cliente:** Relación opcional (requerida para Factura A).

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Comanda** | Obligatoria, estado CERRADA. | Comanda válida sin facturar | Vacío · Estado ABIERTA · Ya facturada | `Comanda #200` *(Cerrada - Válida)* · `Comanda #205` *(Abierta - Inválida)* · `Comanda #190` *(Ya facturada - Inválida)* |
| **Tipo Comp.** | Enumerado obligatorio. | Valor válido del enumerado | Vacío · Fuera del enumerado | `FACTURA_B` *(Válido)* · `"RECIBO_X"` *(Inválido)* |
| **Cliente** | Opcional (salvo A). | Cliente registrado · Vacío (Consumidor Final) | Cliente inexistente | `Cliente #15` *(Válido)* · `(vacío)` *(Válido para B/C)* · `Cliente #999` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** Se genera el documento fiscal por el total de la comanda y su estado pasa a `EMITIDA` / `PENDIENTE_PAGO`.
* **Con datos inválidos:** No se emite la factura y el sistema muestra un error (ej: *"La comanda aún está abierta"*).

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_

---

## Caso 11: CP-HU-M6-02 — Cobrar una factura adeudada
* **ID:** CP-HU-M6-02
* **Historia de Usuario:** *"Como cajero, quiero registrar el cobro de una factura pendiente para asentar el ingreso."*
* **Responsable:** Héctor

### Datos de Entrada
* **Factura:** Relación obligatoria. Debe existir y estar `PENDIENTE_PAGO`.
* **Medio de Pago:** Relación obligatoria a un medio de pago configurado y `ACTIVO`.
* **Monto:** Decimal $> 0$, obligatorio, mayor o igual al total de la factura.

### Tabla de Clases de Equivalencia

| Campo | Regla de la HU | Clase Válida | Clases Inválidas | Datos de Prueba |
| :--- | :--- | :--- | :--- | :--- |
| **Factura** | Obligatoria, estado PENDIENTE. | Factura existente pendiente | Vacío · Ya PAGADA · Inexistente | `Factura #501` *(Pendiente - Válida)* · `Factura #490` *(Pagada - Inválida)* |
| **Medio de Pago**| Obligatorio, estado ACTIVO. | Medio de pago activo | Vacío · Medio inactivo o inexistente | `Efectivo` *(Activo - Válido)* · `Cheque` *(Inactivo - Inválido)* |
| **Monto** | Numérico $\ge$ total de la factura. | Monto $\ge$ Total | Vacío · Monto $<$ Total · Negativo | `15000.00` *(Válido si Total es 15000)* · `10000.00` *(Inválido por menor)* · `-500` *(Inválido)* |

### Salida Esperada
* **Con datos válidos:** El cobro se registra con éxito, y la factura cambia su estado a `PAGADA`. (Si el monto es mayor en efectivo, se calcula el vuelto).
* **Con datos inválidos:** El pago es rechazado y el sistema advierte el error (ej: *"El monto es inferior al total adeudado"*).

### Prueba Realizada
* **Fecha:** _[Pendiente]_
* **Resultado:** _[Pendiente]_
