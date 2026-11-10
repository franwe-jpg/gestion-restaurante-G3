# Propuesta · S4-03 Selectores y enlaces entre pantallas

- **Issue:** [#224](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/224) · **Rama:** `feature/S4-03-selectores-y-enlaces`
- **Módulos:** M3 `salon/`, M4 `atencion/` (dueño del contrato de Comanda: Juan Ignacio Riquelme), M6 `pagos/`. Solo frontend.

## Intención

Hoy el mozo carga una comanda escribiendo IDs de mesa, producto y menú, los diálogos muestran «Producto #12» y para facturar hay que tipear el número de comanda. Es propenso a errores y difícil de explicar en la demo. El cambio reemplaza los IDs por selectores y nombres, y une los pasos Mesa → Comanda → Factura con enlaces.

## Alcance

### Incluido

- Selectores en el alta de comanda: mesa (solo `LIBRE`), producto (solo habilitados) y menú ejecutivo (solo habilitados).
- Nombres en lugar de «Producto #id» / «Menú #id» en los diálogos de cierre, entregas y modificación.
- Enlace Mesa → Comanda: acción en la tabla de mesas que abre `/atencion?mesa=<id>` con el formulario abierto y la mesa elegida.
- Enlace Comanda → Factura: acción en las comandas `CERRADA` que abre `/pagos?comanda=<id>` con el diálogo de facturar y la vista previa cargada.
- Pruebas de cada selector y de cada enlace (camino feliz y error o límite).

### Excluido

- Cambios de backend, de esquema o del contrato de Comanda (S2-01).
- Selector de mozo (S4-04, #225); el formulario queda preparado para sumarlo.
- Reemplazar el campo «N° de comanda» del diálogo de facturar abierto desde Pagos: sigue disponible como alternativa.
- Mostrar el número de mesa en lugar del ID en la tabla de comandas.

## Capacidades

### Nuevas

- `comanda-seleccion-catalogo`: selectores de mesa, producto y menú en el formulario de comanda y nombres en sus diálogos.
- `enlaces-entre-pantallas`: enlaces Salón → Atención y Atención → Pagos por parámetro de URL.

### Modificadas

- Ninguna (no hay specs archivadas del alta de comanda ni de facturar).

## Enfoque

- `atencion/api.ts` suma `listarMesas`, `listarProductos` y `listarMenusEjecutivos` con sus tipos en `atencion/types.ts` (D-16: sin importar otros módulos). Un hook `useCatalogoComanda` carga las listas una vez; S4-04 agrega el mozo como una lista más.
- `DetallePedidoFila` cambia el campo de ID por un `Select` según el tipo; como también lo usa `ModificarComandaDialog`, los dos formularios quedan con selectores.
- Un mapa id → nombre etiqueta los detalles en los tres diálogos.
- `AtencionPage` y `PagosPage` leen el parámetro con `useSearchParams` (patrón de `ProductosPage`), abren el diálogo y limpian el parámetro.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | `GET /mesas` no filtra por estado: se piden hasta 100 mesas y se filtran las `LIBRE` en el cliente. Si el salón supera 100 mesas, se acuerda con M3 un filtro `estado` en el backend. |
| S2 | Productos y menús: hasta 100 habilitados de cada uno; el selector muestra nombre y precio. |
| S3 | Para los nombres de los diálogos se piden también los deshabilitados; si un ID no aparece, se conserva «Producto #id». |
| S4 | La acción «Abrir comanda» solo aparece en mesas `LIBRE`. |
| S5 | «Facturar» aparece en toda comanda `CERRADA`; si ya tiene factura, el diálogo muestra el error del backend. |
| S6 | Un parámetro inválido abre el formulario sin preselección (mesa) o muestra el error de la vista previa (comanda). |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `frontend/src/modules/atencion/{api,types}.ts`, `components/`, `pages/AtencionPage.tsx` | Modificado; hook de catálogo nuevo |
| `frontend/src/modules/salon/components/MesasTabla.tsx`, `pages/SalonPage.tsx` | Modificado (acción «Abrir comanda») |
| `frontend/src/modules/pagos/components/{FacturarComandaDialog.tsx,useFacturarComanda.ts}`, `pages/PagosPage.tsx` | Modificado (comanda inicial) |
| Pruebas `*.test.tsx` de los tres módulos | Nuevas y ajustadas («Producto #11» pasa a nombre) |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Tocar módulos de otros integrantes (AGENTS.md, regla 3) | Avisar a Juan (M4) y a los responsables de M3 y M6 en el PR; cambios acotados a la UI. |
| Más de 100 registros en un listado | S1/S2; documentado en el PR. |
| Pruebas existentes que buscan «Producto #id» | Se actualizan junto con el cambio. |

## Plan de reversión

Revertir el PR. No hay migración ni cambios de backend.

## Criterios de éxito

- [ ] El formulario de comanda no pide ningún ID a mano.
- [ ] Los diálogos de comanda muestran nombres.
- [ ] Los dos enlaces abren el destino con los datos cargados.
- [ ] CI en verde y cobertura del frontend ≥ 60 %.

## Ronda de preguntas de la propuesta

Pendientes de la persona (el agente no pudo preguntar):

1. ¿El selector de mesa debe permitir elegir una mesa `OCUPADA` o `FUERA_DE_SERVICIO` de alguna forma, o solo `LIBRE` (S4)?
2. ¿Al modificar una comanda también se usan selectores (efecto de compartir `DetallePedidoFila`)?
3. ¿Una mesa `OCUPADA` debería enlazar a su comanda abierta, o queda para después?
4. ¿Se oculta «Facturar» en comandas ya facturadas aunque Atención no conozca ese dato (S5)?
