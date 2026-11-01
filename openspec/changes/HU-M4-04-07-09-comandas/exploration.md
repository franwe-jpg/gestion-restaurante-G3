## Exploration: HU-M4-04-07-09-comandas

**Resultado:** investigación local completada con decisiones y verificaciones pendientes, no con alcance aprobado. El contrato S2-01 está integrado en el `origin/develop` almacenado localmente, pero solo entrega DTO y doble de pruebas; no hay API productiva de Comanda. Una propuesta solo podría redactarse como borrador condicionado: antes de dar por válido el cambio agrupado se debe resolver su compatibilidad con la regla de agrupación y verificar los issues y sus dependencias en una fuente autorizada. No se consultó ningún servicio remoto.

### Current State

- Rama `feature/HU-M4-04-07-09-comandas`, sin modificaciones rastreadas y con este directorio de exploración aún sin seguimiento; HEAD `aa28d15` y `origin/develop` local apuntan al mismo commit. El `develop` local está rezagado (`0bff1e0`): comparar contra él por sí solo ocultaría S2-01. Evidencia: `git status --short --branch`, `git rev-parse HEAD develop origin/develop` y `git ls-tree -r --name-only origin/develop ...` (consulta local, 2026-10-30).
- `SPRINT-2/S2-01-contrato-comanda.md:3,35-53` y `backend/app/shared/contratos/comanda.py:1-60`: DTO provisional para alta, detalle, resumen y salida; enums ABIERTA/CERRADA/ANULADA y PENDIENTE/ENTREGADO. `backend/tests/shared/fakes/comanda.py:36-148` implementa simulación en memoria, no persistencia ni servicios reales; `backend/app/main.py:12-29` no registra router de Atención.
- `backend/app/modules/atencion/{router,service,repository,models,schemas}.py` contienen únicamente docstrings; `frontend/src/modules/atencion/pages/AtencionPage.tsx:6-23` muestra una pantalla pendiente. `frontend/src/modules/atencion/types.ts:1-9` aún define estados en minúsculas `abierta/en_cocina/servida/cerrada`, distintos de los del DTO; `api.ts:5-7` llama a `/atencion/comandas` y espera un arreglo, no `Pagina`.
- Evidencia secundaria de criterios: `openspec/changes/S2-01-contrato-comanda/specs/comanda-contrato/spec.md:270-280` resume 8 CA de #52, 4 de #55 y 4 de #58; `openspec/changes/S2-01-contrato-comanda/exploration.md:29-42` declara basarse en una captura anterior de los issues, no incluye su texto íntegro ni acredita su estado actual. **Pendiente:** no se puede verificar localmente el texto completo, los campos «Depende de», ni que cada dependencia esté cerrada. No atribuir a esos resúmenes autoridad de issue vigente.
- `SPRINT-0/Plan-de-trabajo-Sprint.md:243-266` asigna S2-M4 a Juan, con dependencias S2-01, S2-M1 y S2-M3; `origin/develop` local incluye S2-01, pero eso no demuestra que su contrato esté congelado: `SPRINT-2/S2-01-contrato-comanda.md:3,47-53` dice que falta aceptación de M5/M6. Tampoco demuestra cierre de S2-M1/S2-M3 o de las dependencias específicas de los tres issues.
- **Contradicciones por resolver, sin reescribir la HU:** S2-01 bloquea duplicada y cierre con pendientes solo como supuestos locales del doble, mientras las síntesis de #52 CA02 y #58 CA03 piden advertir (`SPRINT-2/S2-01-contrato-comanda.md:41-47`; `openspec/changes/S2-01-contrato-comanda/specs/comanda-contrato/spec.md:65-75,108-110`). El caso de prueba anterior trata una mesa ocupada como inválida y exige turno obligatorio (`SPRINT-1/S1-07-casos-de-prueba.md:207-231`); no convertirlo en contrato sin verificar el issue y la decisión del equipo.
- **Alcance del grupo pendiente de decisión:** `AGENTS.md:42-45` permite juntar ABM y listado de una entidad con un responsable, pero excluye flujos de estado. Agrupar alta (#52), listado (#55) y cierre (#58) en un mismo cambio/PR puede incluir un flujo excluido; el plan los ubica en el mismo sprint (`SPRINT-0/Plan-de-trabajo-Sprint.md:253-271`), lo que no elimina esa restricción. No dividir ni mantener el grupo por cuenta propia.

### Affected Areas

- `backend/app/modules/atencion/{router,service,repository,models,schemas}.py` y futuras migraciones: superficie productiva aún ausente; ubicación ORM y coordinación de migraciones pendientes.
- `frontend/src/modules/atencion/{api.ts,types.ts,pages/AtencionPage.tsx}`: contrato y pantalla provisionales incompatibles con el DTO; reutilizar componentes compartidos existentes antes de proponer otros.
- `backend/app/shared/contratos/comanda.py` y `backend/tests/shared/fakes/comanda.py`: precedentes de pruebas, **no** contrato HTTP aprobado ni autorización para modificar `shared/`.
- `backend/app/modules/salon/service.py:87-102`, `backend/app/modules/{productos,menus,reservas,pagos}/service.py`: coordinación para mesa, importes, reserva y lectura para facturar; no editar módulos ajenos. Salón no expone consulta/ocupación de mesa (`backend/app/modules/salon/service.py:41-102`).

### Approaches

1. **Planificar contratos por historia, separados hasta aclarar el grupo** — tratar alta/listado y cierre como unidades de alcance independientes; reutilizar DTO/fake solo como evidencia provisional.
   - Ventajas: evita asignar al cierre una autorización ABM que no tiene; facilita contrastar cada criterio original.
   - Costos: exige decisión humana sobre nombre/cantidad de cambios y dependencias antes de propuesta.
   - Esfuerzo: medio.
2. **Mantener el cambio agrupado solicitado, sujeto a excepción explícita de alcance** — especificar por separado los escenarios de alta, listado y transición de cierre, sin asumir que el doble define producción.
   - Ventajas: preserva la rama y estrategia de entrega solicitadas; unifica revisión del recorrido.
   - Costos: choca potencialmente con `AGENTS.md:42-45`; aumenta tamaño y riesgo de revisión, requiere autorización de rumbo y resolución de la precedencia de los issues.
   - Esfuerzo: alto.

### Recommendation

No avanzar a propuesta automáticamente. Resolver con la persona responsable si el cierre puede permanecer en el grupo conforme a `AGENTS.md`, y comprobar el texto y cierre de dependencias de #52/#55/#58 mediante evidencia autorizada, sin usar credenciales ni remoto en esta fase. **Supuesto:** una vez aclarado el alcance, partir del comportamiento que respaldan las HU; conservar A01/A02 del doble como decisiones provisionales pendientes de reconciliación, no copiar su bloqueo como regla productiva. Coordinar servicios M3 y consumidores M5/M6 antes de fijar efectos compartidos. Mantener `single-pr` y presupuesto fijo de 400 líneas como control de revisión; si el pronóstico posterior lo excede, elevar la decisión aplicable antes de implementar, sin crear PR en esta fase (`AGENTS.md:55-61`; `openspec/config.yaml:53-58`).

### Risks

- Imponer bloqueos del fake o estados del frontend a producción alteraría la HU y rompería la lectura de M5/M6; #58 CA02 solo está cubierto parcialmente en el doble (`SPRINT-2/S2-01-contrato-comanda.md:47-53`).
- Alta/ocupación de mesa y cierre/consulta pueden dejar estados parciales sin operación M3 componible ni transacción acordada; el doble no prueba concurrencia ni rollback (`backend/app/modules/salon/service.py:60-90`; `SPRINT-2/S2-01-contrato-comanda.md:49-53`).
- El alcance conjunto, más backend, frontend, migración y pruebas, amenaza el presupuesto general de 400 líneas; el control 800/800 del repositorio no reemplaza el preflight de esta sesión (`AGENTS.md:55-61`; `openspec/config.yaml:53-58`).
- Texto original y «Depende de» de cada issue, cierre de dependencias, aceptación de M5/M6, semántica definitiva A01/A02, formato monetario, origen de Mozo, zona horaria, filtros y errores siguen pendientes (`openspec/changes/S2-01-contrato-comanda/specs/comanda-contrato/spec.md:226-241,270-285`).

### Ready for Proposal

**No para aprobar el grupo tal como está:** solicitar una decisión de alcance sobre incluir el cierre y evidencia autorizada de los tres issues/dependencias. La investigación local ya concluyó; `sdd-propose` solo podría producir un borrador condicionado que exponga esos bloqueos, nunca validar el alcance ni afirmar que se verificaron los issues. Esta fase no crea propuesta, spec, diseño, tareas, código ni entrega remota.
