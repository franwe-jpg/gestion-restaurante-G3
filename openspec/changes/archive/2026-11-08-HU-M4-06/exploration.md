## Exploration: HU-M4-06 — Anular Comanda

### Current State

- **Fuentes y alcance:** Issue #54 (abierto; evidencia GitHub de solo lectura provista por el padre) define cuatro criterios: confirmar la anulación de una Comanda ABIERTA; conservar como ANULADA una Comanda creada por error que no fue facturada y liberar su Mesa; rechazar la anulación de una Comanda facturada e informar al usuario; conservar la Comanda anulada para trazabilidad. #201 incluye HU-M4-06 como tarea abierta. La dependencia histórica de #201 hacia #52 está cerrada. #206 y #207 están integrados; #207 documenta la liberación transaccional de Mesa al cerrar. No se observaron comentarios que resuelvan ambigüedades. No se hizo acceso remoto en esta fase.
- **Estado y persistencia:** `backend/app/shared/contratos/comanda.py` define `EstadoComanda.ABIERTA`, `CERRADA` y `ANULADA`; `backend/app/modules/atencion/models.py` persiste el estado como `String(20)`, y la migración `e7c9a1b3d5f0_crea_comandas.py` no impone una lista de valores. La anulación puede representarse como transición de estado sin nueva columna ni migración. La entidad no tiene borrado lógico separado ni la anulación implementada hoy. El repositorio no borra Comanda: `obtener_comanda` carga sus detalles, `listar_comandas` no excluye estados y filtra opcionalmente por estado; las eliminaciones existentes en `quitar_detalles` son de líneas durante modificación, no eliminación de Comanda. El listado y consulta por ID, por tanto, conservan accesible una fila ANULADA. El criterio exige explícitamente conservación histórica, no borrado físico.
- **Servicio y ruta M4:** `backend/app/modules/atencion/service.py` implementa `cerrar_comanda(db, comanda_id, mesas)` con validación ABIERTA, transición y liberación de mesa en una transacción; el endpoint correspondiente es `POST /api/v1/comandas/{id}/cerrar`. `obtener_comanda` y el listado son públicos en el módulo. No existe operación/router para anular. El patrón de servicio lanza errores de dominio y hace rollback; los errores HTTP se normalizan como `{"detalle": ...}` con 404/409/422 según estándares.
- **Disponibilidad para facturación — límite M6:** `backend/app/modules/pagos/models.py` representa factura con `Factura.comanda_id` único. `backend/app/modules/pagos/repository.py` tiene `existe_factura_de_comanda(db, comanda_id)`, pero es una consulta interna del repositorio M6. No hay un método de servicio público M6 para preguntar por facturación, ni una interfaz contractual en S2-01. M6 usa públicamente `atencion_service.obtener_comanda` al preparar factura y solo acepta estado CERRADA; `generar_factura` después crea la factura. Esas reglas no ofrecen a M4 una comprobación pública previa reutilizable ni garantizan por sí solas atomicidad frente a una carrera. M4 no debe importar repositorio/modelos M6 ni consultar la tabla `facturas` directamente.
- **M3 y transacción:** `salon.service.liberar_mesa(db, mesa_id)` cambia OCUPADA a LIBRE sin commit, y documenta que la transacción queda a cargo del llamador. La implementación actual de `MesasDeSalon.liberar` en `backend/app/modules/atencion/adaptadores.py` delega a esa operación. M4 puede orquestar la liberación y la transición ANULADA en su transacción, con rollback conjunto, conforme al precedente de cierre. No requiere una operación nueva M3 mientras se mantengan la firma y semántica actuales.
- **Frontend:** `ComandasTabla.tsx` habilita acciones según ABIERTA/CERRADA y no tiene anulación; `AtencionPage.tsx` administra modales y recarga el listado tras una acción. `frontend/src/modules/atencion/api.ts` concentra las llamadas mediante `clienteHttp`. La confirmación destructiva reutilizable existe en `useConfirm`/`ConfirmProvider` y se muestra en la guía compartida; el diálogo de cierre ofrece además un modal de confirmación. La interacción nueva debe seguir el patrón de confirmación y presentar el conflicto M6 sin retirar el registro del historial.
- **Contrato existente:** `SPRINT-2/S2-01-contrato-comanda.md` declara expresamente que sus DTO/doble son provisionales y que el contrato M4–M5–M6 no está aceptado por M6. El DTO admite ANULADA. La especificación anterior de cierre establece que CERRADA/ANULADA no se pueden cerrar, pero no define anulación ni facturación previa.
- **Conflicto/ambigüedad:** no se detectó conflicto en la evidencia #54/#201 ni en #206/#207 aportada. #54 dice “Comanda facturada” en un criterio, mientras el estado actual de factura diferencia ADEUDADA/PAGADA y la emisión es anterior al cobro; no está definido si basta existencia de factura o se refiere a factura pagada. No se debe equiparar facturada con pagada por inferencia. Tampoco se especifica si una Comanda CERRADA no facturada puede anularse, si se debe rechazar cualquier estado distinto de ABIERTA, ni la política para nuevas solicitudes sobre una ya ANULADA; los cuatro criterios no resuelven esos bordes.

### Affected Areas

- `backend/app/modules/atencion/service.py`, `router.py`, `repository.py` — transición, validaciones, operación transaccional y endpoint M4; sin cambio de esquema esperado.
- `backend/app/modules/atencion/adaptadores.py` — el adaptador M3 ya expone liberación sin commit; en principio se reutiliza.
- `backend/tests/modules/atencion/` — pruebas futuras por cada CA y límites; no se ejecutaron ni añadieron pruebas en esta exploración.
- `frontend/src/modules/atencion/{api.ts,types.ts,pages/AtencionPage.tsx,components/ComandasTabla.tsx,components/AtencionDialogs.tsx}` — acción, llamada, feedback/confirmación y actualización del listado. Reutilizar UI compartida; no modificar `shared/` salvo coordinación.
- `openspec/changes/HU-M4-06/specs/comanda-anulacion/spec.md` — capacidad delta nueva probable. Mantener alcance en anulación; excluir implementación de HU-M4-07 (listado), aunque el listado existente se conserva como historial.
- Coordinación de contrato, no modificación unilateral: servicio M6 para consulta de factura y definición del estado que bloquea; responsable Héctor. M3 no aparece como bloqueo de interfaz según la firma vigente de liberación.

### Approaches

1. **Anulación lógica en M4 con verificación pública de facturación acordada con M6** — M4 cambia ABIERTA a ANULADA y libera Mesa con su sesión, solo si M6 confirma que no existe la condición de factura definida por el equipo.
   - Ventajas: preserva historia y usa la transacción M4/M3 existente; respeta límites entre módulos.
   - Costos: exige acordar/exponer el mínimo contrato M6 y precisar si “facturada” significa factura emitida (incluida ADEUDADA) o pagada.
   - Esfuerzo: medio; coordinación M6 bloqueante para fijar el contrato.
2. **Consultar M6 directamente desde M4 o borrar la fila para evitar facturación** — no recomendado: implicaría acoplar capas internas/tablas ajenas o contrariar el criterio de trazabilidad.
   - Ventajas: ninguna ventaja arquitectónica demostrada sobre la opción anterior.
   - Costos: viola contratos de importación, puede perder historial y puede dejar Mesa, Comanda y Factura inconsistentes.
   - Esfuerzo: alto y no conforme a las reglas del repositorio.

### Recommendation

Avanzar a propuesta delimitada a la operación de anulación y sus cuatro criterios, no al listado de HU-M4-07. Reutilizar el estado ANULADA y conservar la fila; efectuar transición y liberación con `salon_service.liberar_mesa` en la misma transacción M4 (sin commit M3). Antes de fijar la spec, coordinar con Héctor/M6 el mínimo contrato de servicio público para determinar, por `comanda_id`, si existe factura y qué significa “facturada” para el rechazo. No usar el repositorio M6 desde M4 ni asumir que estado CERRADA equivale a no facturada. En la spec, marcar como pendiente la elegibilidad de estados distintos de ABIERTA y la repetición de anulación, en vez de decidirlas en silencio.

### Risks

- Sin contrato M6, M4 no puede determinar por una interfaz permitida si una factura ya fue emitida; omitir la comprobación incumpliría el CA de rechazo, e inspeccionar tablas/repositorios ajenos rompería el límite arquitectónico.
- La carrera entre consulta de factura en M6 y transición M4 podría permitir factura y anulación concurrentes. El contrato mínimo debe definir también cómo se evita o acepta esa carrera; una lectura aislada no acredita atomicidad entre módulos.
- Liberar Mesa y cambiar el estado sin una única sesión/transacción confirmada dejaría estados incompatibles. La firma actual M3 soporta sesión compartida y no hace commit, pero esto debe preservarse y probarse en implementación.
- “Facturada” puede referirse a factura emitida con saldo adeudado o a factura totalmente pagada; la HU y evidencia provista no lo aclaran. Es una decisión funcional que debe validar M6/persona responsable.
- El listado actual permite consultar y filtrar ANULADA, pero excluir o incluir el estado en una vista específica sería trabajo de listado (HU-M4-07) y no debe incorporarse aquí.
- No se identificó necesidad de migración: estado, Enum y persistencia histórica ya admiten ANULADA. Evitar cambios de esquema y operaciones de borrado.

### Ready for Proposal

**Sí, como borrador condicionado.** M4/M3 tienen una ruta técnica mínima clara y el estado histórico ya existe. La consulta pública M6 y la definición de “facturada” son dependencias obligatorias para cerrar el contrato; la propuesta debe exponerlas y no afirmar cumplimiento completo hasta su resolución. No se ejecutó `/sdd-apply` ni se hicieron cambios de código, pruebas, contratos, base de datos o acceso remoto.

**Resolución de skills:** `paths-injected` — se leyeron las rutas exactas solicitadas para `sdd-explore`, protocolo común y convención OpenSpec. `.atl/skill-registry.md` no indexa una skill aplicable adicional de código de aplicación; no se necesitó ninguna.
