# Diseño: HU-M4-11 Reporte de comandas y ticket promedio por día/turno

## Decisiones

1. Mantener el cambio dentro de `backend/app/modules/atencion/` y `frontend/src/modules/atencion/`; solo se toca el catálogo compartido y el router de páginas para registrar la nueva pantalla.
2. Decisión funcional confirmada: asignar día/turno por `Comanda.fecha_hora` de creación (UTC convertida a UTC−3), contar solo comandas en estado `CERRADA` al consultar, y no alterar la asignación si el cierre ocurre después. Noche pertenece al día en que comienza. No agregar `fecha_hora_cierre` ni migración.
3. Convertir el rango local UTC−3 al intervalo UTC semiabierto `[inicio, fin)` para filtrar datos. SQLite calcula el día/hora local para agrupar y limita horarios a las franjas validadas.
4. Repository calcula `COUNT(DISTINCT Comanda.id)` y `SUM(cantidad * precio_unitario - descuento)` agrupados por día y turno; service conserva conversiones `Decimal` y arma resumen/períodos.
5. Serializar importes como cadenas de dos decimales, consistente con contrato compartido de Comanda y reportes existentes.
6. Frontend usa `DateRangePicker`, `Select`, `StatCard`, `DataTable`, `Alert`, `EmptyState` y cliente HTTP existentes; no crea componentes comunes ni importa archivos internos de otros módulos.

## Capas y archivos

### Backend

- `atencion/reporte.py`: zona local copiada del patrón local de reportes, validación de período, intervalo UTC, tipos de turno, clasificación y cálculos puros.
- `atencion/repository.py`: consulta agregada de comandas cerradas y detalles para el período/turno.
- `atencion/schemas.py`: DTO del reporte y grupos, importe serializado con dos decimales.
- `atencion/service.py`: orquesta validación, consulta y composición con `Decimal`.
- `atencion/router.py`: GET `/reportes/comandas-ticket-promedio`, solo delegación.

### Frontend

- `atencion/types.ts`, `api.ts`: contrato de entrada/salida y llamada por `clienteHttp`.
- `atencion/pages/useReporteComandas.ts`: filtros, validación, estados de carga/error/resultado.
- `atencion/pages/ReporteComandasPage.tsx`: filtros, resumen, tabla y estado vacío.
- `App.tsx` y `shared/components/reportes.ts`: una ruta y una tarjeta nuevas.

## Riesgos y control

- SQLite maneja NUMERIC/SUM con particularidades de conversión; el repository normaliza el resultado a Decimal sin cálculos monetarios float en Python.
- La atribución temporal es intencionalmente por creación, incluso cuando el cierre ocurre en otro turno/día; está documentada como decisión confirmada.
- El filtro nocturno termina antes de medianoche del mismo día y se agrupa por ese día; no se extiende al siguiente.

## Sin cambios

No se modifican modelos, migraciones, módulos ajenos, `shared/` backend ni contratos de importación.
