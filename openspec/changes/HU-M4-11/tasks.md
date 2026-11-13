# Tareas: HU-M4-11 Reporte de comandas y ticket promedio por día/turno

## 1. Contrato y backend (Strict TDD)

- [x] 1.1 Escribir pruebas RED para validación de período, zona local y límites de turno (12:00, 16:00, 20:00, 00:00).
- [x] 1.2 Escribir pruebas RED del repository para rango/turno, estados CERRADA/ABIERTA/ANULADA, agrupación y agregación de líneas.
- [x] 1.3 Implementar DTO, lógica pura de reporte, consulta agregada, service y endpoint.
- [x] 1.4 Probar totales Decimal, ROUND_HALF_UP y respuesta vacía mediante service/router.

## 2. Frontend (Strict TDD)

- [x] 2.1 Escribir pruebas RED del API/hook para filtros de fechas/turno, validación y errores.
- [x] 2.2 Escribir pruebas RED de pantalla: filtros, tarjetas, tabla y ausencia de datos.
- [x] 2.3 Implementar API/tipos/hook/página reutilizando componentes compartidos.
- [x] 2.4 Registrar tarjeta del catálogo y ruta; probar navegación y aislamiento del catálogo.

## 3. Cierre focalizado

- [x] 3.1 Ejecutar pytest solo en los archivos M4 modificados y Vitest solo en los tests afectados.
- [x] 3.2 Revisar lint/formato/typecheck focalizados si hay comandos adecuados; informar toda verificación omitida.
- [x] 3.3 Actualizar progreso y registrar el riesgo pendiente: no existe timestamp de cierre.

## Presupuesto y alcance

- Control histórico del repositorio: hasta 800 líneas por lado, no bloqueo.
- Estrategia seleccionada para el cambio: Single PR.
- Sin migración, sin cambios a modelos y sin cambios en módulos ajenos.
