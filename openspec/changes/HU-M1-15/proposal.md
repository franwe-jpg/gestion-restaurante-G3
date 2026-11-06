# Propuesta: HU-M1-15 Reporte de productos más vendidos por período

- **Issue:** [#79](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/79) HU-M1-15. Cambio `HU-M1-15`, rama `feature/HU-M1-15-reporte-productos-mas-vendidos`. Responsable: Franco Martín Soler (M1).
- Reporte del módulo M1 previsto para el Sprint 4 (`SPRINT-0/Plan-de-trabajo-Sprint.md:98,293`). El diagrama de clases define el servicio `ReporteProductosMasVendidos` (`fechaDesde`, `fechaHasta ≥ fechaDesde`) y la línea `LineaReporteProductos` (`producto`, `cantidadPedida`, `diasMasPedidos`, `franjasMasPedidas` con horas de 0 a 23).
- Los criterios de aceptación del issue no se pudieron leer en esta fase; la spec DEBE trazarlos uno por uno desde #79.

## Intención

Las comandas ya registran qué productos se piden y cuándo (M4), pero el responsable de la carta no tiene cómo saber qué se vende más, ni en qué días y horarios. El reporte responde eso para un período elegido, agrupado como la carta.

## Alcance

### Incluido

- Backend: dos rutas de solo lectura en `productos/` que reciben `fecha_desde` y `fecha_hasta`: el JSON completo agrupado por `Seccion` y el PDF detallado (`/pdf`, `application/pdf`, descarga con el período en el nombre). Mismas validaciones y 422.
- PDF generado en el backend con `fpdf2==2.9.0` (dependencia nueva) y un ayudante de formato común en `backend/app/shared/`, reutilizable por los seis reportes: título, período, fecha de generación, texto explicativo del cálculo y una tabla por sección con los productos deshabilitados marcados.
- Una función nueva en `backend/app/modules/atencion/service.py` (M4), `sumar_productos_pedidos`, que agrega en la base y devuelve sumas por producto, día y hora locales (`CantidadPedidaPorFranja`).
- Una migración de Alembic que agrega el índice `ix_comandas_fecha_hora` en `comandas` (tabla de M4), por RNF-REN-05.
- Frontend: pantalla `/reportes/productos-mas-vendidos` con selector de período, botón «Generar», gráfico de barras con SOLO los 5 productos más pedidos (en `ChartContainer`), el texto «El detalle completo está en el reporte PDF.», el botón «Descargar PDF» y estado vacío «no hay datos». La maqueta no tiene pantalla de reportes: se sigue el estilo de las pantallas existentes y la diferencia se anota en el PR.
- Página compartida `/reportes` en `frontend/src/shared/` con ítem en el menú lateral y una tarjeta por reporte (título, descripción, «Generar»); solo enlaza rutas. Esta HU agrega la tarjeta de M1; los demás integrantes agregan las suyas.
- Una prueba por criterio de aceptación en cada lado.

### Excluido

- Menús ejecutivos y promociones como ítem (reporte de M2, HU-M2-10, #81).
- Exportación a CSV, totales en dinero, autenticación y roles.
- Las tarjetas de los reportes de los otros módulos (las agrega cada responsable).

## Capacidades

### Nuevas

- `carta-reporte-mas-vendidos`: consulta del reporte por período (validación, agregación, zona horaria, empates), salidas JSON y PDF, la pantalla con los 5 más pedidos y la página compartida `/reportes`.

### Modificadas

- Ninguna. La función nueva de M4 no cambia requisitos de Comanda; se describe como dependencia en la spec.

## Enfoque

- **M4 (Juan Ignacio Riquelme):** `atencion.service.sumar_productos_pedidos` agrega en SQLite (D-11, RNF-REN-05) las líneas de `DetalleComanda` con `producto_id` no nulo, de comandas no ANULADA, dentro del intervalo UTC pedido, y devuelve filas `CantidadPedidaPorFranja` (`producto_id`, `dia_semana`, `hora`, `cantidad`). Más una migración con el índice `ix_comandas_fecha_hora`. **Toca un módulo ajeno: hay que avisar a Juan y que él lo revise** (AGENTS.md §9.3).
- **M1:** `productos.service` importa `atencion.service` (permitido por import-linter; no hay ciclo), calcula total, días y franjas con más pedidos y agrupa por sección. Un ayudante común en `shared/` arma el PDF con `fpdf2`.
- **Frontend:** `api.ts`, `types.ts`, la pantalla con el gráfico de los 5 más pedidos, la página compartida `/reportes`, el ítem del menú lateral y las rutas en `App.tsx`. **Toca `shared/`, el menú lateral y `App.tsx`: hay que avisar al equipo.**

## Supuestos

| # | Supuesto: |
| --- | --- |
| S100 | Fuente de datos: la función de M4 descrita en el Enfoque. Decisión de la persona; Juan la valida. |
| S101 | `Comanda.fecha_hora` está en UTC (`InstanteUTC`). Día y franja se calculan en hora local fija UTC−3, como `ZONA_DEL_RESTAURANTE` de `reservas/service.py`. Sin tocar `shared/`; la ubicación de la constante la decide el diseño. |
| S102 | Cuentan las comandas ABIERTA y CERRADA; ANULADA no (HU-M4-06, #54). |
| S103 | No cuentan las líneas de menú ejecutivo (`menu_ejecutivo_id`). Las líneas de producto con `promocion_id` cuentan normal. Cuentan todas las categorías: PLATO, POSTRE, BEBIDA y MENU_DEL_DIA. |
| S104 | Ambas fechas obligatorias; `fecha_hasta` incluye el día completo en hora local. |
| S105 | `cantidadPedida` es la suma de `cantidad` de las líneas, no la cantidad de líneas. Día y franja más pedidos se calculan con esa misma suma. |
| S106 | Salida agrupada por `Seccion` (orden como la carta); dentro de cada una, productos por `cantidadPedida` descendente. Solo productos con pedidos y solo secciones con alguno. Aparecen también los productos hoy DESHABILITADO. Sin paginación: es un reporte, no un listado D-27. |
| S107 | Empate en día o franja: se muestran todos los empatados. |
| S108 | Falta `fecha_desde` o `fecha_hasta` → 422 indicando cuál; `fecha_desde > fecha_hasta` → 422 período inválido; período sin datos → 200 con resultado vacío y la pantalla muestra «no hay datos». |
| S109 | Productos con igual cantidad en una sección: desempate por `nombre` ascendente y luego `producto_id`. |
| S110 | Sin amplitud máxima del período. |
| S111 | Reemplazado por S117. |
| S116 | La constante UTC−3 se duplica en `productos` y se unifica en `shared/` más adelante con M5. |
| S117 | El acceso es la página compartida `/reportes` con ítem en el menú lateral (no un botón en Productos). |
| S118 | Período sin datos en el PDF → 200 con un PDF que lo dice (no 404), para que el botón siempre funcione. |
| S119 | `fpdf2==2.9.0` es una dependencia nueva con versión exacta; el equipo la acuerda (AGENTS.md §9.7). |
| S120 | CA 1, 5 y 6 se cumplen en el PDF y el JSON; la pantalla muestra solo los 5 más pedidos. El equipo valida esta lectura. |
| S121 | Los 5 más pedidos se toman entre todas las secciones; desempate por nombre y `producto_id`; se corta en 5. |
| S122 | Índices `ix_comandas_fecha_hora` e `ix_detalles_comanda_comanda_id` por migración sobre tablas de M4; se coordina con Juan; el `downgrade` los elimina. |
| S123 | PDF A4 vertical, período en dd/mm/aaaa, fecha de generación en hora local, franjas como «21:00 a 22:00». |
| S125 | El PDF muestra un resumen (unidades pedidas, productos distintos, más vendido) cuando hay datos; no lo pide la HU. |
| S124 | Las tarjetas de `/reportes` son datos estáticos registrados en `shared/`, sin importar módulos. |

## Ronda de preguntas de la propuesta

Ritmo automático: se avanza con los supuestos.

Resueltas como supuestos: desempate por nombre (S109), sin amplitud máxima (S110) y acceso por la página compartida `/reportes` (S117).

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/atencion/{repository,service}.py` y sus pruebas | Modificado (módulo de Juan: consulta agregada y función) |
| `backend/alembic/versions/` | Nuevo (índice `ix_comandas_fecha_hora` sobre una tabla de M4) |
| `backend/app/modules/productos/{schemas,router,service}.py`, `reporte.py`, `backend/tests/modules/productos/` | Modificado y nuevo |
| `backend/app/shared/` (ayudante de formato de PDF) y `backend/requirements.txt` (`fpdf2==2.9.0`) | Nuevo y modificado (compartido: avisar al equipo) |
| `frontend/src/modules/productos/` (`api.ts`, `types.ts`, página, componentes y pruebas) | Nuevo y modificado |
| `frontend/src/shared/` (página `/reportes`) y el menú lateral | Nuevo y modificado (compartido: avisar al equipo) |
| `frontend/src/App.tsx` | Modificado (compartido: rutas) |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| Día o franja mal calculados por la zona horaria (R18). | Media | Pruebas con comandas cerca de medianoche UTC y en el borde de `fecha_hasta`. |
| Juan no está de acuerdo con la función en M4 o cambia el contrato de Comanda. | Media | Avisarle antes del apply; función mínima y con prueba propia. |
| Conflicto en `App.tsx`, el menú lateral o `shared/` con otros módulos. | Media | Cambios mínimos; avisar al equipo antes del apply y en el PR. |
| El equipo no acepta `fpdf2` o el ayudante común en `shared/`. | Media | Acordarlo antes del apply (S119); el ayudante es independiente del resto. |
| La migración del índice choca con otra migración de M4. | Baja | Coordinar con Juan; revisar la cabeza de Alembic antes de crearla. |
| PDF pesado con períodos largos. | Baja | La base agrega (máximo productos × 7 × 24 filas); sin límite de amplitud (S110). |

## Plan de reversión

Las rutas son de solo lectura. El único cambio de esquema es el índice `ix_comandas_fecha_hora`: el `downgrade` de su migración lo elimina sin tocar datos. Revertir el merge en `develop` y, si el índice ya se aplicó, correr `alembic downgrade -1`. Quitar `fpdf2` de `requirements.txt` al revertir.

## Dependencias

- Aprobación del equipo para `fpdf2==2.9.0` (AGENTS.md §9.7) y aviso por los cambios en `shared/`, el menú lateral y `App.tsx`.
- Visto bueno de Juan sobre la migración del índice en `comandas`.
- Modelos `Comanda` y `DetalleComanda` de M4 (`backend/app/modules/atencion/models.py`, ya en `develop`). `EstadoComanda.ANULADA` ya existe en `backend/app/shared/contratos/comanda.py`; si la anulación (HU-M4-06, #54) todavía no está implementada, el reporte no se bloquea: simplemente no habrá comandas anuladas.
- Visto bueno de Juan Ignacio Riquelme sobre la función de `atencion.service` y la consulta agregada.

## Criterios de éxito

- [ ] Cada criterio de aceptación de #79 tiene una prueba que pasa en el backend y en el frontend.
- [ ] Las pruebas de borde de zona horaria, ANULADA, menú ejecutivo y empates pasan.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] `EXPLAIN QUERY PLAN` de la consulta agregada no muestra un recorrido completo de `comandas`.
- [ ] El PDF se descarga con el período en el nombre y contiene el detalle por sección.
- [ ] Juan aprueba la función y el índice de M4, el equipo acuerda `fpdf2` y valida S100 a S124.
