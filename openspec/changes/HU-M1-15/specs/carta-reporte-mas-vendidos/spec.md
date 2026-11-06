# Especificación de carta-reporte-mas-vendidos

## Propósito

Reporte de solo lectura «productos más vendidos por período»: para un período elegido, cada sección de la carta con sus productos ordenados del más pedido al menos pedido, con la cantidad pedida, el día o los días de la semana con más pedidos y la franja horaria de una hora con más pedidos. Se obtiene en dos salidas: el JSON completo por sección y un PDF detallado descargable. La pantalla del módulo muestra los 5 productos más pedidos del período en un gráfico de barras y ofrece descargar el PDF. Una página compartida `/reportes` reúne el acceso a los reportes de todos los módulos. Entidades del diagrama de clases: `Seccion`, `Producto`, `Comanda`, `DetalleComanda`, `ReporteProductosMasVendidos`, `LineaReporteProductos`.

Origen: HU-M1-15 (issue #79). Capacidad nueva; no modifica `carta-productos`, `carta-secciones` ni `carta-vista`. Depende de una función nueva de solo lectura en `atencion.service` (M4, Juan Ignacio Riquelme) y de dos índices nuevos en `comandas.fecha_hora` y `detalles_comanda.comanda_id` (migración sobre tablas de M4), descritos como dependencias y no como requisitos de Comanda.

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25.

| Ruta | Éxito | Errores |
| --- | --- | --- |
| `GET /reportes/productos-mas-vendidos?fecha_desde&fecha_hasta` | 200, `ReporteProductosMasVendidos` (datos completos por sección) | 422 |
| `GET /reportes/productos-mas-vendidos/pdf?fecha_desde&fecha_hasta` | 200, `application/pdf` con `Content-Disposition: attachment; filename="productos-mas-vendidos_<fecha_desde>_<fecha_hasta>.pdf"` | 422 |

Las dos rutas aplican las mismas validaciones y los mismos 422.

Parámetros (ambos obligatorios, fecha calendario `AAAA-MM-DD`):

- `fecha_desde`: primer día del período, inclusive.
- `fecha_hasta`: último día del período, inclusive (todo el día local).
- Falta de un parámetro, formato inválido o `fecha_desde > fecha_hasta` responden 422 con `{"detalle": ...}` sin devolver datos.

Esquemas:

- `ReporteProductosMasVendidos`: `fecha_desde`, `fecha_hasta`, `secciones: list[SeccionReporte]`. `secciones` vacía significa que no hay datos.
- `SeccionReporte`: `id`, `nombre`, `orden`, `productos: list[LineaReporteProductos]`.
- `LineaReporteProductos`: `producto_id`, `nombre`, `estado`, `cantidad_pedida: int`, `dias_mas_pedidos: list[DiaSemana]`, `franjas_mas_pedidas: list[FranjaHoraria]`.
- `DiaSemana`: `LUNES`, `MARTES`, `MIERCOLES`, `JUEVES`, `VIERNES`, `SABADO`, `DOMINGO`.
- `FranjaHoraria`: `hora_desde: int`, `hora_hasta: int` (0 a 23 para `hora_desde`; `hora_hasta = (hora_desde + 1) % 24`, así `23` → `0`). Ejemplo: `{"hora_desde": 21, "hora_hasta": 22}` es «de 21:00 a 22:00».

Datos: una migración de Alembic agrega los índices `ix_comandas_fecha_hora` sobre `comandas.fecha_hora` e `ix_detalles_comanda_comanda_id` sobre `detalles_comanda.comanda_id`; no hay otros cambios de esquema. Las rutas son de solo lectura y reutilizan `secciones`, `productos`, `comandas` y `detalles_comanda`. Sin paginación (reporte, no listado D-27).

Dependencia nueva: `fpdf2==2.9.0` en `backend/requirements.txt` (versión exacta), con un ayudante de formato común en `backend/app/shared/` que pueden usar los reportes de los seis módulos.

## Requisitos

### Requisito: Reporte por sección y producto (HU-M1-15 CA 1)

`GET /reportes/productos-mas-vendidos` DEBE devolver, por cada sección con al menos un producto pedido en el período, sus productos ordenados por `cantidad_pedida` descendente, cada uno con `nombre`, `cantidad_pedida`, `dias_mas_pedidos` y `franjas_mas_pedidas`. Las secciones DEBEN ordenarse por `orden`, `nombre` e `id`. `cantidad_pedida` DEBE ser la suma de las `cantidad` de las líneas del producto en las comandas del período, no la cantidad de líneas. El PDF DEBE mostrar los mismos datos agrupados por sección (Supuesto S120). La pantalla NO DEBE mostrar el detalle por sección: DEBE mostrar solo los 5 productos más pedidos del período (requisito «Pantalla»).

#### Escenario: Productos ordenados por cantidad en cada sección

- DADO la sección «Platos» con «Milanesa» pedida 5 veces en total y «Ñoquis» pedido 9 veces en total, y la sección «Bebidas» con «Agua» pedida 3 veces
- CUANDO se hace `GET /reportes/productos-mas-vendidos` con un período que incluye esas comandas
- ENTONCES `secciones` trae «Platos» y «Bebidas» en el orden de la carta
- Y en «Platos» «Ñoquis» (9) figura antes que «Milanesa» (5)
- Y cada producto trae `nombre`, `cantidad_pedida`, `dias_mas_pedidos` y `franjas_mas_pedidas`

#### Escenario: La cantidad suma cantidades, no líneas

- DADO una comanda con una línea de «Flan» de cantidad 3 y otra comanda con una línea de «Flan» de cantidad 2
- CUANDO se pide el reporte del período que las incluye
- ENTONCES `cantidad_pedida` de «Flan» es 5

#### Escenario: Solo productos con pedidos

- DADO una sección con un producto pedido y otro sin pedidos en el período, y una sección sin ningún pedido
- CUANDO se pide el reporte
- ENTONCES la sección con pedidos trae solo el producto pedido
- Y la sección sin pedidos no figura

#### Escenario: PDF con el detalle por sección

- DADO un período con pedidos
- CUANDO se hace `GET /reportes/productos-mas-vendidos/pdf` con ese período
- ENTONCES el PDF trae, por sección, una tabla con una fila por producto con nombre, cantidad pedida, días más pedidos y franjas más pedidas, de mayor a menor cantidad

### Requisito: Período sin pedidos (HU-M1-15 CA 2)

Si no hay pedidos en el período, `GET /reportes/productos-mas-vendidos` DEBE responder 200 con `secciones` vacía, y la pantalla DEBE informar «No hay datos para el período elegido.». El endpoint PDF DEBE responder 200 con un PDF que indica que no hay datos para el período (Supuesto S118), de modo que el botón de descarga siempre funcione.

#### Escenario: PDF de un período sin datos

- DADO un período sin pedidos
- CUANDO se hace `GET /reportes/productos-mas-vendidos/pdf`
- ENTONCES responde 200 con `application/pdf`
- Y el PDF muestra el título, el período y la leyenda «No hay datos para el período elegido.» sin tablas de secciones

#### Escenario: Período sin comandas

- DADO un período sin ninguna comanda
- CUANDO se pide el reporte
- ENTONCES responde 200 con `secciones` vacía

#### Escenario: La pantalla informa que no hay datos

- DADO que la API responde `secciones` vacía
- CUANDO se muestra el resultado
- ENTONCES la pantalla muestra «No hay datos para el período elegido.» y ninguna sección

#### Escenario: Período con solo comandas anuladas

- DADO un período cuyas únicas comandas están ANULADAS
- CUANDO se pide el reporte
- ENTONCES responde 200 con `secciones` vacía

### Requisito: Fechas obligatorias (HU-M1-15 CA 3)

El reporte NO DEBE generarse si falta `fecha_desde` o `fecha_hasta`, ni en JSON ni en PDF. La API DEBE responder 422 con un `detalle` que nombre la fecha que falta («Falta la fecha desde.» o «Falta la fecha hasta.»; si faltan ambas, nombra las dos). La pantalla NO DEBE enviar la consulta mientras falte una fecha y DEBE indicar cuál falta.

#### Escenario: Falta `fecha_desde`

- DADO una consulta solo con `fecha_hasta`
- CUANDO se hace `GET /reportes/productos-mas-vendidos`
- ENTONCES responde 422 y `detalle` indica que falta la fecha desde

#### Escenario: Falta `fecha_hasta`

- DADO una consulta solo con `fecha_desde`
- CUANDO se hace `GET /reportes/productos-mas-vendidos`
- ENTONCES responde 422 y `detalle` indica que falta la fecha hasta

#### Escenario: Faltan ambas

- DADO una consulta sin fechas
- CUANDO se hace `GET /reportes/productos-mas-vendidos`
- ENTONCES responde 422 y `detalle` indica que faltan las dos fechas

#### Escenario: La pantalla no consulta sin fechas

- DADO la pantalla con la fecha hasta cargada y la fecha desde vacía
- CUANDO la persona pide el reporte
- ENTONCES no se llama a la API y se muestra «Falta la fecha desde.»

#### Escenario: PDF sin una fecha

- DADO una consulta al PDF sin `fecha_desde`
- CUANDO se hace `GET /reportes/productos-mas-vendidos/pdf`
- ENTONCES responde 422 con `detalle` que indica que falta la fecha desde y no devuelve un PDF

#### Escenario: Formato de fecha inválido

- DADO `fecha_desde=31-12-2026`
- CUANDO se hace `GET /reportes/productos-mas-vendidos`
- ENTONCES responde 422 con `{"detalle": ...}`

### Requisito: Período inválido (HU-M1-15 CA 4)

Si `fecha_desde` es posterior a `fecha_hasta`, la API DEBE responder 422 con `detalle` «El período es inválido: la fecha desde es posterior a la fecha hasta.» sin devolver datos, y la pantalla DEBE mostrar esa advertencia. Una `fecha_desde` igual a `fecha_hasta` DEBE ser válida (período de un día).

#### Escenario: Desde posterior a hasta

- DADO `fecha_desde=2026-11-10` y `fecha_hasta=2026-11-05`
- CUANDO se hace `GET /reportes/productos-mas-vendidos`
- ENTONCES responde 422 con el detalle de período inválido

#### Escenario: PDF con período inválido

- DADO `fecha_desde=2026-11-10` y `fecha_hasta=2026-11-05`
- CUANDO se hace `GET /reportes/productos-mas-vendidos/pdf`
- ENTONCES responde 422 con el detalle de período inválido y no devuelve un PDF

#### Escenario: Período de un solo día

- DADO `fecha_desde` igual a `fecha_hasta` y pedidos ese día
- CUANDO se pide el reporte
- ENTONCES responde 200 con los pedidos de ese día local

#### Escenario: La pantalla advierte el período inválido

- DADO la pantalla con la fecha desde posterior a la fecha hasta
- CUANDO la persona pide el reporte
- ENTONCES se muestra la advertencia de período inválido y no se muestra ningún resultado

### Requisito: Productos deshabilitados incluidos (HU-M1-15 CA 5)

El reporte DEBE incluir los productos DESHABILITADO que tuvieron pedidos en el período, bajo su sección aunque esta también esté DESHABILITADA, con su `estado`. El PDF DEBE marcar los productos deshabilitados con la indicación «(Deshabilitado)» junto al nombre. En la pantalla, un producto deshabilitado que esté entre los 5 primeros DEBE mostrarse con esa misma indicación.

#### Escenario: Producto deshabilitado con pedidos

- DADO un producto hoy DESHABILITADO con pedidos en el período
- CUANDO se pide el reporte
- ENTONCES el producto figura bajo su sección con su `cantidad_pedida` y `estado` `DESHABILITADO`

#### Escenario: Sección deshabilitada con pedidos

- DADO una sección DESHABILITADA con un producto que tuvo pedidos
- CUANDO se pide el reporte
- ENTONCES la sección figura con ese producto

#### Escenario: El PDF marca el producto deshabilitado

- DADO un producto deshabilitado con pedidos en el período
- CUANDO se genera el PDF
- ENTONCES su fila lleva la indicación «(Deshabilitado)» junto al nombre

#### Escenario: Deshabilitado entre los 5 primeros en la pantalla

- DADO un producto deshabilitado entre los 5 más pedidos
- CUANDO se muestra el gráfico
- ENTONCES figura con la indicación «(Deshabilitado)» en su etiqueta

### Requisito: Empates de día y franja (HU-M1-15 CA 6)

`dias_mas_pedidos` DEBE contener el día de la semana con mayor cantidad pedida del producto en el período y, si hay empate, todos los empatados, ordenados de lunes a domingo. `franjas_mas_pedidas` DEBE contener la franja de una hora con mayor cantidad pedida y, si hay empate, todas las empatadas, en orden de hora ascendente. Día y franja DEBEN calcularse con la suma de `cantidad`, no con la cantidad de líneas. El PDF DEBE mostrar todos los empatados, separados por coma.

#### Escenario: Un solo día y una sola franja

- DADO «Pizza» con 6 unidades un viernes entre las 21:00 y las 22:00 y 2 unidades un martes a las 13:00
- CUANDO se pide el reporte
- ENTONCES `dias_mas_pedidos` es `[VIERNES]`
- Y `franjas_mas_pedidas` es `[{21, 22}]`

#### Escenario: Empate de día

- DADO «Pizza» con 4 unidades un viernes y 4 un sábado, y 1 un martes
- CUANDO se pide el reporte
- ENTONCES `dias_mas_pedidos` es `[VIERNES, SABADO]`

#### Escenario: Empate de franja

- DADO «Pizza» con 3 unidades a las 13:30 y 3 a las 21:15 del mismo período
- CUANDO se pide el reporte
- ENTONCES `franjas_mas_pedidas` es `[{13, 14}, {21, 22}]`

#### Escenario: Una línea de mayor cantidad pesa más que varias de menor

- DADO «Flan» con una línea de cantidad 5 un lunes y tres líneas de cantidad 1 un jueves
- CUANDO se pide el reporte
- ENTONCES `dias_mas_pedidos` es `[LUNES]`

#### Escenario: Franja que cruza la medianoche

- DADO «Café» con pedidos entre las 23:00 y las 23:59 hora local
- CUANDO se pide el reporte
- ENTONCES la franja es `{"hora_desde": 23, "hora_hasta": 0}`

#### Escenario: El PDF muestra los empatados

- DADO un producto con `dias_mas_pedidos` `[VIERNES, SABADO]` y `franjas_mas_pedidas` `[{13, 14}, {21, 22}]`
- CUANDO se genera el PDF
- ENTONCES su fila muestra «Viernes, Sábado» y «13:00 a 14:00, 21:00 a 22:00»

### Requisito: Qué comandas y líneas cuentan (HU-M1-15, S102, S103)

Cuentan las líneas de producto (`producto_id` no nulo) de comandas ABIERTA y CERRADA. NO DEBEN contarse las comandas ANULADA ni las líneas de menú ejecutivo (`menu_ejecutivo_id`). Las líneas de producto con `promocion_id` DEBEN contarse como cualquier otra. DEBEN contarse todas las categorías de producto.

#### Escenario: Comanda anulada excluida

- DADO «Pizza» con 2 unidades en una comanda CERRADA y 10 en una comanda ANULADA del mismo período
- CUANDO se pide el reporte
- ENTONCES `cantidad_pedida` de «Pizza» es 2

#### Escenario: Comandas abierta y cerrada

- DADO «Pizza» con 1 unidad en una comanda ABIERTA y 1 en una CERRADA
- CUANDO se pide el reporte
- ENTONCES `cantidad_pedida` es 2

#### Escenario: Línea de menú ejecutivo excluida

- DADO una comanda con una línea de menú ejecutivo y una línea de producto «Agua» de cantidad 1
- CUANDO se pide el reporte
- ENTONCES el reporte trae solo «Agua» con cantidad 1 y ningún ítem de menú

#### Escenario: Línea de producto con promoción cuenta

- DADO una línea de «Pizza» de cantidad 2 con `promocion_id` en una comanda del período
- CUANDO se pide el reporte
- ENTONCES esas 2 unidades suman a `cantidad_pedida` de «Pizza»

#### Escenario: Todas las categorías

- DADO pedidos de un plato, un postre, una bebida y un menú del día
- CUANDO se pide el reporte
- ENTONCES los cuatro productos figuran bajo sus secciones

### Requisito: Zona horaria y límites del período (HU-M1-15, S101, S104)

`Comanda.fecha_hora` está en UTC. El período, el día de la semana y la franja DEBEN calcularse en hora local fija UTC−3. El período DEBE ir desde las 00:00 locales de `fecha_desde` inclusive hasta las 24:00 locales de `fecha_hasta` exclusive, es decir, `fecha_hasta` incluye todo su día local.

#### Escenario: Comanda de madrugada UTC pertenece al día local anterior

- DADO una comanda con `fecha_hora` 2026-11-06 02:00 UTC (2026-11-05 23:00 local, jueves)
- CUANDO se pide el reporte con `fecha_desde=fecha_hasta=2026-11-05`
- ENTONCES la comanda cuenta, con día `JUEVES` y franja `{23, 0}`
- Y con `fecha_desde=fecha_hasta=2026-11-06` no cuenta

#### Escenario: `fecha_hasta` incluye todo el día local

- DADO una comanda con `fecha_hora` 2026-11-06 02:59:59 UTC (2026-11-05 23:59:59 local) y otra a las 03:00:00 UTC (2026-11-06 00:00:00 local)
- CUANDO se pide el reporte con `fecha_hasta=2026-11-05`
- ENTONCES cuenta la primera y no la segunda

#### Escenario: `fecha_desde` incluye desde las 00:00 local

- DADO una comanda a las 03:00:00 UTC del 2026-11-06 y otra a las 02:59:59 UTC del mismo día
- CUANDO se pide el reporte con `fecha_desde=2026-11-06`
- ENTONCES cuenta la primera y no la segunda

#### Escenario: Franja calculada en hora local

- DADO una comanda a las 00:30 UTC (21:30 local del día anterior)
- CUANDO se pide el reporte que la incluye
- ENTONCES su franja es `{21, 22}`

### Requisito: Desempate del orden de productos (HU-M1-15, S109)

Dentro de una sección, los productos con igual `cantidad_pedida` DEBEN ordenarse por `nombre` ascendente y luego por `producto_id`, de modo que el orden sea determinista.

#### Escenario: Igual cantidad

- DADO «Tarta» y «Ensalada» de una misma sección, ambas con cantidad pedida 4
- CUANDO se pide el reporte
- ENTONCES «Ensalada» figura antes que «Tarta»

### Requisito: Reporte de solo lectura sin efectos (HU-M1-15)

`GET /reportes/productos-mas-vendidos` NO DEBE modificar productos, secciones ni comandas, y NO DEBE alterar las respuestas de `GET /carta`, `GET /productos` ni `GET /secciones`. La función `atencion.service.sumar_productos_pedidos(db, desde, hasta, desplazamiento_horas)` DEBE ser de solo lectura (sin `commit`) y agregar en la base de datos (D-11, RNF-REN-05): DEBE devolver filas ya sumadas por producto, día de la semana local y hora local, `CantidadPedidaPorFranja` con `producto_id`, `dia_semana` (0 = lunes), `hora` (0 a 23) y `cantidad` (suma de `cantidad`), y NO DEBE devolver líneas sueltas. Solo cuenta líneas con `producto_id` de comandas no ANULADA con `desde <= fecha_hora < hasta`.

#### Escenario: Consulta sin cambios

- DADO comandas, productos y secciones en cualquier estado
- CUANDO se pide el reporte
- ENTONCES los datos no cambian y las demás consultas responden como antes

#### Escenario: Función de M4

- DADO comandas ABIERTA, CERRADA y ANULADA con líneas de producto y de menú ejecutivo
- CUANDO se llama a `sumar_productos_pedidos` con un intervalo UTC y un desplazamiento de −3 horas
- ENTONCES devuelve solo filas `CantidadPedidaPorFranja` con las líneas de producto de comandas no ANULADA dentro del intervalo
- Y una fila por cada combinación de producto, día de la semana local y hora local, con la `cantidad` ya sumada

#### Escenario: Función de M4 suma en la base

- DADO dos líneas del mismo producto, de cantidad 2 y 3, en comandas del mismo día y la misma hora locales
- CUANDO se llama a `sumar_productos_pedidos`
- ENTONCES devuelve una sola fila para ese producto, día y hora con `cantidad` 5

#### Escenario: Función de M4 con día y hora locales

- DADO una comanda a las 02:00 UTC de un viernes
- CUANDO se llama a `sumar_productos_pedidos` con desplazamiento de −3 horas
- ENTONCES la fila trae `dia_semana` 3 (jueves) y `hora` 23

### Requisito: Índices de la consulta del reporte (HU-M1-15, RNF-REN-05, S122)

Una migración de Alembic DEBE crear los índices `ix_comandas_fecha_hora` sobre `comandas.fecha_hora` e `ix_detalles_comanda_comanda_id` sobre `detalles_comanda.comanda_id`, de modo que la consulta agregada del reporte no recorra completas las tablas `comandas` ni `detalles_comanda`. El `downgrade` de la migración DEBE eliminar ambos índices. La migración NO DEBE alterar datos ni otras tablas.

#### Escenario: La consulta usa el índice

- DADO la base migrada hasta la última revisión
- CUANDO se ejecuta `EXPLAIN QUERY PLAN` sobre la consulta agregada con un rango de `fecha_hora`
- ENTONCES el plan busca en `comandas` por el índice `ix_comandas_fecha_hora` y no muestra recorridos completos (`SCAN comandas` ni `SCAN detalles_comanda`)

#### Escenario: Reversión de la migración

- DADO la base migrada con los índices
- CUANDO se hace `downgrade` de esa migración
- ENTONCES los índices `ix_comandas_fecha_hora` e `ix_detalles_comanda_comanda_id` dejan de existir y los datos de `comandas` y `detalles_comanda` no cambian

### Requisito: Salida en PDF (HU-M1-15 CA 1, CA 5 y CA 6, S118, S119, S123)

`GET /reportes/productos-mas-vendidos/pdf` DEBE devolver el reporte como `application/pdf`, con `Content-Disposition: attachment` y nombre de archivo `productos-mas-vendidos_<fecha_desde>_<fecha_hasta>.pdf`. El PDF DEBE contener, en este orden: el título «Productos más vendidos por período»; el período con fechas `dd/mm/aaaa` («Período: 01/10/2026 al 31/10/2026»); la fecha y hora de generación en hora local; un recuadro de resumen (solo si hay datos) con «Unidades pedidas», «Productos distintos» y «Más vendido» (S125); un texto breve que explique el cálculo (la cantidad pedida es la suma de las cantidades de las líneas de producto de las comandas del período, el día y la franja se calculan en hora local UTC−3, no cuentan las comandas anuladas ni los menús ejecutivos, y en caso de empate se muestran todos los empatados); y, por cada sección, su nombre y una tabla con las columnas «Producto», «Cantidad pedida», «Días más pedidos» y «Franjas más pedidas». Los productos deshabilitados DEBEN llevar «(Deshabilitado)». El PDF se genera en el backend con `fpdf2==2.9.0` y un ayudante de formato común en `backend/app/shared/`. Si una tabla ocupa más de una página, DEBE repetir el encabezado de columnas.

#### Escenario: Descarga del PDF

- DADO un período con pedidos
- CUANDO se hace `GET /reportes/productos-mas-vendidos/pdf?fecha_desde=2026-11-01&fecha_hasta=2026-11-05`
- ENTONCES responde 200 con `Content-Type: application/pdf`
- Y `Content-Disposition` es `attachment; filename="productos-mas-vendidos_2026-11-01_2026-11-05.pdf"`
- Y el cuerpo comienza con `%PDF`

#### Escenario: Contenido del PDF

- DADO un período con pedidos de dos secciones
- CUANDO se genera el PDF
- ENTONCES el texto del PDF incluye el título, el período, la fecha de generación, el texto explicativo y, por cada sección, su nombre y una fila por producto con cantidad, días y franjas

#### Escenario: Texto explicativo del cálculo

- DADO cualquier período válido
- CUANDO se genera el PDF
- ENTONCES el texto explicativo menciona hora local UTC−3, las comandas anuladas y los menús ejecutivos excluidos, y el criterio de empates

#### Escenario: Mismos datos que el JSON

- DADO un período con pedidos
- CUANDO se piden el JSON y el PDF con las mismas fechas
- ENTONCES el PDF muestra las mismas secciones, productos, cantidades, días y franjas que el JSON

#### Escenario: Tabla de más de una página

- DADO una sección con más productos de los que entran en una página
- CUANDO se genera el PDF
- ENTONCES la tabla continúa en la página siguiente con el encabezado de columnas repetido

### Requisito: Pantalla del reporte con los 5 más pedidos (HU-M1-15 CA 2, 3 y 4, S120, S121)

La pantalla `ReporteMasVendidosPage` DEBE ofrecer los selectores «Fecha desde» y «Fecha hasta» y el botón «Generar». Al generar, DEBE mostrar SOLO los 5 productos con mayor `cantidad_pedida` del período, tomados entre todas las secciones (no por sección), ordenados de mayor a menor, como gráfico de barras dentro de `ChartContainer`, con la cantidad pedida de cada uno. El desempate es por nombre ascendente. Si hay menos de 5 productos, DEBE mostrar los que haya. DEBE mostrar además el texto «El detalle completo está en el reporte PDF.» y el botón «Descargar PDF», que descarga `GET /reportes/productos-mas-vendidos/pdf` con el mismo período. Si el período no tiene datos, DEBE mostrar «No hay datos para el período elegido.». Las validaciones de fechas faltantes y de período inválido DEBEN impedir la consulta y mostrar sus mensajes. Toda llamada DEBE pasar por el `api.ts` del módulo `productos`. Si la consulta falla, DEBE mostrar «No se pudo cargar el reporte.». Se muestra bajo la ruta `/reportes/productos-mas-vendidos` (refleja la ruta de la API, D-28) dentro del diseño de la aplicación, de modo que el menú lateral marca «Reportes» como activo. Las migas de pan DEBEN ser «Reportes › Productos más vendidos», con «Reportes» enlazando a `/reportes`. El subtítulo del resultado DEBE mostrar el período como «Del 01/10/2026 al 31/10/2026» (`dd/mm/aaaa`).

#### Escenario: Selectores y botón

- DADO la pantalla recién abierta
- CUANDO se muestra
- ENTONCES figuran «Fecha desde», «Fecha hasta» y el botón «Generar», y todavía no se muestra resultado ni el botón «Descargar PDF»

#### Escenario: Solo los 5 más pedidos

- DADO un período con 8 productos pedidos en tres secciones
- CUANDO la persona pulsa «Generar»
- ENTONCES el gráfico muestra exactamente los 5 de mayor `cantidad_pedida` entre todas las secciones, de mayor a menor, cada uno con su cantidad
- Y no se muestran secciones, días ni franjas

#### Escenario: Menos de 5 productos

- DADO un período con 3 productos pedidos
- CUANDO la persona pulsa «Generar»
- ENTONCES el gráfico muestra los 3

#### Escenario: Texto y botón del PDF

- DADO un resultado con datos en pantalla
- CUANDO se muestra el resultado
- ENTONCES se ve «El detalle completo está en el reporte PDF.» y el botón «Descargar PDF»

#### Escenario: Descargar el PDF

- DADO un resultado con datos para el período 2026-11-01 a 2026-11-05
- CUANDO la persona pulsa «Descargar PDF»
- ENTONCES se pide `GET /reportes/productos-mas-vendidos/pdf?fecha_desde=2026-11-01&fecha_hasta=2026-11-05` y el navegador descarga el archivo

#### Escenario: Período sin datos en pantalla

- DADO que la API responde `secciones` vacía
- CUANDO se muestra el resultado
- ENTONCES se muestra «No hay datos para el período elegido.», sin gráfico

#### Escenario: Período inválido o fechas faltantes en pantalla

- DADO una fecha faltante o una fecha desde posterior a la fecha hasta
- CUANDO la persona pulsa «Generar»
- ENTONCES no se llama a la API y se muestra el mensaje correspondiente

#### Escenario: Error de carga

- DADO que la consulta a la API falla
- CUANDO la persona pide el reporte
- ENTONCES se muestra «No se pudo cargar el reporte.»

#### Escenario: Ruta de la pantalla

- DADO la aplicación en ejecución
- CUANDO la persona navega a `/reportes/productos-mas-vendidos`
- ENTONCES se muestra `ReporteMasVendidosPage`

### Requisito: Página compartida de reportes (HU-M1-15, S117, S124)

La aplicación DEBE ofrecer la página `/reportes`, implementada en `frontend/src/shared/`, con un ítem «Reportes» en el menú lateral. DEBE mostrar una tarjeta por reporte, en fila, cada una con título, descripción y un botón «Generar» que navega a la ruta del reporte. Esta HU DEBE agregar la tarjeta del reporte «Productos más vendidos» (navega a `/reportes/productos-mas-vendidos`). La página solo enlaza rutas: NO DEBE importar archivos de ningún módulo (AGENTS.md §9.4). Los demás integrantes agregan sus tarjetas en sus propias HU.

#### Escenario: Ítem del menú lateral

- DADO la aplicación en ejecución
- CUANDO se muestra el menú lateral
- ENTONCES figura el ítem «Reportes» que lleva a `/reportes`

#### Escenario: Tarjeta del reporte de M1

- DADO la página `/reportes`
- CUANDO se muestra
- ENTONCES figura una tarjeta con el título «Productos más vendidos», su descripción y el botón «Generar»

#### Escenario: Navegar al reporte

- DADO la página `/reportes`
- CUANDO la persona pulsa «Generar» en la tarjeta de «Productos más vendidos»
- ENTONCES navega a `/reportes/productos-mas-vendidos`

#### Escenario: Tarjetas en fila

- DADO dos o más tarjetas de reportes registradas
- CUANDO se muestra la página
- ENTONCES las tarjetas aparecen una al lado de otra en una fila

#### Escenario: La página no depende de módulos

- DADO el código de `frontend/src/shared/` de la página de reportes
- CUANDO se revisan sus importaciones
- ENTONCES no importa ningún archivo de `frontend/src/modules/`

## Supuestos

- Supuesto: S100 a S108 de la propuesta de HU-M1-15 rigen sin cambios (fuente de datos en M4, hora local UTC−3, estados de comanda, exclusión de menú ejecutivo, fechas obligatorias, `cantidadPedida` como suma, agrupación y orden, productos deshabilitados, empates, errores 422 y vacío 200).
- Supuesto: S109. Dentro de una sección, los productos con igual `cantidad_pedida` se desempatan por `nombre` ascendente y luego `producto_id`.
- Supuesto: S110. No hay amplitud máxima del período; cualquier rango válido se consulta. Si el equipo la pide, se agrega en otra HU.
- Supuesto: S112. La ruta de la API es `GET /reportes/productos-mas-vendidos`, en el router de `productos`, con nombres de campo en `snake_case` según el diagrama (`fechaDesde` → `fecha_desde`, `diasMasPedidos` → `dias_mas_pedidos`, `franjasMasPedidas` → `franjas_mas_pedidas`).
- Supuesto: S113. Las fechas llegan como fecha calendario `AAAA-MM-DD` (sin hora ni zona) y se interpretan en hora local UTC−3. Los textos exactos de errores y del estado vacío son los de esta spec.
- Supuesto: S114. Se informa el día de la semana en el contrato como enumeración en mayúsculas sin tilde y el PDF lo muestra en español con tilde («Miércoles», «Sábado»).
- Supuesto: S111. Reemplazado por S117: el acceso a la pantalla es la página compartida `/reportes`.
- Supuesto: S115. Para S108, la falta de parámetros se valida en el service/router propio del reporte (no por la validación automática de FastAPI), para que el 422 cumpla D-26 con `{"detalle": ...}` y nombre la fecha faltante.
- Supuesto: S116. La constante de la zona del restaurante (UTC−3 fijo) se duplica en `productos` y se unifica en `shared/` más adelante, con M5 (decisión del diseño).
- Supuesto: S117. El acceso a la pantalla es la página compartida `/reportes` con su ítem en el menú lateral; reemplaza al botón «Más vendidos» en el encabezado de Productos. Toca `frontend/src/shared/`, el menú lateral y `App.tsx`: hay que avisar al equipo.
- Supuesto: S118. Un período sin datos devuelve en el PDF 200 con un PDF que dice que no hay datos (no 404), para que el botón «Descargar PDF» siempre funcione.
- Supuesto: S119. `fpdf2==2.9.0` es una dependencia nueva con versión exacta; el equipo la acuerda antes de agregarla (AGENTS.md §9.7). El ayudante de formato en `backend/app/shared/` queda disponible para los seis reportes y se coordina con el equipo.
- Supuesto: S120. Trazabilidad de los criterios: CA 1 («veo, por sección, … días y franjas»), CA 5 y CA 6 se cumplen en el PDF y en el JSON; la pantalla muestra solo los 5 más pedidos con su cantidad. CA 2, 3 y 4 rigen también en la pantalla. El equipo valida esta lectura.
- Supuesto: S121. «Los 5 más pedidos» se toman entre todas las secciones por `cantidad_pedida` descendente, con desempate por `nombre` y `producto_id`; con empate en el puesto 5 se corta en 5 (no se muestran más).
- Supuesto: S122. Los índices `ix_comandas_fecha_hora` e `ix_detalles_comanda_comanda_id` están en tablas de M4: la migración se coordina con Juan Ignacio Riquelme. El `downgrade` los elimina. El segundo índice es necesario porque sin él la unión recorre completa `detalles_comanda` (design.md).
- Supuesto: S123. El PDF es A4 vertical, con el período en `dd/mm/aaaa`, la fecha de generación en hora local UTC−3, encabezado y tablas con acento ámbar, pie con la marca y «Página n de N», columnas «Producto», «Cantidad pedida», «Días más pedidos» y «Franjas más pedidas» (franjas como «21:00 a 22:00»), y el texto explicativo bajo el encabezado.
- Supuesto: S125. El PDF incluye, solo cuando hay datos, un recuadro de resumen con «Unidades pedidas» (suma de las cantidades de todas las secciones), «Productos distintos» (cantidad de productos) y «Más vendido» (el primero por cantidad descendente, nombre y `producto_id`; en empate, ese orden). No lo pide la HU.
- Supuesto: S124. Cada tarjeta de `/reportes` es una descripción estática (título, descripción y ruta) registrada en `shared/`, sin importar páginas de módulos.
