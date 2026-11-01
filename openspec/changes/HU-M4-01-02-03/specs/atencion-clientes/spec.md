# Especificación: clientes de Atención al Público (HU-M4-01-02-03)

## Propósito y fuentes

Capacidad nueva `atencion-clientes`. Esta especificación agrupa únicamente [HU-M4-01 (#48)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/48), [HU-M4-02 (#49)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/49) y [HU-M4-03 (#50)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/50). La creación de la primera reserva pertenece a [HU-M5-01 (#61)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/61). Los identificadores CA de abajo corresponden al orden de los criterios de cada issue.

## Datos y contrato HTTP de M4

| Dato | Contrato |
| --- | --- |
| `id` | Identificador de `Cliente` asignado por el sistema. |
| `nombre` | Texto obligatorio; solo letras. NO DEBE ser único. No se fija longitud, normalización ni interpretación de espacios y acentos en este cambio. |
| `telefono` | `str` obligatorio, no vacío y NO único. `Supuesto:` formato técnico provisional confirmado: dígitos, espacios, guiones y `+` únicamente al comienzo; sin longitud ni otras restricciones añadidas. |

| Ruta | Entrada | Respuesta | Errores |
| --- | --- | --- | --- |
| `PUT /api/v1/clientes/{id}` | `ClienteModificar {nombre: str, telefono: str}`; ambos obligatorios | 200 `ClienteSalida {id: int, nombre: str, telefono: str}` | 404 cliente inexistente; 422 datos ausentes, vacíos, nombre inválido o teléfono fuera del formato provisional. |
| `GET /api/v1/clientes` | `q?: str`, `limit?: int` (50 por defecto, máximo 100), `offset?: int` (0 por defecto). Si hay `q`, buscar coincidencia total o parcial en nombre o coincidencia con el teléfono informado; no inferir una clave única del teléfono. | 200 `Pagina[ClienteSalida] {items, total, limit, offset}`; sin coincidencias, `items: []` y `total: 0` | 422 paginación inválida. |

Los errores DEBEN tener la forma `{"detalle": "mensaje"}` y señalar el dato inválido cuando corresponda (D-25, D-26). Una página sin filas NO DEBE tratarse como error HTTP: la interfaz DEBE distinguir, a partir de `q` y la respuesta, entre lista sin clientes y búsqueda sin coincidencias. Un `offset` posterior a la última página no implica que no existan clientes: `total` permite distinguir ese caso. El contrato no define una ruta `POST /api/v1/clientes` de alta aislada ni una ruta de baja.

**Límite M5:** la entrada HTTP de creación de `Reserva` y su respuesta se definirán con el responsable de M5 en HU-M5-01. Esa operación DEBE aceptar la selección de un `Cliente` existente o los datos de uno nuevo; el alta del cliente nuevo y la asociación a la primera reserva DEBEN confirmarse o revertirse juntas. Este documento NO establece unilateralmente la ruta ni el esquema de M5.

## Requisitos

### Requisito: Alta de cliente vinculada a la primera reserva (#48)

El sistema DEBE registrar un cliente nuevo solo al guardar su primera reserva; DEBE asociarlo a esa reserva y NO DEBE dejarlo persistido si la reserva falla. `nombre` y `telefono` DEBEN estar presentes y no vacíos. El nombre DEBE contener solo letras según #48; la interpretación concreta de nombres compuestos o acentuados queda pendiente de acuerdo, sin añadir aquí restricciones. Nombres repetidos DEBEN estar permitidos.

#### Escenario: Cliente nuevo y primera reserva guardados (#48 CA1)

- Dado que se cargan nombre y teléfono de un cliente nuevo al crear su primera reserva
- Cuando se guarda exitosamente la reserva
- Entonces quedan registrados tanto el cliente como la reserva, asociados entre sí
- Y el cliente no queda registrado por separado antes de ese guardado.

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

### Requisito: Modificar cliente existente sin cambios parciales (#49)

La modificación DEBE comprobar ambos datos obligatorios y el nombre antes de actualizar el cliente. Una entrada inválida NO DEBE alterar ninguno de sus valores persistidos. La identidad `id` NO DEBE cambiar. NO DEBE imponerse unicidad de nombre ni de teléfono.

#### Escenario: Corrección de datos válida (#49 CA1)

- Dado que existe un cliente con nombre y teléfono registrados
- Cuando se guardan nuevos valores válidos de `nombre` y `telefono`
- Entonces la respuesta y la consulta posterior muestran los nuevos datos del mismo cliente.

#### Escenario: Nombre inválido en la modificación (#49 CA2)

- Dado que existe un cliente
- Cuando se intenta guardar un nombre con números o caracteres especiales
- Entonces se informa que el nombre no es válido y no se modifica ningún dato del cliente.

#### Escenario: Teléfono con formato inválido (#49 CA3; formato provisional)

- Dado que existe un cliente y rige el formato técnico provisional confirmado
- Cuando se intenta modificarlo con un teléfono que incumple esa definición
- Entonces se informa que el teléfono es incorrecto y no se modifica ningún dato del cliente.

El formato provisional habilita una prueba de rechazo de letras o de `+` fuera del inicio, sin imponer longitud ni otros requisitos no acordados.

#### Escenario: Dato obligatorio vacío en la modificación (#49 CA4)

- Dado que existe un cliente con datos almacenados
- Cuando se envía `nombre` o `telefono` vacío u omitido para modificarlo
- Entonces se indica qué dato es obligatorio y no se aplica ningún cambio al cliente.

#### Escenario: Cliente inexistente (#49, límite)

- Dado que el identificador no corresponde a ningún cliente
- Cuando se intenta modificarlo con datos válidos
- Entonces se responde 404 con `detalle` y no se crea otro cliente.

### Requisito: Listar y buscar clientes (#50)

El listado DEBE ofrecer los datos de contacto de cada cliente y DEBE paginarse. La búsqueda por nombre DEBE admitir coincidencias completas o parciales; la búsqueda por un teléfono informado DEBE incluir a todo cliente asociado a ese teléfono, sin asumir unicidad. La interfaz DEBE avisar cuando no existen clientes o cuando una búsqueda no encuentra coincidencias.

#### Escenario: Consulta de clientes registrados (#50 CA1)

- Dado que hay clientes registrados
- Cuando se solicita la lista sin filtro
- Entonces se muestran los clientes de la página con `id`, `nombre` y `telefono`, junto con el total y los parámetros de paginación.

#### Escenario: Búsqueda por nombre completo o parcial (#50 CA2)

- Dado que existen clientes con un nombre coincidente con el criterio completo o parte de él
- Cuando se busca usando ese nombre como `q`
- Entonces el listado incluye a los clientes cuyos nombres coinciden total o parcialmente.

#### Escenario: Búsqueda por teléfono informado (#50 CA3)

- Dado que un teléfono está registrado para uno o más clientes
- Cuando se busca ese teléfono como `q`
- Entonces se muestran todos los clientes asociados a ese teléfono.

#### Escenario: Filtro sin coincidencias (#50 CA4)

- Dado que existen clientes pero ninguno coincide con el criterio
- Cuando se aplica el filtro
- Entonces se responde 200 con `items: []` y `total: 0`
- Y la interfaz informa que no se encontraron resultados.

#### Escenario: Registro sin clientes (#50 CA5)

- Dado que no hay clientes registrados
- Cuando se solicita el listado sin filtro
- Entonces se responde 200 con `items: []` y `total: 0`
- Y la interfaz informa que la lista está vacía.

## Diferencias documentales y decisiones pendientes

- `SPRINT-0/G3 - Diagramas por modulo.drawio` atribuye unicidad al nombre y tipa el teléfono como entero; `SPRINT-0/G3 - Diagrama de clases unificado.drawio` declara el teléfono opcional. Se deben actualizar ambos diagramas en una tarea documental posterior; prevalecen #48-#50 y las decisiones confirmadas.
- `SPRINT-1/S1-07-casos-de-prueba.md` describe el teléfono opcional y de 7 a 20 caracteres; esa guía no define la regla vigente de #49 CA3 y queda pendiente de reconciliación documental.
- **Formato provisional confirmado:** `Supuesto:` admitir dígitos, espacios, guiones y `+` solo al principio para #49 CA3; no imponer restricciones adicionales. La definición funcional definitiva queda para el equipo.
- **Coordinación pendiente con M5 (#61):** definir el contrato de entrada/salida del alta de reserva y la responsabilidad transaccional de la creación conjunta antes de implementar #48 CA1-CA3. M5 mantiene la propiedad de `Reserva` y sus reglas; M4 no modifica sus archivos unilateralmente.
- **Precisión pendiente si bloquea una implementación concreta:** cómo interpretar «solo letras» en nombres con espacios o acentos; no imponer una regla no expresada en #48.
