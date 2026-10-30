# Delta para menus-ejecutivos (HU-M2-01)

## Datos

| Campo | Tipo | Regla propuesta |
|---|---|---|
| `id` | entero | Asignado por la base; no se recibe. |
| `nombre` | texto | Obligatorio; propuesta de 1–100 caracteres. Único entre menús ejecutivos luego de `strip().casefold()`. |
| `precio_fijo` | decimal | Obligatorio, mayor que cero; propuesta `Numeric(10,2)`. |
| `producto_ids` | lista de enteros | Obligatoria, con al menos un ID existente; cada producto debe estar `HABILITADO` y no tener categoría `MENU_DEL_DIA`. |
| `descripcion` | texto o nulo | Opcional; propuesta de hasta 500 caracteres. |
| `seccion_id` | entero | Obligatorio; debe referir a una sección existente `HABILITADO`. |
| `estado` | `HABILITADO` | Asignado por el sistema al crear; no se recibe. |

## Contrato de la API

| Método y ruta | Entrada | Respuesta | Errores |
|---|---|---|---|
| `POST /api/v1/menus-ejecutivos` | JSON `MenuEjecutivoCrear {nombre, precio_fijo, producto_ids, seccion_id, descripcion?}`; campos extra prohibidos | 201 `MenuEjecutivoSalida` | 404 producto/sección inexistente; 409 nombre repetido, producto deshabilitado, producto `MENU_DEL_DIA` o sección deshabilitada; 422 datos inválidos |
| `GET /api/v1/menus-ejecutivos?estado=&limit=&offset=` | filtros paginados | 200 `Pagina[MenuEjecutivoListado]` | 422 filtro inválido |

`MenuEjecutivoSalida`: `id`, `nombre`, `descripcion`, `precio_fijo` serializado con dos decimales, `estado`, resumen de `seccion` y productos asociados como resúmenes.

Los errores de API usan `{"detalle": "mensaje"}`. El router solo delega; el service valida reglas de negocio y el repository realiza consultas parametrizadas.

## Supuestos para revisar

1. La frase «único en todo el sistema» se interpreta junto con el criterio «otro Menú Ejecutivo»: unicidad global dentro de `menus_ejecutivos`, sin colisionar con nombres de productos.
2. Para longitud y precisión se reutilizan los límites de Producto: nombre de hasta 100, descripción de hasta 500 y precio con dos decimales. No son límites expresos de la HU.
3. La normalización propuesta usa `strip().casefold()`. Distingue tildes; el plan local afirma que no debería distinguirlas, pero el helper existente no las elimina. Confirmar si deben normalizarse diacríticos antes de implementar.
4. Se propone rechazar IDs repetidos en `producto_ids` con 422 para evitar duplicar una asociación. La HU no define este caso.
5. «Dentro de la sección elegida» se cumple persistiendo `seccion_id` y mostrándolo en el gestor M2. Esta HU no cambia la respuesta pública `/carta` de M1; confirmar si la publicación inmediata en esa vista forma parte del resultado esperado.
6. El listado se incluye como capacidad de soporte del alta, conforme al plan del módulo; no se agregan edición ni baja.

## ADDED Requirements

### Requisito: Crear un menú ejecutivo

El sistema DEBE aceptar nombre, precio fijo positivo, uno o más productos existentes y una sección habilitada. DEBE asignar estado `HABILITADO`, persistir la composición mediante una relación con productos y dejar el menú asociado a la sección elegida. NO DEBE guardar el registro cuando falte un obligatorio o falle una validación.

#### Escenario: Alta válida (CA 1)

- DADO que cargo un Menú Ejecutivo con todos los datos obligatorios válidos
- CUANDO lo guardo
- ENTONCES queda registrado con estado Habilitado dentro de la sección elegida
- Y la respuesta es 201 e incluye la composición y la sección

#### Escenario: Falta un dato obligatorio (CA 2)

- DADO que falta el nombre, el precio fijo, los productos incluidos o la sección
- CUANDO intento guardarlo
- ENTONCES no se guarda y se indica qué dato falta
- Y la respuesta es 422 con formato `{"detalle": "mensaje"}`

#### Escenario: Nombre repetido (CA 3)

- DADO un nombre que ya pertenece a otro Menú Ejecutivo
- CUANDO intento guardarlo
- ENTONCES el sistema advierte que el nombre debe ser único
- Y la respuesta es 409

#### Escenario: Precio no positivo (CA 4)

- DADO un precio fijo que no es mayor a cero
- CUANDO intento guardarlo
- ENTONCES el sistema advierte que el precio es inválido
- Y la respuesta es 422

#### Escenario: Sin productos (CA 5)

- DADO que intento crear el Menú Ejecutivo sin seleccionar ningún producto
- CUANDO guardo
- ENTONCES el sistema me exige incluir al menos un producto
- Y la respuesta es 422

#### Escenario: Producto deshabilitado (CA 6)

- DADO que selecciono un producto que actualmente está en estado "Deshabilitado"
- CUANDO intento agregarlo al Menú Ejecutivo
- ENTONCES el sistema me advierte que solo puedo incluir productos habilitados
- Y la respuesta es 409

#### Escenario: Producto de categoría MENU_DEL_DIA (CA 7)

- DADO que intento agregar un producto cuya categoría es MENU_DEL_DIA
- CUANDO lo selecciono o intento guardar
- ENTONCES el sistema no lo permite y me advierte que no se pueden incluir menús del día dentro de un menú ejecutivo
- Y la respuesta del servidor es 409, aunque el selector ya lo excluya

#### Escenario: Sección inexistente o deshabilitada

- DADO que la sección indicada no existe o está deshabilitada
- CUANDO intento guardar
- ENTONCES no se guarda el menú y se informa el error correspondiente
- Y la respuesta es 404 si no existe o 409 si está deshabilitada

### Requisito: Consultar menús ejecutivos

El sistema DEBE ofrecer un listado paginado filtrable por estado para que el gestor muestre los registros creados. El listado NO DEBE permitir modificar ni dar de baja en el alcance de HU-M2-01.

#### Escenario: Listado paginado

- DADO que existen menús ejecutivos
- CUANDO consulto `GET /api/v1/menus-ejecutivos` con parámetros de paginación y filtro válidos
- ENTONCES recibo una página de resúmenes con su sección, productos, precio fijo y estado
