# Tareas · S4-06 Página de inicio operativa

Strict TDD: cada par empieza con la prueba que falla (rojo) y sigue con la implementación mínima que la pasa (verde). Los IDs entre paréntesis son escenarios de `specs/` (`K` caja, `I` panel, `N` acceso) y decisiones de `design.md` (tabla «Decisiones»).

## Decisión de contrato (conflicto spec/diseño)

`design.md` (sección «Contratos») nombra distinto los campos de `CajaDelDiaSalida`. **Gana la spec** (`specs/pagos-caja-del-dia/spec.md`), porque el contrato de la API vive en la spec (AGENTS.md, sección 4). Los nombres a usar en backend, frontend y pruebas son:

| Spec (se usa) | Diseño (se descarta) |
| --- | --- |
| `por_medio_pago` | `cobrado_por_medio` |
| `cantidad_cobros` (por medio) | `cantidad` |
| `monto` (por medio) | `total` |
| `total_cobrado` | `total_cobrado` (igual) |
| `adeudado: {cantidad_facturas, monto}` | `facturas_adeudadas` y `monto_adeudado` planos |
| `fecha`, `medio_pago_id`, `nombre`, `tipo` | igual |

El schema del elemento se llama `CobradoPorMedio` (nombre del diseño; la spec no lo fija) y se agrega `AdeudadoSalida {cantidad_facturas, monto}`. Los textos de la interfaz salen de la spec (I05, I08, I12, I17–I19): «No hay mesas con ese filtro», «No hay mesas registradas», «Todavía no hay cobros hoy», «No hay facturas adeudadas», «N facturas adeudadas», «Ir a Pagos», «Reintentar». Lo demás del diseño (firmas de repository/service, `ahora` inyectable, `CENTAVO`, `useAbrirDesdeUrl`) se mantiene.

## 1. Backend (M6 `pagos/`, solo lectura, sin migración)

- [x] 1.1 Rojo: `backend/tests/modules/pagos/test_caja_del_dia.py` con K01–K11 (`Factura` y `Cobro` con `fecha_hora` explícita, `fabrica_medio_pago`, `ahora` fijo, `TestClient`; borde 02:59/03:00 UTC para K02; importes como cadena). (K01–K11; decisiones: Día del restaurante, Medios dados de baja)
- [x] 1.2 Verde: `CobradoPorMedio`, `AdeudadoSalida` y `CajaDelDiaSalida` en `schemas.py`, con los nombres de la spec. (contrato spec)
- [x] 1.3 Verde: `sumar_cobros_por_medio(db, desde, hasta)` y `resumir_facturas_adeudadas(db) -> tuple[int, Decimal]` en `repository.py`, con `SUM`/`COUNT` + `GROUP BY`, `JOIN medios_pago` sin filtrar `eliminado` y `coalesce`. (K01, K03, K04, K07–K09; D-11, D-28)
- [x] 1.4 Verde: `obtener_caja_del_dia(db, ahora=None)` en `service.py`: intervalo semiabierto UTC de 00:00 a 00:00 de `ZONA_DEL_RESTAURANTE`, `total_cobrado` sumado de las filas, redondeo con `CENTAVO`, vacío con `[]` y `0.00`. (K02, K05, K06; decisión Total cobrado)
- [x] 1.5 Verde: `GET /reportes/caja-del-dia` en `router.py`, solo delega y devuelve el schema; verificar que una falla de la base responde `{"detalle": ...}` sin trazas. (K10, K11; D-25, D-26)
- [x] 1.6 Refactor: ordenar por `nombre`, funciones de hasta 50 líneas y complejidad 10; `ruff` y `lint-imports` en verde. (RNF-MAN-05)

## 2. Frontend: datos y funciones puras (`frontend/src/shared/components/inicio/`)

- [x] 2.1 Rojo: `mapaDelLocal.test.ts` (Vitest sin DOM): `clasificarMesas` (reserva solo sobre `LIBRE`, `OCUPADA`/`FUERA_DE_SERVICIO` conservan estado, hora más temprana), `agruparPorSector` (orden por número), `contarPorEstado` (Libres = `LIBRE` + `RESERVADA`), `filtrarMesas` combinado y recálculo por sector. (I04–I10, I12; decisión Mapa)
- [x] 2.2 Verde: `types.ts` (tipos mínimos duplicados, `EstadoVisibleMesa`, `MesaDelMapa`, `CajaDelDia` con los nombres de la spec) y `mapaDelLocal.ts`. (D-15; decisión Tipos y fecha)
- [x] 2.3 Rojo: `api.test.ts` con `clienteHttp` simulado: pagina `/mesas` con `limit=100` hasta `total` (120 mesas = 2 páginas), pide `/reservas?fecha=<hoy>&estado=ACTIVA`, propaga el primer error de mesas o reservas, `obtenerCajaDelDia`. (I11, I13, I14)
- [x] 2.4 Verde: `api.ts` con `obtenerMapaDelLocal(fecha)`, `obtenerCajaDelDia` y `hoyLocal()` (sin `toISOString()`). (D-16)

## 3. Frontend: hook `?nueva=1`

- [x] 3.1 Rojo: `frontend/src/shared/hooks/useAbrirDesdeUrl.test.tsx` con `MemoryRouter`: `nueva=1` llama `abrir` y borra solo ese parámetro con `replace`; `nueva=abc`/`0` no hace nada; conserva `mesa=5`; no reabre al re-renderizar. (N01, N03, N04, N05, N08, N09; decisión `?nueva=1`)
- [x] 3.2 Verde: `useAbrirDesdeUrl.ts` con la firma `useAbrirDesdeUrl(parametro, abrir)`.

## 4. Frontend: bloques de `/`

- [x] 4.1 Rojo: `AccesosRapidos.test.tsx`: enlaces a `/atencion?nueva=1` y `/reservas?nueva=1`, visibles sin datos. (I01–I03)
- [x] 4.2 Verde: `AccesosRapidos.tsx` con `Link` con estilo de botón. (decisión Accesos)
- [x] 4.3 Rojo: `MapaDelLocal.test.tsx` (con `api` simulado vía `vi.mock`): carga (I16), agrupación por sector, cantidades, filtros por estado y sector, filtros combinados con «No hay mesas con ese filtro» y quitar filtro, vacío «No hay mesas registradas», error con `Alert` y «Reintentar» que recarga, error de reservas. (I04–I08, I12–I16)
- [x] 4.4 Verde: `MapaDelLocal.tsx`, `FiltrosDelMapa.tsx` (`Select` + `Tabs` con cantidades) y `MesaDelMapa.tsx` (número, capacidad, estado, hora de reserva). Reutilizar `shared/components/ui/` antes de crear componentes. (I09, I10)
- [x] 4.5 Rojo: `EstadoDeCaja.test.tsx`: lista de medios con monto, total, «2 facturas adeudadas», enlace «Ir a Pagos» a `/pagos`, sin cobros («Todavía no hay cobros hoy» y `$0,00`), sin deuda, error con «Reintentar» y carga; formato con el mismo formateador de Pagos (si no está en `shared/`, duplicarlo mínimo sin importar de `modules/`). (I17–I21)
- [x] 4.6 Verde: `EstadoDeCaja.tsx` con los campos `por_medio_pago`, `cantidad_cobros`, `monto`, `total_cobrado` y `adeudado`.
- [x] 4.7 Rojo: `Inicio.test.tsx`: los tres bloques se renderizan, fallan y se reintentan de forma independiente (el error de uno no oculta los demás). (I03, I13, I20)
- [x] 4.8 Verde: `Inicio.tsx` reemplaza las seis tarjetas estáticas; accesos en `PageHeader.acciones`. (decisión Tarjetas estáticas)

## 4b. Frontend: plano generado del mapa (pedido de la persona, como la maqueta)

- [x] 4b.1 Rojo: `mapaDelLocal.test.ts` con `formaDeMesa`, `distribuirMesas`, `cumpleEstado` y `describirMesa`; `MapaDelLocal.test.tsx` con un solo plano con zonas, grilla generada (`left`/`top`), forma y sillas por capacidad, colores por estado, píldora de la hora, leyenda, atenuado por estado y compacto/grande por sector. (I04, I06, I07, I09, I22–I24; decisión Plano generado)
- [x] 4b.2 Verde: `distribuirMesas`, `formaDeMesa`, `cumpleEstado` y `describirMesa` en `mapaDelLocal.ts`; `PlanoDelLocal.tsx` (paredes y zonas), `MesaDelMapa.tsx` (forma, sillas, estado; luego botón, ver 4c), `LeyendaDelMapa.tsx`; `MapaDelLocal.tsx` dibuja el plano y atenúa en lugar de ocultar.
- [x] 4b.3 Comprobación visual en el navegador: escritorio (todos los sectores, uno solo, atenuado) y 375 px sin desplazamiento horizontal. (I25)
- [x] 4b.4 Rojo: `planoDelLocal.test.ts` (`escalaDelPlano`, `asignarTipos`, `distribuirEnArea`, `dibujarPuerta`, `partirPared`, `generarPlano`: cocina y barra sin mesas encima, terraza curva con paso, salas alternadas con puerta, ambiente solo cerrado), `useAnchoDelElemento.test.tsx` y en `MapaDelLocal.test.tsx` el contorno (Entrada, Cocina, Barra, puertas, ventanas, baranda) y un solo ambiente al filtrar. (I04, I07, I26–I28; decisión Plano generado con contorno irregular)
- [x] 4b.5 Verde: `planoDelLocal.ts`, `useAnchoDelElemento.ts`, `ContornoDelPlano.tsx` (SVG); `PlanoDelLocal.tsx` posiciona mesas y nombres en px; `MesaDelMapa` recibe la escala. Se quita `distribuirMesas` (reemplazada por `distribuirEnArea`).
- [x] 4b.6 Comprobación visual con datos reales y con 18 y 23 mesas simuladas (escritorio, un sector, 375 px): paredes visibles, ninguna mesa sobre paredes o bloques, nada recortado. (I25–I28)

## 4c. Frontend: detalle de la mesa (pedido de la persona, como `#detalle-mesa` de la maqueta)

- [x] 4c.1 Rojo: `detalleDeMesa.test.ts` (`armarComanda`, `horaDelDia`), `api.test.ts` (`obtenerComandaAbierta`, `obtenerCliente`), `DetalleDeMesaDialog.test.tsx` (un caso por estado, carga, error y reintento, cliente no encontrado, cerrar) y `MapaDelLocal.test.tsx` (mesas como botones; elegir marca y abre, cerrar desmarca). Fixtures de reservas con `id`, `cliente_id` y `cantidad_personas`. (I29–I36)
- [x] 4c.2 Verde: `ReservaActiva` completa y `MesaDelMapa.reserva`; `detalleDeMesa.ts`; `obtenerComandaAbierta` y `obtenerCliente` en `api.ts`; `DetalleDeMesaDialog.tsx`, `ComandaDeLaMesa.tsx`, `ReservaDeLaMesa.tsx`; `MesaDelMapa` como `button` con contorno de selección; `estilos.ts` (enlace con aspecto de botón, compartido con `AccesosRapidos`). (decisión Detalle de la mesa)
- [x] 4c.3 Comprobación visual con datos reales: detalle de mesa ocupada y con reserva (escritorio y 375 px), apertura con teclado (Enter) y cierre con Escape.
- [x] 4c.4 Seguimiento: con S4-03 integrado, «Nueva comanda» del detalle lleva a `/atencion?mesa=<id>` y abre el alta con la mesa elegida.

## 5. Frontend: apertura de altas en M4 y M5 (avisar a sus responsables)

- [x] 5.1 Rojo: en `AtencionPage.test.tsx` y `AtencionClientes.test.tsx`, `renderizarPagina(ruta)` con `MemoryRouter` (reutilizar el envoltorio de S4-03 si ya está integrado) y pruebas N01–N05. (N01–N05)
- [x] 5.2 Verde: `AtencionPage.tsx` llama `useAbrirDesdeUrl('nueva', () => setAlta(true))` (~2 líneas).
- [x] 5.3 Rojo: en `ReservasPage.test.tsx`, pruebas N06–N09 con `MemoryRouter`. (N06–N09)
- [x] 5.4 Verde: `ReservasPage.tsx` llama `useAbrirDesdeUrl('nueva', () => setPanel('alta'))` (~2 líneas).
- [x] 5.5 Actualizar `App.test.tsx` para la nueva `/` (sin tarjetas estáticas; mocks de `inicio/api`) y arreglar los demás tests que rendericen `Inicio` o las páginas sin router.

## 6. Verificación (AGENTS.md sección 7)

- [x] 6.1 Backend, desde `backend/`: `ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [x] 6.2 Frontend, desde `frontend/`: `npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build` (cobertura ≥ 60 %, 0 advertencias).
- [x] 6.3 Comprobar a mano que no hay importaciones entre módulos (`inicio/` no importa de `modules/`), ni `any`, ni `fetch` en componentes.

## 7. Notas del PR

- [ ] 7.1 Diferencias con la maqueta: el detalle de la mesa no tiene «Cerrar y cobrar» y «Nueva comanda» no preselecciona la mesa (S4-03); contorno y mesas generados (no hay posición ni geometría del local); filtro de estado con pestañas; la caja se agrupa por medio de pago (nombre) y no por tipo; sin actualización automática; solo hoy.
- [ ] 7.2 Aviso a los responsables: M4 (Juan Ignacio Riquelme, `AtencionPage`), M5 (Federico Cabaña, `ReservasPage`) y M6 (Héctor Sánchez, sin responsable en S4: endpoint nuevo en `pagos/`); posible conflicto con S4-03 en `AtencionPage` (rebase).
- [ ] 7.3 Dejar anotados los supuestos 1, 4 y 5 de la propuesta, el supuesto de la hora más temprana y el de zona horaria UTC-3, y la decisión de nombres de campos (spec sobre diseño).
- [ ] 7.4 Anotar el exceso del punto de control del frontend (~1 000 líneas contra 800). Es un punto de control, no un bloqueo: el cambio no se divide.

## Presupuesto de revisión

| Lado | Pronóstico | Límite |
| --- | --- | --- |
| `backend/` | ~250 líneas (≈90 de código y ≈160 de pruebas) | 800 |
| `frontend/` | ~1 000 líneas agregadas y 93 borradas (≈480 de código y ≈505 de pruebas) | 800 (excede) |

Entrega: un solo PR (`single-pr`). El frontend supera el punto de control de 800 líneas; por regla del proyecto no se divide y el exceso se anota en el PR (7.4). Orden: el backend (1) es independiente y puede hacerse primero; el frontend sigue secuencial 2 → 3 → 4 → 5, salvo 2.x y 3.x que pueden ir en paralelo; 5 depende de 3.

## Resultado de la implementación (apply)

- Medio de pago en la caja: el frontend usa `formatearMoneda` de `shared/lib/format.ts` (formato `es-AR`, `$ 1.500,00`), no el `$ <monto>` plano de Pagos, para cumplir «moneda local» (I21) y «$0,00» (I18). Supuesto anotado para el PR.
- K10: `main.py` no tenía manejador de fallas no controladas y respondía texto plano; se agregó `manejar_error_inesperado` (`500 {"detalle": "Error interno del servidor"}`), un cambio de una función en `app/main.py` (compartido).
- Exceso del punto de control del frontend: aprox. 1 360 líneas agregadas (de ellas ~800 de pruebas) contra 800. Es un punto de control, no un bloqueo; el cambio no se divide.
