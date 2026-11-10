# Apply progress · S4-06 Página de inicio operativa

**Modo:** Strict TDD · **Entrega:** single-pr (el frontend excede el punto de control de 800 líneas; aceptado, no se divide) · **Estado:** 28/32 tareas completas; las 4 restantes (7.1-7.4) son notas del PR, ya registradas aquí (ver `tasks.md`).

## Evidencia de ciclo TDD

| Tarea | Prueba | Rojo | Verde | Refactor |
| --- | --- | --- | --- | --- |
| 1.1-1.6 Caja del día (backend) | `backend/tests/modules/pagos/test_caja_del_dia.py` (14 pruebas, K01-K11) | 14 errores (la prueba referencia `service._ahora`, que no existía); luego K10 falló (500 con texto plano) | 14 pasan tras schemas, repository, service, router y el manejador de `main.py` | orden por nombre, funciones cortas, `ruff` y `lint-imports` en verde |
| 2.1-2.2 Mapa (funciones puras) | `inicio/mapaDelLocal.test.ts` (11) | falla de importación (módulo inexistente) | 11 pasan | tipos separados en `types.ts` |
| 2.3-2.4 `api.ts` | `inicio/api.test.ts` (6) | falla de importación | 6 pasan | `obtenerTodas` genérico; lint `no-useless-assignment` corregido |
| 3.1-3.2 Hook `?nueva=1` | `hooks/useAbrirDesdeUrl.test.tsx` (6) | falla de importación | 6 pasan | `abrir` por ref para no reabrir al renderizar |
| 4.1-4.8 Bloques de `/` | `AccesosRapidos`, `MapaDelLocal`, `EstadoDeCaja`, `Inicio` tests (2 + 8 + 6 + 2) | fallas de importación y `Inicio` con tarjetas viejas | 18 pasan | `ErrorDelBloque` común |
| 4b.1-4b.3 Plano generado del mapa | `inicio/mapaDelLocal.test.ts` (+6: forma, grilla 2 y 3 columnas, vacío, `cumpleEstado`, `describirMesa`) y `MapaDelLocal.test.tsx` (13, reescrito para el plano) | 15 fallas (funciones inexistentes; sin `role="img"`, sin grupo «Plano del local», sin atenuado) | 44 pasan en `inicio/` | `SinCoincidencias` aparte para que `Mapa` no pase de 50 líneas; alto de fila ajustado tras la comprobación visual |
| 4b.4-4b.6 Contorno irregular del plano | `inicio/planoDelLocal.test.ts` (19), `inicio/useAnchoDelElemento.test.tsx` (2), `MapaDelLocal.test.tsx` (+2 y 1 adaptada) | módulo y hook inexistentes; 3 fallas de componente (sin SVG, sin Entrada/Cocina/Barra, posiciones en %) | 64 pasan en `inicio/` | alto de fila 124 → 130 tras ver una píldora pegada a las sillas de la fila de arriba; ventanas con línea de vidrio para que se vean |
| 4c.1-4c.3 Detalle de la mesa | `detalleDeMesa.test.ts` (4), `api.test.ts` (+6), `DetalleDeMesaDialog.test.tsx` (9), `MapaDelLocal.test.tsx` (+1, mesas como botones) | 15 fallas y 2 archivos sin módulo (`detalleDeMesa`, `DetalleDeMesaDialog`); luego 2 fallas de `horaDelDia` | 84 pasan en `inicio/` | `PlanoConDetalle` aparte para que `Mapa` no pase de 50 líneas; hora de 24 h tras ver «06:39 p. m. h» en el navegador |
| 5.1-5.4 `?nueva=1` en M4 y M5 | `AtencionPage.test.tsx` (+5), `ReservasPage.test.tsx` (+4); `AtencionClientes.test.tsx` adaptado | 5 fallas (`nueva=1` no abría el alta) | 67 pasan (3 archivos) | `renderizarPagina(ruta)` con `MemoryRouter` |
| 5.5 `App.test.tsx` | prueba de `/` con `fetch` simulado | n/a (adaptación a la nueva `/`) | pasa | n/a |

Red de seguridad previa: no hubo pruebas rotas previas (el worktree parte de `ccd74f6`).

## Work Unit Evidence

| Evidencia | Valor |
| --- | --- |
| Prueba focalizada | `pytest tests/modules/pagos/test_caja_del_dia.py`: 14 passed; `vitest run src/shared/components src/shared/hooks src/modules/atencion/pages src/modules/reservas/pages/ReservasPage.test.tsx`: pasan |
| Arnés de ejecución | Suite completa: backend `pytest` 1963 passed, cobertura 98,56 %; frontend `npm run test:coverage` 106 archivos, 1170 pruebas, cobertura 81,07 % de líneas; `npm run build` OK |
| Límite de reversión | Backend: `pagos/{schemas,repository,service,router}.py`, `app/main.py` (manejador) y `test_caja_del_dia.py`. Frontend: `shared/components/inicio/`, `Inicio.tsx`, `shared/hooks/useAbrirDesdeUrl*`, 2 líneas en `AtencionPage.tsx` y `ReservasPage.tsx` |

## Desvíos y supuestos

- La spec gana sobre el diseño en los nombres de `CajaDelDiaSalida` (ver `tasks.md`).
- `app/main.py` (compartido): se agregó el manejador de `Exception` para cumplir K10 (`{"detalle": ...}` sin trazas). Avisar al equipo.
- Formato de importes: `formatearMoneda` compartido (`$ 1.500,00`), no el `$ <monto>` de Pagos.
- Plano generado con contorno irregular (decisión en `design.md`): ni `Mesa` ni el local tienen geometría; salón en L con entrada, cocina y barra, salas alternadas, terraza curva; grilla por ambiente, forma por capacidad, el filtro de estado atenúa en lugar de ocultar (I06 cambió); cada mesa es un botón que abre su detalle (R4). El tipo de ambiente sale del nombre y de la cantidad de mesas (`Supuesto:` en la spec).
- Detalle de la mesa (R4): carga perezosa por `inicio/api.ts`; sin `GET /clientes/{id}` en M4 se recorren las páginas de `/clientes`; número de comanda = `id`; importe con descuento como Atención al Público; sin «Cerrar y cobrar»; «Nueva comanda» lleva a `/atencion?mesa=<id>` y preselecciona la mesa (tarea 4c.4, hecha al integrar S4-03).
- Tablas del mapa: «Todas (n)» se agregó como pestaña para quitar el filtro de estado.
- Sin migración de Alembic.
- Pendiente para el PR (tareas 7.1-7.4): diferencias con la maqueta, aviso a responsables de M4, M5 y M6 y posible conflicto con S4-03 en `AtencionPage`/sus pruebas; supuestos 1, 4 y 5, hora de reserva más temprana y UTC-3.
- Exceso del punto de control del frontend (~1 360 líneas contra 800): aceptado.
