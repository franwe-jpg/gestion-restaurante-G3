# Exploración: S4-06 Página de inicio con accesos rápidos, mapa del local y estado de la caja

Issue: #213. Fuente visual: `SPRINT-2/S2-04-maqueta/index.html` (prioridad más baja, AGENTS.md sección 2).

## Estado actual

- `/` renderiza `frontend/src/shared/components/Inicio.tsx` (ruta índice en `frontend/src/App.tsx`): seis tarjetas estáticas, una por módulo. No consulta la API.
- `ReportesPage.tsx` y `reportes.ts` (en `shared/components/`) tampoco consultan la API: solo conocen rutas. No hay hoy en `shared/` una página que lea datos de módulos.
- D-15 y S1-02: un módulo no importa archivos de otro y `shared/` no importa de `modules/`. D-16: toda llamada pasa por un `api.ts` apoyado en `shared/api/client.ts` (`clienteHttp`). ESLint solo prohíbe `fetch` fuera de `client.ts`; no hay regla automática de límites entre carpetas, se cumple por convención.

## Datos disponibles por bloque

| Bloque | Fuente | Estado |
| --- | --- | --- |
| Mapa: mesas, sector y estado | `GET /api/v1/mesas` (M3): `MesaSalida {id, numero, capacidad, sector {id, nombre}, estado}`; `estado` ∈ `LIBRE`, `OCUPADA`, `FUERA_DE_SERVICIO`; ordenadas por sector y número; paginado, `limit` máximo 100 | Existe |
| Mapa: reservas de hoy | `GET /api/v1/reservas?fecha=YYYY-MM-DD&estado=ACTIVA` (M5): `ReservaSalida {mesa_id, fecha, hora, estado, ...}`; paginado | Existe |
| Caja: cobrado hoy por medio de pago | `Cobro {monto, fecha_hora (UTC), medio_pago_id}` y `MedioPago {nombre, tipo}` (M6) | Falta endpoint |
| Caja: adeudado | `Factura {estado ADEUDADA/PAGADA, saldo_pendiente}` (M6); `GET /facturas` es paginado y no agrega | Falta endpoint |
| Accesos rápidos | `AtencionPage` (M4) y `ReservasPage` (M5) abren el alta con estado local (`setAlta(true)`, `setPanel('alta')`); ninguna lee parámetros de la URL | Falta enganche |

## Hallazgos

- Calcular la caja en el frontend exigiría pedir cada factura (`GET /facturas/{id}`) para conocer sus cobros: viola D-11 y D-28. Hace falta un endpoint de solo lectura en M6 con agregación en la base.
- El día del restaurante se calcula con `ZONA_DEL_RESTAURANTE` (UTC-3) en `pagos/comprobante_pdf.py`, `reservas/service.py` y `productos/reporte.py`; los cobros se guardan en UTC. El frontend usa la fecha local del navegador (`reservas/fechas.ts` → `hoyLocal()`, sin `toISOString()`).
- La maqueta cuenta «Libres» incluyendo las mesas libres con reserva (11 = 8 libres + 3 con reserva) y muestra la caja agrupada por tipo de medio (Efectivo, Tarjeta, Transferencia, Billetera virtual).
- La maqueta incluye un detalle de mesa en modal (comanda abierta, entregas, «Cerrar y cobrar»); el issue no lo pide. Después la persona lo pidió y se agregó (R4 de `inicio-panel`, sin «Cerrar y cobrar»).
- S4-03 (otra rama) agrega a `AtencionPage` la lectura de `?mesa=<id>`. Un `?nueva=1` en la misma página puede chocar en el merge, pero es un conflicto chico.
- Responsables: M3 (Giuliano) y M6 (Héctor) no están en S4; M4 (Juan Ignacio) y M5 (Federico) sí.

## Opciones para el acceso rápido

| Opción | Ventaja | Costo |
| --- | --- | --- |
| A. `/atencion?nueva=1` y `/reservas?nueva=1`, cada página abre su alta y limpia el parámetro | Cumple el `Supuesto:` del issue | Toca M4 y M5 (unas líneas y una prueba por página) |
| B. Solo navegar a `/atencion` y `/reservas` | No toca módulos ajenos | El usuario hace un clic más; no cumple el `Supuesto:` |

Recomendada: A, coordinada con Juan Ignacio y Federico y anotada en el PR.

## Riesgo principal

Un endpoint nuevo en M6 sin su responsable. Se mitiga con un cambio mínimo (un endpoint, una consulta de agregación, pruebas) y aviso explícito al equipo.
