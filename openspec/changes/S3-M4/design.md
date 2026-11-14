# Diseño: S3-M4 — Integración de cliente y primera reserva

## Enfoque técnico

Este cambio verifica y documenta el acuerdo confirmado para HU-M4-01, no introduce una implementación nueva. La delta `specs/atencion-clientes/spec.md` explicita que los campos del cliente nuevo se presentan dentro del formulario de alta de Reserva y que Cliente y primera Reserva se persisten atómicamente. El contrato de creación, el puente M4/M5 y la propiedad transaccional siguen siendo los ya definidos en `openspec/changes/HU-M5-01-02-03/specs/reservas-gestion/spec.md`.

La inspección del código coincide con ese contrato. En frontend, `ReservaFormDialog` contiene `SelectorCliente`; al elegir cliente nuevo, sus campos se incorporan al estado del formulario y `useFormularioReserva` envía `cliente_nuevo` junto con los datos de la reserva. En backend, M5 valida y crea la Reserva; el puente delega al servicio M4, que valida y hace `flush` del Cliente sin confirmar la sesión. M5 ejecuta un único `commit`; los errores de integridad revierten la sesión.

## Decisiones de diseño

### Decisión: conservar la responsabilidad transaccional existente

**Elección**: M4 valida y agrega el Cliente a la sesión del llamador; M5 conserva la propiedad de la transacción y confirma o revierte Cliente y Reserva conjuntamente.

**Alternativas consideradas**: mover la transacción a M4, agregar un endpoint independiente de alta de Cliente o crear otra vía de integración.

**Justificación**: el límite entre módulos acordado en las especificaciones M4/M5 ya está implementado y evita persistir un Cliente sin su primera Reserva. No se encontró un defecto concreto que justifique cambiar ese límite.

### Decisión: no duplicar la implementación ni el contrato M5

**Elección**: conservar la delta M4 como aclaración del requisito de HU-M4-01 y usar la especificación M5 existente como referencia para API, puente y transacción.

**Alternativas consideradas**: replicar los requisitos de creación de Reserva en M4 o crear tareas de implementación adicionales.

**Justificación**: esas responsabilidades ya están especificadas por M5 y respaldadas por implementación y pruebas de integración existentes; duplicarlas generaría contratos divergentes sin aportar comportamiento nuevo.

## Flujo de datos observado

```text
ReservaFormDialog → SelectorCliente → useFormularioReserva
  → POST /reservas con cliente_nuevo
  → reservas.service.crear_reserva
  → reservas.puente → atencion.service.registrar_cliente_para_reserva
  → flush Cliente → agregar Reserva → commit único
                                  └─ fallo → rollback de la sesión
```

Para un cliente existente, el formulario envía `cliente_id` en vez de `cliente_nuevo`; esa ruta queda fuera de la aclaración específica de primera alta.

## Archivos

| Archivo | Acción | Motivo |
|---|---|---|
| `openspec/changes/S3-M4/design.md` | Crear | Registrar diseño de verificación y dataflow observado. |
| `openspec/changes/S3-M4/specs/atencion-clientes/spec.md` | Sin cambio | La delta ya contiene el acuerdo confirmado. |
| Implementación y pruebas M4/M5 | Sin cambio | La inspección no identificó un defecto concreto. |

No se planifican cambios de código, pruebas ni migraciones. No se crean tareas de implementación duplicadas. No se modifica ningún artefacto de Comandas.

## Verificación enfocada

La exploración identificó pruebas de puente real en `backend/tests/modules/reservas/test_router.py` (aprox. líneas 852–968): alta y asociación exitosas, datos obligatorios ausentes, nombre inválido, fallos de reserva sin Cliente huérfano y carrera del índice único. Revisar o ejecutar únicamente los casos enfocados que cubren esos escenarios; no ejecutar suites completas. La exploración registra como evidencia histórica un resultado previo de pytest, no como una verificación ejecutada en esta fase.

La inspección de frontend se centra en `frontend/src/modules/reservas/components/ReservaFormDialog.tsx`, `SelectorCliente.tsx` y `useFormularioReserva.ts`, además de las pruebas focalizadas del formulario. No se ejecutaron pruebas durante esta fase, conforme a la instrucción de no correr suites completas y a que no surgió un defecto que requiera diagnóstico adicional.

## Matriz de amenazas

N/A — no se cambian rutas, comandos de shell, subprocesos, automatización VCS/PR, clasificación de ejecutables ni integración de procesos.

## Migración y despliegue

No se requiere migración ni despliegue escalonado: el diseño no cambia código ni esquema.

## Preguntas abiertas

Ninguna para este diseño. La evidencia del repositorio no determina por sí sola aceptación formal ni cierre de issues o PR; esta fase no altera registros de GitHub.
