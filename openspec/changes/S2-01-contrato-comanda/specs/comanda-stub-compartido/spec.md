# Especificación del stub compartido de Comanda: borrador para revisión

> **Vigencia de apply (2026-10-29):** `size:exception` aceptada para single-pr; preflight nativo confirmado por el padre. Se autorizan contrato documental (incluido `SPRINT-2/`), DTO, fake y pruebas limitados. HTTP no seleccionado. Las menciones antiguas a tamaño/publicación pendientes quedan sustituidas, sin atribuir aceptación a consumidores. No se creó el stub: pytest basal agotó dos límites (120 s y 600 s), por lo que apply se detuvo antes de comportamiento/TDD. Resultados y pendientes en [apply-progress.md](../../apply-progress.md); contrato de equipo aún NO CONGELADO.

**Cambio:** S2-01-contrato-comanda · **Estado:** BORRADOR NO CONGELADO, sin stub implementado ni aceptación de consumidores.

## Propósito y límite

Definir la utilidad de integración solicitada por [#162](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/162), el plan S2-01 y R04, sin sustituir la implementación completa de M4/M5/M6. La única fuente de semántica de negocio de este doble es [comanda-contrato](../comanda-contrato/spec.md): sus requisitos R01–R07 y decisiones A01–A10 se referencian, no se redefinen.

DEBE y NO DEBE se reservan para obligaciones respaldadas por fuentes. A01–A05 tienen decisiones locales del usuario para el stub, no aprobación de equipo: A01/A02 son **Supuesto: adoptado operativamente para el stub por el usuario**, más fuertes que #52 CA02/#58 CA03, pendientes de reconciliación equipo/M5/M6. Reinicio/firmas/paridad compartida siguen propuestas; no son evidencia de funcionamiento. Véase [anexo vigente](../../exploration.md#anexo-de-decisiones-del-usuario--2026-10-29).

**Autorización (2026-10-29):** futuro apply solo para contrato documental, DTO compartido, stub y pruebas; no Comanda real, pantallas, otras HU/módulos, router productivo ni commits/push/PR. Esta ejecución solo mantiene seis documentos. Falta `size:exception` explícita de mantenedor ante >400 generales y consentimiento de edición nativo aplicable; autorización local no los sustituye ni congela el contrato de equipo.

## Requisitos respaldados

### Requirement: T01 — Entregable común para consumidores

Fuente: #162/plan S2-01 y R04. El objetivo DEBE incluir un stub compartido para M5/M6 sobre el contrato de Comanda. **Decisión local A04:** implementar las cuatro operaciones crear, consultar, listar y cerrar; consultar no es opcional. DTO y fake interno de pruebas son el mínimo válido, HTTP aislado opcional, nunca ambos obligatorios por «FastAPI si corresponde». Firmas compartidas/aceptación M5/M6 y entrega utilizable siguen pendientes.

#### Scenario: ST01 — Cobertura revisable
- **Dado** los responsables M4/M5/M6 revisando el entregable propuesto.
- **Cuando** se comprueba su alcance frente a #162, plan y R04.
- **Entonces** crear/consultar/listar/cerrar quedan como alcance local obligatorio; esta comprobación documental no demuestra doble ejecutable ni aceptación de consumidores.

### Requirement: T02 — Mantener el límite de consumo entre módulos

Fuente: D-04 y arquitectura por capas. El consumidor interno DEBE acceder mediante el servicio público, NO DEBE importar schemas, modelos, repositorios ni routers ajenos. La elección de fake no modifica esa restricción; DTO compartido no equivale a ORM compartido. Las reglas de error y paginación son R04/R07 de la spec de negocio, sin versiones alternativas en el stub.

#### Scenario: ST02 — Sustitución sin acceso interno ajeno
- **Dado** un consumidor interno M5 o M6 que sustituye el proveedor real por el doble acordado.
- **Cuando** usa el contrato de servicio.
- **Entonces** el contrato de consumo respeta D-04 y no exige importar capas internas de Atención; el punto de sustitución todavía requiere diseño y autorización.

## Selección de superficie — Supuesto: no normativo, A04

| Alternativa para revisión | Utilidad / límite | Pendiente de validación |
| --- | --- | --- |
| DTO + fake de servicio con estado | Consumo automatizado interno. No ofrece HTTP, `/docs` ni prueba manual HTTP. | Firmas y DTO de la spec de negocio, punto de sustitución e instalación. |
| Stub HTTP local aislado | Permite cliente/manual HTTP; no sustituye por sí solo consumo interno. | Necesidad de Federico/Héctor, arranque local y serialización. |
| Ambos, solo si necesarios | Cubre ambas superficies, con costo de mantener equivalencia. | Selección explícita y escenarios comunes; no se exigen ambos por defecto. |

**Decisión local A04:** fake interno mínimo válido; HTTP únicamente ante necesidad validada y alcance explícito. Respetar arquitectura/interfaces/convenios del proyecto, sin modificar otros módulos ni router productivo. Si se elige HTTP, adaptar las rutas candidatas sin registro en producción. Arranque/parada/conexión/reset siguen por acordar; no inventar endpoint administrativo ni comando. Toda ampliación o cambio futuro requiere alcance explícito.

## Comportamiento recomendado — Supuesto: no normativo

Pendiente de validación A04: estado controlado, datos exclusivamente sintéticos, aislamiento por consumidor/escenario y reinicio reproducible. Ninguno implica una base productiva ni acceso a servicios reales M3/M5. Las decisiones A01–A10 conservan [IDs y alternativas](../comanda-contrato/spec.md#decisiones-conservadas-y-escenarios-candidatos--no-normativos), [exploración](../../exploration.md#registro-priorizado-de-ambigüedades) y [propuesta](../../proposal.md#matriz-de-decisiones-y-trazabilidad).

| Operación candidata | Recomendación observable | Referencia / pendiente |
| --- | --- | --- |
| Preparar/reiniciar | Cargar un conjunto sintético conocido, descartar cambios de la sesión y evitar contaminación entre consumidores. IDs y mecanismo sin fijar. | A04/A10; sin nueva ruta de producción. |
| Crear | Otra ABIERTA bloquea sin insertar, informa conflicto y permite consulta existente por listado de misma Mesa/ID regular. Reserva: al llegar clientes y atender mozo, confirmar pedido válido crea ABIERTA vinculada y ATENDIDA simulada; activa de hoy, mesa heredada y productos positivos, nunca marcador vacío. Inválidos no mutan. | R01–R03/R06, C01; decisiones locales A01/A03; reconciliación/atomicidad real pendientes. |
| Listar | Filtros y Pagina, vacío/offset fuera de rango; decisión local fecha DESC y desempate ID. Supuesto: ID DESC, dirección no especificada por usuario. | R04; A05 local/A07 pendiente para demás detalles. |
| Consultar | Obligatorio: recuperar identidad, detalle y snapshots sintéticos por operación regular, también tras conflicto de alta. | R02/R07; A04 local, firmas/shape compartidos pendientes. |
| Cerrar | Cualquier producto pendiente bloquea sin cambiar estado/entregas; advertir y documentar guía al consumidor hacia marcado, destino pendiente sin pantalla/ruta/callback/payload nuevo. Fixture entregada permite cierre; sin implementar marcado, factura/pago ni liberar mesa. | R05/C02; A02 local más fuerte que HU, reconciliación con equipo/M6 pendiente. Supuesto: conflictos 409 comunes con detalle, sin envelope nuevo. |
| Simular fallos/avisos | Activar casos sintéticos identificados, sin presentar resultados pendientes como comportamiento aprobado. | A01/A02/A03/A08; catálogo de simulaciones pendiente. |

## Escenarios candidatos — Supuesto: no ejecutables hasta validación

#### Scenario: CT01 — Ciclo controlado
- **Dado** un conjunto sintético reiniciado con datos válidos y DTO candidato explícito, sin aprobación de consumidores presumida.
- **Cuando** una prueba futura crea, lista y consulta, o cierra una fixture entregada; también intenta alta duplicada y cierre con pendientes.
- **Entonces** se propone que lecturas sucesivas reflejen los efectos de R01–R05 según el contrato aprobado; el doble no emite factura ni pago.

#### Scenario: CT02 — Reinicio y aislamiento
- **Dado** cambios sintéticos de un escenario o consumidor.
- **Cuando** se reinicia el conjunto o comienza otro contexto aislado.
- **Entonces** se propone recuperar el estado inicial acordado sin filtrar cambios al siguiente contexto; alcance/proceso e IDs esperan A04.

#### Scenario: CT03 — Casos de contrato compartidos
- **Dado** casos de alta, cantidad/XOR inválidos, snapshots, listado, vacío, página fuera de rango, avisos, cierre y reserva de la spec de negocio.
- **Cuando** se seleccionan los casos cuyo resultado ya fue validado para la superficie elegida.
- **Entonces** se reutilizan las decisiones locales C01/C02/C04 para futuras pruebas del stub; C03/C05 y acuerdos de equipo abiertos no son aserciones finales. Reutilizar suite en implementación real requerirá aprobación compartida y paridad demostrada, no basta con compartir DTO.

#### Scenario: CT04 — Reserva/mesa simuladas frente a atomicidad real
- **Dado** un caso sintético de fallo o concurrencia de reserva, con efectos M3/M5 simulados y claramente identificados.
- **Cuando** el doble reproduce la respuesta acordada en A03/A06/A08.
- **Entonces** se propone verificar solo el estado simulado; no se acredita rollback SQLite, composición transaccional ni disponibilidad de servicios M3/M5 reales.

#### Scenario: CT05 — Manual HTTP y futura paridad
- **Dado** una necesidad manual HTTP confirmada por un consumidor.
- **Cuando** se evalúa entregar únicamente un fake de pruebas.
- **Entonces** ese fake no cubre la necesidad HTTP; se propone acordar la superficie aislada y comparar rutas/DTO/códigos con el contrato antes de afirmar paridad. La equivalencia con producción todavía no está verificada.

## Trazabilidad, aceptación y siguiente revisión

| Fuente | Cobertura documental | Todavía no satisfecho |
| --- | --- | --- |
| #162 y plan S2-01 | T01/ST01, operaciones candidatas y CT01 | Stub entregado, utilizable y aceptado por M5/M6. |
| R04 | Consulta individual propuesta, superficies y CT05 | Necesidad de consulta/superficie validada y riesgo efectivamente mitigado. |
| #52/#55/#58/#68 | R01–R06 y escenarios S52/S55/S58/S68 en spec de negocio; selección CT03 | Resultados técnicos A01–A10 aprobados y escenarios ejecutados. No duplicar criterios de negocio aquí. |
| D-04/D-25–D-27 | T02/ST02 y referencia a R04/R07 | Diseño de sustitución, traducción y paridad comprobada. |

Pendiente de validación compartida: Federico/Héctor confirman firmas/uso/simulaciones, reconciliación A01/A02 y ejemplos monetarios; equipo coordina shared y Giuliano mesa/Mozo. El permiso local permite un fake provisional sintético una vez atendido el presupuesto y consentimiento nativo aplicable; no requiere implementar proveedores reales ni acredita aceptación ajena. Brecha M1 categoría+ID sigue abierta; catálogo sintético explícito.

No se incluyen flujos de factura, pago, reapertura o anulación. Estados sintéticos de lectura/error no habilitan operaciones para producirlos. No se publican rutas productivas ni se modifica bootstrap, configuración u otros módulos. DTO compartido futuro limitado a `backend/app/shared/contratos/comanda.py`; fake/suite en `backend/tests/shared/fakes/comanda.py` y `backend/tests/shared/test_contrato_comanda.py`, sin cambios shared arbitrarios. No se ejecutaron pruebas ni stub. Futuro RED → GREEN → REFACTOR incluye cuatro métodos, bloqueo sin inserción/consulta existente, bloqueo de cierre sin mutación/autoentrega y guía documental, fixture entregada, reserva válida/invalidación y Decimal de centavos exactos con formato Productos. No se fija fórmula/redondeo de descuento M6: ROUND_HALF_UP histórico no aprobado ni regla existente. La autorización no permite correcciones ilimitadas, reviews adicionales o cambios de CI.
