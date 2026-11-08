# Propuesta: HU-M4-06 — Anular Comanda

## Intención

Permitir que el personal anule una Comanda creada por error sin borrar su historial, liberar la Mesa asociada y evitar la anulación cuando ya exista una factura, cumpliendo los criterios de aceptación del issue #54. El equipo autorizó incluir en esta HU el único método público M6 necesario para comprobar facturación en Comandas ABIERTAS; la operación M4 falla de forma controlada mientras ese método no esté disponible.

## Alcance

### Incluido
- Agregar a M4 la operación de anulación lógica, con confirmación explícita en la interfaz y conservación de la Comanda en estado `ANULADA` para trazabilidad.
- Rechazar la anulación si M6 determina, mediante su contrato público acordado, que la Comanda está facturada, e informar el motivo al usuario.
- Agregar en el servicio público de M6 `esta_facturada(db, comanda_id) -> bool`, delegando en la consulta existente del repositorio, sin alterar `generar_factura`, `previsualizar_factura` ni otras reglas de facturación.
- Liberar la Mesa mediante el servicio público existente de M3 y coordinar la transición y liberación dentro de la transacción de M4.
- Añadir pruebas para los criterios de aceptación y los límites que queden definidos en la especificación.

### Fuera de alcance
- HU-M4-07 y cualquier cambio del listado; no se reimplementará el listado ni se excluirán Comandas anuladas del historial.
- Cualquier cambio M6 fuera de `esta_facturada(db, comanda_id) -> bool` y su prueba focalizada; el equipo autorizó explícitamente solo ese método para esta HU.
- Borrado físico, cambios de esquema o migraciones, que no se esperan porque el estado `ANULADA` y la persistencia histórica ya existen.
- Resolver por inferencia si “facturada” significa factura emitida (incluida ADEUDADA) o factura pagada, ni otros bordes funcionales no establecidos por el issue.

## Capacidades

### Capacidades nuevas
- `comanda-anulacion`: anulación lógica de una Comanda no facturada, conservación histórica, liberación de Mesa y rechazo con explicación cuando ya está facturada.

### Capacidades modificadas
- Ninguna. Las especificaciones principales existentes no contienen una capacidad de Comanda que deba modificarse.

## Enfoque

M4 incorporará una operación propia que valide la elegibilidad definida en la especificación, cambie el estado a `ANULADA` y delegue la liberación de la Mesa en `salon.service.liberar_mesa(db, mesa_id)`. La transición y la liberación deben compartir la sesión/transacción de M4; el servicio M3 no confirma la transacción. Por autorización expresa del equipo, M6 expondrá `esta_facturada(db, comanda_id) -> bool` en `pagos.service`, delegando a `repository.existe_factura_de_comanda`; no se altera otra lógica de facturación ni se accede a internals de M6 desde M4. La protección frente a facturación concurrente se difiere al próximo sprint; el riesgo queda aceptado y documentado, sin locks, timers ni mecanismos equivalentes ahora.

## Áreas afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `backend/app/modules/atencion/` | Modificada | Operación y endpoint de anulación, integrados con la transacción M4 y el contrato público M6 por acordar. |
| `backend/app/modules/atencion/adaptadores.py` | Reutilizada | Adaptador existente de liberación de Mesa mediante M3; no se prevé cambiar el contrato M3. |
| `backend/app/modules/pagos/service.py` | Modificada, autorización acotada | Agregar la única consulta pública `esta_facturada` delegando en el repositorio existente; no alterar otras reglas de facturación. |
| `backend/tests/modules/pagos/test_service.py` | Modificada | Pruebas focalizadas de factura existente/no existente para la nueva consulta pública. |
| `backend/tests/modules/atencion/` | Modificada | Pruebas de aceptación y límites de anulación. |
| `frontend/src/modules/atencion/` | Modificada | Acción con confirmación, llamada de API, comunicación de errores y actualización de la vista sin retirar el registro histórico. |
| `openspec/changes/HU-M4-06/specs/comanda-anulacion/spec.md` | Nueva (fase de especificación) | Contrato de comportamiento de anulación de esta HU. |

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Si M6 no tiene disponible `esta_facturada`, la anulación no puede verificar facturación. | El M4 fail-closed evita estado/Mesa parciales; M6 agrega en este cambio el wrapper público autorizado sobre el repositorio existente. |
| Una factura podría generarse entre la comprobación y la anulación. | Riesgo aceptado por el usuario y Héctor para este sprint; los controles de concurrencia se difieren al sprint siguiente. Sin locks, timers ni mecanismos equivalentes ahora. |
| La HU no aclara si factura emitida pero ADEUDADA impide anular, ni define todos los estados elegibles o solicitudes repetidas. | Marcar estos puntos como decisiones funcionales pendientes en la especificación, sin asumir equivalencia entre facturada y pagada. |
| Una transacción no compartida podría dejar Comanda y Mesa en estados incompatibles. | Preservar la semántica actual de M3 (sin commit propio) y verificar rollback conjunto en pruebas. |

## Plan de reversión

Revertir los cambios de la operación, endpoint, interfaz y pruebas de HU-M4-06 mediante la reversión del cambio integrado. No se espera migración ni cambio de esquema; el estado histórico `ANULADA` y las Comandas ya anuladas no deben borrarse como parte de una reversión. Si el contrato M6 acordado aún no se integró, M4 deberá retirar únicamente su uso coordinado, sin modificar ni revertir trabajo de M6.

## Dependencias

- Servicio público de M6 `pagos.service.esta_facturada(db, comanda_id) -> bool`, autorizado por el equipo y agregado en esta HU delegando al repositorio existente.
- Riesgo aceptado: una factura puede generarse entre la consulta y la anulación. La protección se difiere al próximo sprint y queda fuera de este alcance.
- Servicio actual de M3 `salon.service.liberar_mesa(db, mesa_id)`, que libera sin confirmar la transacción.
- HU-M4-06, issue #54. HU-M4-07 queda fuera de este cambio.

## Criterios de éxito

- [ ] La persona usuaria confirma la anulación antes de ejecutarla.
- [ ] Una Comanda elegible y no facturada queda en estado `ANULADA`, conserva sus datos históricos y libera la Mesa en la misma transacción.
- [ ] La anulación de una Comanda facturada se rechaza con una explicación útil, usando exclusivamente el contrato público M6 acordado.
- [ ] La Comanda anulada continúa disponible en el historial existente; esta HU no implementa cambios del listado.
- [ ] Las pruebas cubren los criterios de aceptación y los límites definidos, incluyendo el rollback si falla la operación transaccional.
- [ ] No se incorporan cambios de esquema ni acceso de M4 a capas internas de M6.
