# Delta para control-de-acceso (HU-TR-01)

Cubre CA-2 de la HU: cada rol accede solo a lo que le corresponde y un acceso prohibido responde 403. La API decide siempre; la interfaz solo oculta (no es una protección).

## Roles

`ENCARGADO` (también es el gerente), `MOZO` y `CHEF`. No existe el rol cajero. Un usuario con varios roles recibe la unión de los permisos de sus roles. Un usuario tiene al menos un rol.

## Matriz en la API

Leyenda: **E** encargado, **M** mozo, **C** chef. «Sí» = permitido; «403» = prohibido para ese rol. El encargado puede todo. Un usuario sin sesión recibe 401 en cualquier fila (ver `autenticacion-sesion`). Un rol con permiso pasa a la lógica del endpoint (puede responder 404, 409 o 422 por sus propias reglas).

### M1 Productos y Carta

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /platos/{id}`, `/postres/{id}`, `/bebidas/{id}`, `GET /secciones`, `/secciones/{id}`, `/productos`, `/carta` | Sí | Sí | Sí |
| `POST /platos`, `/postres`, `/bebidas`, `/secciones`; `PUT` de `/platos/{id}`, `/postres/{id}`, `/bebidas/{id}`, `/secciones/{id}`; `POST …/{id}/baja` de los cuatro | Sí | 403 | 403 |
| `GET /reportes/productos-mas-vendidos` y `/pdf` | Sí | 403 | 403 |

### M2 Menús y Promociones

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /menus-del-dia`, `/menus-del-dia/{id}`, `/menus-ejecutivos`, `/menus-ejecutivos/{id}`, `/promociones` | Sí | Sí | Sí |
| `POST /menus-del-dia`, `/menus-ejecutivos`, `/promociones`; `PUT` de los tres; `POST …/baja` de menús; `POST /promociones/{id}/finalizar` | Sí | 403 | 403 |
| `GET /reportes/impacto-promociones` | Sí | 403 | 403 |

### M3 Salón, Mozos y Chefs

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /mesas`, `GET /sectores` | Sí | Sí | 403 |
| `POST /sectores`, `PUT /sectores/{id}`, `POST /sectores/{id}/baja`, `POST /mesas`, `PUT /mesas/{id}`, `DELETE /mesas/{id}` | Sí | 403 | 403 |
| `GET /mozos` (solo exige una sesión válida: cualquier rol ve los nombres de los mozos en comandas y reservas) | Sí | Sí | Sí |
| `POST /mozos`, `PUT /mozos/{id}`, `POST /mozos/{id}/baja`; `POST /chefs`, `GET /chefs`, `PUT /chefs/{id}`, `POST /chefs/{id}/baja` | Sí | 403 | 403 |
| `GET /reportes/mesas-ventas-por-mozo` | Sí | 403 | 403 |

### M4 Atención al Público

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /comandas`, `GET /comandas/{id}`, `GET /comandas/{id}/detalles`, `GET /comandas/{id}/pendientes` | Sí | Sí | Sí |
| `POST /comandas`, `PUT /comandas/{id}`, `PUT /comandas/{id}/detalles/{detalle_id}/entrega`, `POST /comandas/{id}/cerrar`, `/reabrir`, `/anular` | Sí | Sí | 403 |
| `GET /clientes`, `PUT /clientes/{id}` | Sí | Sí | 403 |

El mozo opera sobre **cualquier** comanda, no solo las propias: esta HU no cambia `Comanda.mozo_id` ni el `service` de M4.

### M5 Reservas

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /reservas`, `GET /reservas/{id}`, `GET /reservas/mesas-disponibles` | Sí | Sí | Sí |
| `POST /reservas`, `PUT /reservas/{id}`, `POST /reservas/{id}/cancelar-anticipada`, `/cancelar-por-ausencia`, `POST /reservas/{id}/comanda` | Sí | Sí | 403 |
| `GET /reportes/reservas-ausentismo` y `/pdf` | Sí | 403 | 403 |

### M6 Pagos

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /medios-de-pago`, `GET /facturas`, `/facturas/previsualizar`, `/facturas/{id}`, `/comprobantes/{numero}`, `/comprobantes/{numero}/pdf` | Sí | Sí | 403 |
| `POST /facturas`, `POST /facturas/{id}/cobros` | Sí | Sí | 403 |
| `POST /medios-de-pago`, `PUT /medios-de-pago/{id}`, `DELETE /medios-de-pago/{id}` | Sí | 403 | 403 |
| `GET /reportes/caja-del-dia`, `/reportes/recaudacion-por-medio-de-pago` y `/pdf` | Sí | 403 | 403 |

El mozo factura y cobra **cualquier** comanda. Supuesto (S7): el mozo lista medios de pago y consulta facturas y comprobantes, incluido el PDF; la gestión de medios de pago y la caja del día son del encargado.

### Regla general para lo no listado

Todo endpoint nuevo o no mencionado en las tablas es solo del encargado. Todo endpoint con prefijo `/reportes/` es solo del encargado.

## Formato de error

401 y 403 usan `{"detalle": "mensaje"}` (D-26). El 403 responde `{"detalle": "No tiene permiso para realizar esta acción"}` (Supuesto: texto exacto) y NO revela qué permiso faltó. La autorización DEBE evaluarse después de la autenticación y antes de validar el cuerpo: una petición prohibida con cuerpo inválido responde 403, no 422.

## ADDED Requirements

### Requisito: Matriz única de permisos

El backend DEBE definir la matriz de permisos en un único lugar (`shared/seguridad.py` o un módulo de `shared/` que este importe) y los `router` DEBEN aplicarla con una dependencia verificadora por endpoint. El frontend DEBE definir su propia matriz en un único lugar (`shared/auth/`) con la misma asignación de roles. Los `service` NO DEBEN importar FastAPI ni conocer los roles. Una prueba DEBE recorrer todas las rutas registradas en la aplicación y fallar si alguna, salvo `POST /sesion`, `/salud` y `/media`, no exige sesión.

#### Escenario: Ninguna ruta queda sin protección (CA-1)

- DADA la aplicación con todos sus routers registrados
- CUANDO la prueba recorre `app.routes` y llama a cada ruta sin sesión
- ENTONCES toda ruta de `/api/v1`, salvo `POST /sesion`, responde 401

#### Escenario: Unión de roles

- DADO un usuario con roles `MOZO` y `CHEF`
- CUANDO consulta `GET /mesas` (permitido solo a `MOZO`) y `GET /carta` (permitido a ambos)
- ENTONCES ambas respuestas son 200
- Y `POST /platos` responde 403

### Requisito: Respuesta 403 sin permiso

El sistema DEBE responder 403 cuando el usuario tiene una sesión válida pero ninguno de sus roles tiene permiso sobre el endpoint, sin ejecutar la lógica de negocio ni modificar datos.

#### Escenario: Cada celda prohibida de la matriz responde 403 (CA-2)

- DADO un usuario con sesión vigente de un solo rol
- CUANDO llama a un endpoint marcado «403» para su rol en las tablas
- ENTONCES el sistema responde 403 con `{"detalle": "No tiene permiso para realizar esta acción"}` y no modifica datos

La prueba DEBE ser parametrizada por fila de las tablas y por rol (E, M, C), de modo que cada celda tenga una verificación.

#### Escenario: Cada celda permitida de la matriz pasa (CA-2)

- DADO un usuario con sesión vigente de un solo rol
- CUANDO llama a un endpoint marcado «Sí» para su rol, con datos válidos
- ENTONCES el sistema NO responde 401 ni 403 (responde el código propio del endpoint)

#### Escenario: Mozo no gestiona el catálogo (CA-2)

- DADO un mozo con sesión
- CUANDO envía `POST /platos` con datos válidos
- ENTONCES el sistema responde 403 y no se crea el plato

#### Escenario: Chef no entra a pagos ni salón (CA-2)

- DADO un chef con sesión
- CUANDO llama a `GET /facturas` y a `GET /mesas`
- ENTONCES ambas responden 403

#### Escenario: Chef ve comandas y su detalle pero no las modifica (CA-2)

- DADO un chef con sesión y una comanda existente
- CUANDO llama a `GET /comandas`, `GET /comandas/{id}` y `GET /comandas/{id}/detalles`
- ENTONCES las tres responden 200
- Y `POST /comandas/{id}/cerrar` y `PUT /comandas/{id}/detalles/{detalle_id}/entrega` responden 403

#### Escenario: Mozo opera cualquier comanda (CA-2)

- DADO una comanda creada con `mozo_id` de otro mozo
- CUANDO un mozo con sesión la cierra
- ENTONCES el sistema responde 200

#### Escenario: Mozo factura y cobra cualquier comanda (CA-2)

- DADO una comanda cerrada de otro mozo
- CUANDO un mozo con sesión llama a `POST /facturas` y luego a `POST /facturas/{id}/cobros`
- ENTONCES ambos pasan la autorización (responden 201 con datos válidos)

#### Escenario: Reportes solo para el encargado (CA-2)

- DADO un mozo y un chef con sesión
- CUANDO cada uno llama a cualquier ruta bajo `/reportes/` (incluidos los `/pdf`)
- ENTONCES responden 403
- Y el encargado recibe 200

#### Escenario: Prohibido antes que inválido (límite)

- DADO un mozo con sesión
- CUANDO envía `POST /sectores` con un cuerpo inválido
- ENTONCES el sistema responde 403 y no 422

#### Escenario: Pruebas existentes con encargado por defecto

- DADO la suite de pruebas existente de M1 a M6
- CUANDO se ejecuta con el encargado inyectado por defecto en `conftest` (`dependency_overrides`)
- ENTONCES pasan sin cambios de comportamiento

### Requisito: Visibilidad en la interfaz según el rol

El frontend DEBE exponer `puede(permiso)` desde un proveedor de sesión y DEBE ocultar, según la matriz, lo que el rol no puede usar: entradas del menú lateral y del encabezado, pestañas, botones de crear, editar, dar de baja, cerrar, reabrir, anular, facturar, cobrar y registrar entregas, y cualquier acción de fila. Las rutas protegidas DEBEN verificar el permiso: un usuario con sesión que abre por URL una pantalla que su rol no puede ver DEBE ser llevado al inicio (Supuesto: sin pantalla de «acceso denegado» propia). Si una llamada igual responde 403, DEBE mostrarse el mensaje del `detalle`. Ocultar NO sustituye al 403 de la API.

Visibilidad por rol (Supuesto: nombres de pantallas según el menú actual; el diseño las mapea a rutas):

| Elemento | Encargado | Mozo | Chef |
| --- | --- | --- | --- |
| Menú «Productos y Carta»: ver carta, productos y secciones | Sí | Sí | Sí |
| Productos y Carta: botones de alta, modificar, baja | Sí | No | No |
| Menú «Menús y Promociones»: listados y detalle | Sí | Sí | Sí |
| Menús y Promociones: alta, modificar, baja, finalizar | Sí | No | No |
| Menú «Salón, Mozos y Chefs»: pestañas Mesas y Sectores (solo lectura para el mozo) | Sí | Sí | No (menú oculto) |
| Pestañas «Mozos» y «Chefs» | Sí | No | No |
| Salón: botones de alta, modificar, baja o eliminar | Sí | No | No |
| Menú «Atención»: listado de comandas y detalle | Sí | Sí | Sí |
| Atención: crear, editar, entregas (−/+), cerrar, reabrir, anular; listado y edición de clientes | Sí | Sí | No |
| Menú «Reservas»: listado y detalle | Sí | Sí | Sí |
| Reservas: crear, modificar, cancelar, abrir comanda | Sí | Sí | No |
| Menú «Pagos»: cuenta, facturar, cobrar, facturas y comprobantes | Sí | Sí | No (menú oculto) |
| Pagos: gestión de medios de pago | Sí | No | No |
| Menú «Reportes» y botones de reporte o PDF en cualquier módulo | Sí | No | No |
| Inicio: tarjetas, accesos y datos solo de lo que el rol puede ver | Sí | Sí | Sí |

Supuesto: el panel de inicio muestra únicamente los accesos y datos que el rol puede ver; si un dato del panel proviene de un endpoint prohibido para el rol, no se solicita.

#### Escenario: El menú del encargado muestra todo (CA-2)

- DADO un encargado con sesión
- CUANDO se muestra el menú lateral
- ENTONCES aparecen todos los módulos, incluido «Reportes»

#### Escenario: El menú del mozo omite reportes y gestión (CA-2)

- DADO un mozo con sesión
- CUANDO se muestra el menú lateral y la pantalla de Salón
- ENTONCES NO aparece «Reportes», Salón muestra solo Mesas y Sectores sin botones de alta, edición ni baja, y NO aparecen las pestañas «Mozos» ni «Chefs»

#### Escenario: El menú del chef omite salón y pagos (CA-2)

- DADO un chef con sesión
- CUANDO se muestra el menú lateral
- ENTONCES aparecen Productos y Carta, Menús y Promociones, Atención y Reservas, y NO aparecen «Salón, Mozos y Chefs», «Pagos» ni «Reportes»

#### Escenario: El chef ve comandas sin botones de acción (CA-2)

- DADO un chef con sesión en el listado de comandas
- CUANDO abro una comanda
- ENTONCES veo el detalle y NO aparecen los botones de crear, editar, entregas, cerrar, reabrir ni anular

#### Escenario: Ruta prohibida abierta por URL (error, CA-2)

- DADO un chef con sesión
- CUANDO escribo `/pagos` en la barra de direcciones
- ENTONCES el sistema me lleva al inicio y no se llama a ningún endpoint de pagos

#### Escenario: 403 inesperado de la API (límite)

- DADO una pantalla visible cuya acción responde 403
- CUANDO ejecuto la acción
- ENTONCES se muestra «No tiene permiso para realizar esta acción» y no se pierde la sesión

#### Escenario: Un usuario con dos roles ve la unión (límite)

- DADO un usuario con roles `MOZO` y `CHEF`
- CUANDO se muestra el menú
- ENTONCES `puede` evalúa verdadero para cualquier permiso de alguno de sus roles
