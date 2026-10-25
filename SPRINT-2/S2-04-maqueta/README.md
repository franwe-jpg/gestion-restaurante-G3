# Maqueta de pantallas (S2-04)

## Qué es

Maqueta de la tarea S2-04 (issue #173). Es un prototipo visual con datos de ejemplo y sin conexión a la API. Sirve de referencia para las pantallas de cada ABM.

## Cómo usarla al implementar

La maqueta es una **guía, no un contrato**. Al implementar las pantallas de una HU (personas y agentes):

- **Seguir de la maqueta:** la estructura (menú lateral, encabezado, listado con filtros y formulario), los colores, los estados y el tono de los textos.
- **Tienen prioridad sobre la maqueta:** la HU, la spec revisada y cualquier diseño posterior. Si alguno de ellos dice otra cosa, se implementa eso.
- **Funciones que no están en la maqueta:** se diseñan con el mismo estilo. La maqueta no las limita.
- **Datos:** los nombres de campos y entidades salen del diagrama de clases y de la spec, no de los datos de ejemplo.
- Si la pantalla se aparta de la maqueta, anotar la diferencia en el PR.

## Cómo verla

1. Abrir `index.html` en el navegador (doble clic). No hace falta instalar nada ni levantar un servidor.
2. El menú lateral recorre las pantallas. `login.html` se abre con el ícono de cerrar sesión del encabezado, y `carta.html` con el botón «Ver carta» de Productos y Carta.

Las fuentes se cargan desde Google Fonts. Sin conexión a internet, la página usa las fuentes del sistema.

## Pantallas

| Archivo | Módulo | Qué muestra |
| --- | --- | --- |
| `index.html` | Inicio | Mapa del local con filtros por lugar y estado, detalle de cada mesa, estado de la caja y accesos a nueva comanda y nueva reserva. |
| `login.html` | Acceso | Inicio de sesión. |
| `productos.html` | M1 Productos y Carta | Productos y secciones, filtro por estado y confirmación para dar de baja. |
| `producto-nuevo.html` | M1 Productos y Carta | Alta de un plato con vista previa en la carta. |
| `carta.html` | M1 Productos y Carta | Carta para el cliente en el celular (390 px), con navegación por secciones. |
| `menus.html` | M2 Menús y Promociones | Menús ejecutivos con su formulario, menú del día y promociones. |
| `salon.html` | M3 Salón y Mozos | Sectores, mesas con el formulario de nueva mesa, y mozos. |
| `comandas.html` | M4 Atención al Público | Comandas con filtro por estado, y clientes. |
| `comanda-nueva.html` | M4 Atención al Público | Carga de una comanda: categorías, productos, cantidades y total. |
| `reservas.html` | M5 Reservas | Reservas del día y panel de nueva reserva. |
| `pagos.html` | M6 Pagos | Medios de pago con su formulario, y facturas. |

## Supuestos a validar

En pantalla están marcados con un recuadro azul punteado.

- Inicio de sesión y roles: propuesta del #172.
- Estado de la caja: es lo recaudado hoy por medio de pago más el total adeudado. No existe una entidad `Caja`.
- Mesa «reservada»: surge de las reservas activas del día. `EstadoMesa` no tiene ese valor.
- Carta pública para el cliente. La HU-M1-14 la plantea para el mozo.
- Ítem «Inicio» en el menú lateral.
- El mapa del Inicio y la disposición de las mesas son una propuesta. No forman parte de ninguna HU.

Lo marcado «Sprint 3» está para ubicarlo; no se implementa en este sprint.

## Componentes que faltan en `frontend/src/shared/components/`

Elementos de la maqueta sin equivalente en `shared/components/` ni en `shared/components/ui/`:

- **Mapa del local:** plano con las mesas por sector y por estado (Inicio).
- **Selector de cantidad:** botones − y + con el número en el medio (Nueva comanda).
- **Control segmentado:** filtro de opciones excluyentes, por ejemplo Habilitados / Deshabilitados / Todos (Productos, Comandas).
- **Filtro con píldoras:** categorías de Nueva comanda y secciones de la carta.
- **Campo de chips con quitar:** ingredientes del plato y productos de un menú ejecutivo.
- **Carga de imagen:** zona para arrastrar un archivo, elegirlo o sacar una foto (Nuevo plato).
- **Barra de progreso por unidades:** productos entregados de una comanda (detalle de mesa en Inicio).

Además, `Tabs` (`ui/tabs.tsx`) acepta solo texto como etiqueta, así que la marca «SPRINT 3» dentro de una pestaña requiere ampliarlo.

## Cómo editarla

- Es HTML, CSS y JavaScript sin dependencias ni paso de compilación.
- Los estilos comunes están en `estilos.css`. Los propios de cada pantalla, en el `<style>` de esa página.
- Los datos de ejemplo y el comportamiento de cada pantalla están en el `<script>` al final de la página. El resto del marcado (menú lateral, encabezado, formularios) está escrito directamente en el HTML.
- Los cambios se integran con un PR, como el resto del repositorio.

## Origen

Se diseñó en un lienzo de Claude Design y luego se convirtió a HTML plano.
