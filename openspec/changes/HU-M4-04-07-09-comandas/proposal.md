# Propuesta: alta, listado y cierre de Comanda (HU-M4-04-07-09)

> **Estado vigente: flujos locales y frontend, 9/30 tareas completas.** Listado con filtros/paginación y cierre con confirmación/aviso previo funcionan; A02 devuelve metadatos estructurados sin modificar S2-01. Formulario de alta y POST con puertos se prueban con dobles; sin adaptadores reales el POST da 503, no simula éxito. No se implementan gestión de entregas HU-M4-08 ni M6. Las afirmaciones históricas de ausencia de frontend/POST quedan superadas por esta continuación.

> **Estado: alcance agrupado y reglas funcionales A01/A02 aprobados; integraciones y contrato de datos/API pendientes.** La persona autorizó expresamente incluir el cierre (#58) con el alta (#52) y el listado (#55) en un solo cambio y un solo PR. Esto constituye una excepción **solo para este cambio** a `AGENTS.md:42-45`, que normalmente excluye los flujos de estado de grupos ABM. No se modifica `AGENTS.md` ni se supone aceptación de M3/M5/M6 o aprobación de la futura implementación. Preflight confirmado: ritmo automático, OpenSpec, un PR y presupuesto de revisión de 400 líneas; si el pronóstico posterior lo requiere, la persona aprobó `size:exception` para este cambio, no una cifra estimada ni una excepción genérica a la revisión.

## Intención

Permitir al mozo crear comandas vinculadas a mesas, encontrarlas en un listado y cerrar una comanda para dejarla disponible para facturación. Las tres historias están abiertas y asignadas a M4: [#52](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/52), [#55](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/55) y [#58](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/58). El plan de Sprint 2 exige crear, listar y cerrar (`SPRINT-0/Plan-de-trabajo-Sprint.md:249-271`).

## Alcance autorizado y límites

### Dentro del alcance

- **#52 / HU-M4-04 — alta:** registrar un pedido con mesa y al menos una línea de producto o menú ejecutivo, cantidad válida, precio/promoción/descuento históricos, observaciones opcionales y reserva de origen opcional; iniciar ABIERTA con fecha y hora del sistema y ocupar una mesa libre.
- **#55 / HU-M4-07 — listado:** ver comandas con mesa y estado, filtrar por mesa y por estado e informar si no hay comandas. Paginar según `backend/app/shared/paginacion.py` (D-27), sin convertir ese detalle arquitectónico en un criterio nuevo del issue.
- **#58 / HU-M4-09 — cierre:** confirmar el paso de ABIERTA a CERRADA; después no se pueden agregar productos y queda disponible para facturar. Ante productos sin entregar se debe advertir **antes de confirmar**; por A02 aprobada, el cierre queda impedido hasta su entrega. No se factura ni se cobra aquí.

### Criterios originales contrastados (orden conservado)

Fuentes primarias: [#52](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/52), [#55](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/55), [#58](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/58). Esta síntesis no sustituye la trazabilidad íntegra que deberá redactarse en la spec.

| Historia | Criterios de aceptación en orden |
| --- | --- |
| #52 (8) | CA01 mesa libre + pedido con productos → pedido registrado y mesa ocupada; CA02 otra comanda abierta en la mesa → aviso; CA03 número de mesa inexistente → advertencia; CA04 sin reserva de origen → sin cliente asociado; CA05 cantidad no entera positiva → advertencia de cantidad inválida; CA06 producto o menú con promoción vigente → guardar precio vigente, promoción y descuento calculado al pedir; CA07 alta válida → estado abierta; CA08 alta → fecha y hora de creación guardadas. |
| #55 (4) | CA01 comandas abiertas → ver cada una con mesa y estado; CA02 criterio de búsqueda mesa → solo comandas asociadas; CA03 filtro de estado → solo ese estado; CA04 ninguna comanda → informar lista vacía. |
| #58 (4) | CA01 abierta con productos, cierre confirmado → cerrada; CA02 tras cierre → no agregar productos y lista para facturar; CA03 productos sin entregar, intento de cierre → aviso antes de confirmar; CA04 cierre correcto → disponible para continuar facturación. |

### Fuera de alcance

- Alta desde reserva (#68), incorporación posterior de productos, implementación del marcado de entregas, reapertura, anulación, facturación, cobro y cambios en módulos de otros responsables.
- Convertir el doble S2-01 en servicio productivo, duplicar sus DTO/enumeraciones en M4 o tratar el contrato compartido como API HTTP aprobada. A01/A02 son **decisiones funcionales aprobadas para este cambio**, adicionales a los avisos de las HU; el contrato histórico S2-01 sigue sin congelarse (`SPRINT-2/S2-01-contrato-comanda.md:35-53`).

## Capacidades

Este es el contrato de organización para la fase de especificación. `openspec/specs/` contiene especificaciones de carta, pero ninguna especificación principal de Comanda. La especificación del cambio `S2-01-contrato-comanda` sigue siendo un borrador no congelado, no una capacidad principal que se deba modificar (`openspec/changes/S2-01-contrato-comanda/specs/comanda-contrato/spec.md:1-16`).

### Capacidades nuevas

- `comanda-alta`: registro, validaciones, historial de valores y efecto sobre la mesa; escenarios de los ocho CA de #52, bloqueo A01 con acceso a consulta de la Comanda existente y decisiones pendientes con M3.
- `comanda-listado`: consulta con filtros, resultado vacío y paginación; escenarios de los cuatro CA de #55.
- `comanda-cierre`: transición confirmada, aviso previo y bloqueo A02 con detalle de pendientes y navegación para entregarlos, prohibición de agregar después y disponibilidad para facturar; escenarios de los cuatro CA de #58. Separar la decisión A02 de la advertencia original exigida por la HU.

### Capacidades modificadas

Ninguna. No se modifica la especificación S2-01 ni se promueve su doble a contrato productivo por inferencia.

## Enfoque preliminar

**Estado vigente de aplicación:** persistencia, listado/paginación frontend, confirmación de cierre y alta local con puertos implementados; 9/30 tareas completas. `GET /comandas/{id}/pendientes` permite aviso previo; el 409 de cierre añade IDs/referencias/cantidades. Salidas exitosas siguen reutilizando DTO S2-01. Alta productiva completa, consulta/presentación A01, navegación real a entregas y aceptación M6 no están resueltas.

Los tres issues y sus 16 CA se contrastaron con las síntesis locales; sus cuerpos no declaran «Depende de» y la comprobación pública previa reportó `blocked_by: 0`. No confundir esto con dependencias de planificación resueltas. Las tres specs trazan cada CA y proponen datos, rutas, respuestas y advertencias; el diseño propone M4 por capas (`router → service → repository → models`) y la interfaz. La persistencia M4 (`Comanda`, `DetalleComanda` y migración) ya existe y se conserva; dinero histórico y recuperación UTC tienen GREEN focalizado, no cobertura funcional. La producción M4 debe reutilizar `ComandaCrear`, `DetalleComandaCrear`, `ComandaSalida`, `ComandaResumen`, `DetalleComandaSalida`, `EstadoComanda` y `EstadoEntrega` de `backend/app/shared/contratos/comanda.py`, sin definir tipos Pydantic paralelos. El fake de S2-01 sigue siendo solo un doble, no persistencia, servicio ni API HTTP aprobada. Coordinar efectos en Mesa con M3 y consumo de Comanda con M5/M6 sin editar módulos ajenos.

**Decisiones funcionales y estado:** A01 bloquea una segunda ABIERTA y el 409 M4 ya devuelve `comanda_id`, sin insertar otra; queda pendiente consultar/presentar la existente. A02 bloquea con IDs/referencias/cantidades, consultados también por GET antes de confirmar. S2-01 y el fake no cambian: el detalle compartido sigue sin `id`; este se obtiene del ORM solo para metadatos de operación locales. No se requiere extender DTO compartido para cumplir ese retorno local ni se atribuye aceptación M5/M6. Las HU originales exigían avisos, no estos bloqueos adicionales. No se entregan productos automáticamente y no se implementa HU-M4-08: la navegación sigue pendiente porque no hay destino real.

## Áreas potencialmente afectadas

| Área | Impacto condicionado |
| --- | --- |
| `backend/app/modules/atencion/` | Modelos, lectura/listado, cierre y alta con puertos existentes; GET de pendientes y 409 A02 estructurado implementados. Salidas/entrada de pedido S2-01, metadatos de operación locales separados. Adaptadores de alta pendientes. |
| `backend/alembic/versions/e7c9a1b3d5f0_crea_comandas.py`, `backend/alembic/env.py` y `backend/app/main.py` | Migración/registro conservados; router M4 registrado con listado/pendientes/alta con puertos/cierre. Manejadores específicos A01/A02, sin cambiar las respuestas genéricas. |
| `frontend/src/modules/atencion/` | Formulario multilínea, listado paginado/filtrado y cierre con consulta previa, reintentos y confirmación; usa `/comandas` y estados S2-01. Dobles solo en pruebas; navegación real al marcado pendiente. |
| `backend/app/shared/contratos/comanda.py`, `backend/tests/shared/fakes/comanda.py` | Reutilizar DTO/enumeraciones compartidos en producción; el fake sigue siendo doble. Cualquier extensión del DTO de detalle requiere acuerdo, no se modifica aquí. |

## Riesgos y mitigación propuesta

| Riesgo | Mitigación antes de implementar |
| --- | --- |
| Excepción al agrupamiento de `AGENTS.md` | Registrar la autorización excepcional del cierre solo aquí; mantener escenarios separados por historia y un único PR. |
| Dependencias de planificación o aceptación compartida no acreditadas | #162 (S2-01) figura cerrado según verificación pública previa, pero la aceptación M5/M6 sigue pendiente en `SPRINT-2/S2-01-contrato-comanda.md:3,49-53`; S2-M1/S2-M3 no tienen cierre verificado. Coordinar antes de integrar. |
| Reglas A01/A02 adicionales a los avisos de las HU | Mostrar Comanda existente en A01 y pendientes con navegación en A02 antes de habilitar confirmación; acordar datos y destino de marcado sin inventar rutas ni afirmar cobertura ejecutada. |
| Estados parciales de Comanda/Mesa y cambios de esquema | Diseñar coordinación y transacción con M3; definir prueba de rollback y migración reversible antes de ejecutar. |
| Backend, frontend, pruebas y migración superan el control de revisión | Pronosticar adiciones + eliminaciones frente a **400 líneas** en tareas; si se supera, registrar `size:exception` ya aprobada para este cambio y explicar el tamaño, sin dividir la HU ni omitir revisión. Los controles 800/800 por lado no sustituyen el presupuesto general (`AGENTS.md:55-61`; `openspec/config.yaml:54-58`). |

## Plan de reversión preliminar

Para revertir una futura aplicación, coordinar cliente y router M4; la migración M4 existente ya tiene downgrade probado sobre SQLite temporal, no sobre datos reales. **Supuesto:** si existen comandas persistidas, no eliminar tablas ni datos mediante downgrade destructivo sin plan de preservación y aprobación del equipo. Conservar los modelos y la migración aprobados en esta continuación.

## Dependencias y decisiones pendientes

1. **Alcance y fuentes resueltos para propuesta:** agrupación y posible excepción de tamaño aprobadas por la persona. Lectura pública y sin credenciales limitada a #52, #55 y #58; están abiertos, no contienen «Depende de» textual y una comprobación previa de sus relaciones reportó cero bloqueos. Esto no valida los requisitos de otras HU ni cierra tareas del sprint.
2. **Decisión funcional resuelta; integración pendiente:** A01 bloquea y devuelve el ID de la Comanda existente; A02 bloquea y devuelve los IDs de los detalles pendientes, además de informar productos y ofrecer navegación **antes** de cualquier confirmación. Acordar las dos superficies de lectura/error, la fuente de estados de entrega y el destino de marcado todavía no implementado, sin inventar rutas ni implementar HU-M4-08.
3. **Integración pendiente:** el plan vincula S2-M4 con S2-01, S2-M1 y S2-M3 (`SPRINT-0/Plan-de-trabajo-Sprint.md:241-250`). #162/S2-01 está cerrado según la comprobación pública previa, pero el contrato local no está congelado ni aceptado por Federico y Héctor (`SPRINT-2/S2-01-contrato-comanda.md:3,49-53`); S2-M1/S2-M3 no están verificados como completados. Coordinar M3/M5/M6, además de valores M1/M2, sin tocar módulos ajenos.
4. **Otros supuestos sin resolver:** fórmula de descuento y redondeo, identidad/filtro y ocupación de Mesa, origen de Mozo, zona local de presentación, forma de las superficies de lectura/error, prioridades de errores, transacciones y servicios M1/M2/M3; véanse A05–A10 en `openspec/changes/S2-01-contrato-comanda/specs/comanda-contrato/spec.md:226-241`. La persistencia UTC y `Numeric(10, 2)` ya están implementados; no trasladar comportamiento del doble directamente a producción.

## Criterios de éxito y siguiente paso

- [x] Agrupación excepcional con cierre y estrategia de un PR autorizadas; contrastados los 16 CA de las tres fuentes primarias.
- [x] La spec traza cada CA en su orden y diferencia los avisos originales de las reglas funcionales A01/A02 aprobadas; el flujo con pendientes no acepta confirmación.
- [ ] Los contratos HTTP y de integración M3/M5/M6 se revisan sin confundir el doble S2-01 con API productiva ni declarar aceptación compartida.
- [x] Tareas pronostican adiciones + eliminaciones frente a 400 líneas, documentan si corresponde `size:exception` y conservan revisión de un solo PR.

**Siguiente paso recomendado:** coordinar el destino de marcado y los contratos de datos/API pendientes antes de ampliar el alcance implementado. **Nota histórica:** esta propuesta no autorizaba por sí sola código ni pruebas; las continuaciones locales posteriores fueron autorizadas y registradas en `apply-progress.md`. No se autoriza publicación ni entrega, ni se declara completa la HU.
