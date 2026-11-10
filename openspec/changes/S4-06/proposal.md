# Propuesta: S4-06 Página de inicio operativa

Issue: #213. `Supuesto:` ninguna HU lo pide; viene de la maqueta. Vive en `shared/` y es del equipo.

## Intención

`/` muestra seis tarjetas estáticas. El encargado necesita ver de un vistazo qué mesas están libres, ocupadas o reservadas, cuánto se cobró hoy y abrir una comanda o una reserva en un clic.

## Alcance

### Incluido
- Accesos rápidos «Nueva comanda» → `/atencion?nueva=1` y «Nueva reserva» → `/reservas?nueva=1`; cada página abre su alta y quita el parámetro.
- Mapa del local: plano generado con un ambiente por sector, filtros por sector y por estado con cantidades.
- Detalle de la mesa (como `#detalle-mesa` de la maqueta): al elegir una mesa se abre un diálogo según su estado (comanda abierta, reserva, libre, fuera de servicio).
- Estado de la caja: cobrado hoy por medio de pago, total, adeudado (cantidad y monto) y enlace a Pagos.
- Endpoint `GET /api/v1/reportes/caja-del-dia` en M6, con agregación en la base (D-11, D-28).
- Carga, error con reintento y vacío independientes por bloque.

### Excluido
- «Cerrar y cobrar» desde el detalle de la mesa; preseleccionar la mesa en «Nueva comanda» (S4-03); actualización automática; otro día que no sea hoy.
- Cambios en los endpoints de M3 y M5.

## Supuestos (default recomendado)

1. «Con reserva» = mesa `LIBRE` con una reserva `ACTIVA` hoy; muestra la hora más próxima. Una mesa ocupada o fuera de servicio conserva su estado.
2. «Libres» incluye las libres con reserva (como la maqueta).
3. Hoy = fecha local del navegador en el frontend; en el backend, zona del restaurante UTC-3.
4. Caja agrupada por `MedioPago` (nombre), solo los que tienen cobros hoy, incluidos los dados de baja.
5. Adeudado = facturas `ADEUDADA` de cualquier fecha; monto = suma de `saldo_pendiente`.
6. Los sectores salen de las mesas; las mesas se piden página por página hasta completar `total`.

## Capacidades

### Nuevas
- `inicio-panel`: accesos rápidos, mapa del local y estado de la caja en `/`.
- `pagos-caja-del-dia`: resumen de cobros de hoy y deuda pendiente.

### Modificadas
- Ninguna (las pantallas de M4 y M5 no tienen spec en `openspec/specs/`).

## Enfoque

- Frontend en `frontend/src/shared/components/inicio/` con `api.ts` y `types.ts` propios sobre `clienteHttp` (D-16), tipos mínimos duplicados y sin importar de `modules/` (D-15). La clasificación de mesas es una función pura con pruebas.
- Backend en `pagos/`: `router → service → repository`, schema de salida nuevo, sin migración.

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `frontend/src/shared/components/Inicio.tsx`, `inicio/` | Modificado / Nuevo |
| `frontend/src/modules/atencion/pages/AtencionPage.tsx` (M4) | Lee `?nueva=1` |
| `frontend/src/modules/reservas/pages/ReservasPage.tsx` (M5) | Lee `?nueva=1` |
| `backend/app/modules/pagos/` (M6), `backend/tests/modules/pagos/` | Endpoint nuevo |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| M6 sin responsable en S4 | Cambio mínimo y aviso en el PR |
| Conflicto con S4-03 en `AtencionPage` | Rebase; misma lectura de parámetros |
| Frontend cerca de 800 líneas | Punto de control; no se divide |

## Reversión

Revertir el PR; sin esquema nuevo. Lo de M4 y M5 se revierte solo.

## Dependencias

HU-M6-01 y HU-M6-02 (en `develop`). Acuerdo con Juan Ignacio (M4) y Federico (M5).

## Criterios de éxito

- [ ] `/` muestra accesos y mapa con datos reales; la caja de hoy o la nota de pendiente en el PR.
- [ ] Una prueba de camino feliz y una de error o límite por bloque (sin mesas, sin cobros).
- [ ] Sin importaciones entre módulos; CI verde; cobertura 60 % y 70 %.
- [ ] Diferencias con la maqueta anotadas en el PR.

## Ronda de preguntas de la propuesta

No se pudo preguntar; validar los supuestos 1, 4 y 5 y el toque a M4, M5 y M6.
