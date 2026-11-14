# Especificación de anulación de Comanda

## Propósito

Definir la anulación lógica de Comandas creadas por error, con conservación histórica y liberación de la Mesa asociada, conforme a HU-M4-06 (#54). Esta capacidad no implementa ni modifica el listado de HU-M4-07.

## Requisitos

### Requisito: Confirmar y anular una Comanda ABIERTA no facturada

El sistema DEBE permitir que la persona usuaria solicite la anulación de una Comanda en estado ABIERTA únicamente después de una confirmación explícita en la interfaz. La operación DEBE verificar mediante el servicio público `pagos.service.esta_facturada(db, comanda_id) -> bool` que la Comanda no está facturada. El equipo autorizó agregar ese método público en M6 dentro de esta HU, delegando en la consulta existente del repositorio; no se deben alterar otras operaciones de Facturación. Mientras el método no esté disponible en runtime, la operación productiva DEBE fallar de forma controlada antes de modificar la Comanda o liberar la Mesa. Si es elegible, DEBE cambiar su estado a ANULADA y liberar la Mesa asociada dentro de una misma transacción bajo responsabilidad de M4. La fila y sus datos históricos DEBEN conservarse; NO DEBE ejecutarse un borrado físico ni requerirse un cambio de esquema.

La operación DEBE respetar los límites entre módulos: M4 no accede a repositorios, modelos ni tablas internas de M6. M6 expone `esta_facturada` delegando en la consulta del repositorio existente; cualquier Factura existente (`ADEUDADA` o `PAGADA`) cuenta como facturada. Se acepta para este sprint el riesgo de que una factura se genere entre la consulta y la anulación; la protección de concurrencia se difiere al sprint siguiente. No se implementarán locks, timers ni mecanismos equivalentes en esta HU. El servicio público existente de M3 `salon.service.liberar_mesa(db, mesa_id)` libera sin confirmar la transacción; la transacción conjunta queda a cargo de M4.

## Contrato HTTP confirmado

Prefijo `/api/v1`. `POST /api/v1/comandas/{comanda_id}/anular` no recibe cuerpo y responde `200` con `ComandaSalida`: `id`, `mesa_id`, `estado`, `fecha_hora`, `reserva_id`, `observaciones` y `detalles`. La ruta y la respuesta corresponden al router M4 real y están ejercitadas por las pruebas de anulación.

Errores observados por código y manejadores compartidos: `404` para Comanda inexistente (`NoEncontradoError`), `409` para estado no elegible, factura existente o consulta M6 no disponible (`ReglaDeNegocioError`), y `422` para `comanda_id` no positivo (`Path(gt=0)`/`RequestValidationError`). Las respuestas se serializan como `{"detalle":"mensaje"}` mediante `backend/app/main.py`; las pruebas HTTP focalizadas confirman éxito y conflictos de facturación/dependencia, mientras que `404` y `422` reutilizan los manejadores globales existentes.

S2-01 define DTOs y el doble provisional, no una API HTTP. Esta ruta es el contrato HTTP específico de HU-M4-06 y no requirió modificar S2-01.

#### Escenario: Confirmación y anulación exitosa

- **Dado** que una Comanda ABIERTA no está facturada según la definición y el contrato público acordados con M6, y que la persona usuaria inicia la anulación.
- **Cuando** confirma explícitamente la acción.
- **Entonces** la Comanda queda en estado ANULADA, su Mesa asociada queda liberada, ambas modificaciones se confirman conjuntamente y la Comanda permanece almacenada con sus datos históricos.

#### Escenario: Cancelar la confirmación en la interfaz

- **Dado** que la persona usuaria inició la acción de anular una Comanda ABIERTA.
- **Cuando** rechaza o cierra el diálogo de confirmación sin confirmar.
- **Entonces** no se solicita ni ejecuta la anulación y no cambian el estado de la Comanda ni el de la Mesa.

#### Escenario: Rechazar Comanda facturada e informar el motivo

- **Dado** que M6 determina mediante su contrato público acordado que la Comanda está facturada.
- **Cuando** la persona usuaria confirma su anulación.
- **Entonces** la anulación se rechaza, la Comanda no pasa a ANULADA, la Mesa no se libera y se informa a la persona usuaria que no se puede anular porque está facturada.

#### Escenario: Rechazar estado distinto de ABIERTA

- **Dado** que la Comanda está en un estado distinto de ABIERTA.
- **Cuando** se solicita anularla.
- **Entonces** no se realiza la transición a ANULADA ni se libera la Mesa.

El requisito limita la elegibilidad a ABIERTA, por lo que los demás estados se rechazan como conflicto de negocio `409` con `detalle`.

#### Escenario: Revertir ambos cambios si falla la liberación de Mesa

- **Dado** una Comanda ABIERTA no facturada cuya anulación fue confirmada.
- **Cuando** falla la liberación de su Mesa durante la operación.
- **Entonces** la transacción no confirma parcialmente: la Comanda no queda ANULADA y la Mesa conserva su estado previo.

### Requisito: Conservar Comandas anuladas para trazabilidad

El sistema DEBE conservar una Comanda anulada y sus datos históricos para trazabilidad. La anulación NO DEBE eliminar físicamente la fila ni retirar la Comanda del historial existente. Este requisito no introduce una nueva capacidad de listado, no cambia filtros ni presentación del listado y no incluye el alcance de HU-M4-07.

#### Escenario: Comanda anulada sigue disponible en el historial existente

- **Dado** que una Comanda fue anulada correctamente.
- **Cuando** se consulta el historial mediante las capacidades existentes.
- **Entonces** la Comanda continúa almacenada y disponible con estado ANULADA y sus datos históricos conservados; esta HU no agrega ni modifica la operación de listado.

## Dependencias y preguntas pendientes

- **M6, cambio autorizado por el equipo:** agregar `pagos.service.esta_facturada(db, comanda_id) -> bool`, delegando en la consulta de repositorio existente. No alterar otros comportamientos de Facturación.
- **Riesgo aceptado/diferido:** puede generarse una factura entre la comprobación y la anulación. Se difiere la protección contra concurrencia al sprint siguiente; esta HU no introduce locks, timers ni mecanismos de concurrencia.
- **Contrato HTTP M4:** ruta y respuesta confirmadas según el router real; S2-01 continúa siendo solo el contrato provisional de DTO/doble y no define endpoints.
- **Límites no especificados por #54:** política para repetir una anulación sobre estado ANULADA y respuesta para identificador inexistente no se fijan aquí; deberán precisarse si el contrato de API requiere cubrirlos.
- La liberación usa el contrato público actual de M3 sin commit propio; M4 mantiene la propiedad de confirmar o revertir conjuntamente.
