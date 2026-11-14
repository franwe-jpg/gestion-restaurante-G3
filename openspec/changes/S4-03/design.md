# Diseño · S4-03 Selectores y enlaces entre pantallas

## Enfoque técnico

Solo frontend, sin cambios de backend ni de `shared/`. Atención (M4) obtiene mesas, productos y menús desde su propio `api.ts` (D-16) y los reúne en un catálogo que usan el formulario de alta, el de modificación y los diálogos de cierre y entregas. Los enlaces se resuelven con callbacks hacia las páginas, que navegan con `useNavigate` y leen el parámetro con `useSearchParams` (patrón de `ProductosPage`).

## Decisiones de arquitectura

| # | Opción elegida | Alternativa descartada | Motivo |
| --- | --- | --- | --- |
| D1 | Cada diálogo carga el catálogo al montarse (`useCatalogoComanda`) | Cargarlo una vez en `AtencionPage` o en un contexto | Los diálogos solo se montan abiertos; las mesas `LIBRE` cambian seguido y deben estar frescas en cada apertura. |
| D2 | Productos con `estado=TODOS` y menús sin `estado`, un pedido por lista; el filtro de habilitados es local | Dos pedidos (habilitados y todos) | Un mismo resultado sirve para los selectores (habilitados) y para los nombres (todos, S3). |
| D3 | Mesas: `GET /mesas?limit=100` y filtro `LIBRE` local (S1) | Filtro `estado` en el backend | El alcance excluye backend; el servicio ya rechaza mesas ocupadas. |
| D4 | `LineaPedido` no cambia: `referencia` guarda el id elegido; el `Select` reemplaza al `Input` y cambiar el tipo vacía la referencia | Guardar el objeto elegido | `usePedido` y `useModificacionComanda` quedan intactos. |
| D5 | Las tablas reciben callbacks (`onAbrirComanda`, `onFacturar`) y la página navega | `Link` dentro de las tablas | Sigue el patrón de acciones existente; `MesasTabla` y `ComandasTabla` no dependen del router. |
| D6 | Cada página lee su parámetro una vez (inicializador de `useState`) y lo borra con `setSearchParams(..., { replace: true })` | Hook común en `shared/hooks/` | Evita tocar `shared/` en un cambio que ya cruza tres módulos; son unas 8 líneas por página. |
| D7 | El valor inicial viaja como texto: la mesa se descarta si no está entre las libres al terminar la carga; la comanda reutiliza la validación de `pedirPrevia` | Validar en la página | Cumple S6 sin duplicar validaciones. |
| D8 | Nombre ausente o catálogo con error: «Producto #id» / «Menú ejecutivo #id» | Ocultar la línea | Cumple S3 y mantiene válidas las pruebas actuales de entregas. |
| D9 | En las pruebas de página existentes, `render` local con `wrapper: MemoryRouter` | Envolver cada llamada | Una línea por archivo en lugar de decenas. |

## Flujo de datos

```
SalonPage ─onAbrirComanda─→ navigate('/atencion?mesa=<id>')
AtencionPage ─lee ?mesa─→ ComandaForm(mesaInicial) ─→ usePedido
     │                         └─ useCatalogoComanda ─→ atencion/api.ts
     │                              (mesas, productos, menús)
ComandasTabla ─onFacturar─→ navigate('/pagos?comanda=<id>')
PagosPage ─lee ?comanda─→ FacturarComandaDialog(comandaInicial)
                              └─ useFacturarComanda ─→ previsualizarFactura
```

## Cambios por archivo

| Archivo (`frontend/src/modules/`) | Acción | Descripción | Líneas aprox. |
| --- | --- | --- | --- |
| `atencion/types.ts` | Modificar | `MesaSeleccionable`, `ProductoSeleccionable`, `MenuEjecutivoSeleccionable`, `CatalogoComanda` | +25 |
| `atencion/api.ts` | Modificar | `listarMesas`, `listarProductos`, `listarMenusEjecutivos` | +30 |
| `atencion/components/catalogoComanda.ts` | Crear | `cargarCatalogo`, `nombreDeDetalle`, etiquetas de opción (funciones puras) | +70 |
| `atencion/components/useCatalogoComanda.ts` | Crear | Usa `useApi` de `shared/hooks` sobre `cargarCatalogo` | +35 |
| `atencion/components/DetallePedidoFila.tsx` | Modificar | `Select` de producto o menú según el tipo | +25 / −12 |
| `atencion/components/ComandaForm.tsx`, `usePedido.ts` | Modificar | `CampoMesa` con `Select`, `mesaInicial`, aviso de error del catálogo | +40 / −17 |
| `atencion/components/{ModificarComanda,CierreComanda,EntregasComanda}Dialog.tsx` | Modificar | Nombres con `nombreDeDetalle` | +24 / −17 |
| `atencion/components/{AtencionDialogs,ComandasPanel,ComandasTabla}.tsx` | Modificar | `mesaInicial`; acción «Facturar» en comandas `CERRADA` | +22 |
| `atencion/pages/AtencionPage.tsx` | Modificar | Hook `useEnlacesAtencion` (parámetro y navegación) | +22 |
| `salon/components/MesasTabla.tsx`, `salon/pages/SalonPage.tsx` | Modificar | Acción «Abrir comanda» solo en mesas `LIBRE` | +25 |
| `pagos/pages/PagosPage.tsx`, `components/FacturarComandaDialog.tsx`, `useFacturarComanda.ts` | Modificar | `comandaInicial` y carga automática de la vista previa | +36 |
| Pruebas (`*.test.ts(x)` de los tres módulos) | Crear/Modificar | Ver estrategia | +420 / −20 |

Pronóstico del lado frontend: unas 800 líneas (≈ 400 de código y ≈ 420 de pruebas). Es el punto de control; no divide el PR.

## Contratos

```ts
// atencion/components/useCatalogoComanda.ts
export function useCatalogoComanda(opciones?: { conMesas?: boolean }): {
  mesasLibres: MesaSeleccionable[];
  productos: ProductoSeleccionable[]; // solo HABILITADO
  menus: MenuEjecutivoSeleccionable[]; // solo HABILITADO
  nombreDe: (detalle: DetalleComandaCrear) => string;
  cargando: boolean;
  error: string | null;
};
```

`useCatalogoComanda` llama una sola vez a `useApi` (las reglas de los hooks impiden llamadas condicionales); sin `conMesas`, `cargarCatalogo` devuelve una lista de mesas vacía sin pedirla. S4-04 suma `conMozos` y una lista más en `cargarCatalogo`, sin tocar los diálogos.

Funciones de 50 líneas como máximo: `AtencionPage` extrae `useEnlacesAtencion` y `ComandaForm` extrae `CampoMesa`.

## Estrategia de pruebas (Strict TDD: primero la prueba en rojo)

| Capa | Qué | Cómo |
| --- | --- | --- |
| Unidad | URLs de las tres funciones nuevas; `cargarCatalogo` (filtros, error); `nombreDeDetalle` (nombre y respaldo) | `api.test.ts`, `catalogoComanda.test.ts` con `clienteHttp` y la api simulados |
| Componente | «Abrir comanda» solo en `LIBRE`; «Facturar» solo en `CERRADA`; nombres en entregas | `MesasTabla.test.tsx`, `AtencionPage.test.tsx`, `EntregasComandaDialog.test.tsx` |
| Integración | Alta con selectores; modificar con selector; `?mesa=1` preselecciona; `?mesa=99` sin preselección; clic en «Abrir comanda» → `/atencion?mesa=1`; clic en «Facturar» → `/pagos?comanda=3`; `?comanda=12` carga la vista previa; comanda facturada o inexistente muestra el error | `MemoryRouter` con `initialEntries` y `useLocation`, como `ReservasPage.test.tsx` |
| E2E | — | No disponible en el proyecto |

Las fábricas simuladas de `../api` en `AtencionPage.test.tsx` y `EntregasComandaDialog.test.tsx` suman las tres funciones nuevas (por defecto, listas vacías).

## Matriz de amenazas

N/A: no hay shell, subprocesos, automatización de VCS ni clasificación de ejecutables. Los parámetros de URL son entradas no confiables: se convierten a entero o se validan antes de usarse, y React los escapa al mostrarlos.

## Migración

No requiere migración.

## Preguntas abiertas

- [ ] Los supuestos S1 a S6 de la propuesta siguen pendientes de la revisión de la persona.
- [ ] Avisar en el PR a los responsables de M3, M4 y M6 (AGENTS.md, regla 3).
