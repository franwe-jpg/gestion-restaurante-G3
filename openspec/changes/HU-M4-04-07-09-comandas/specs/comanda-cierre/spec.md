# Especificación de cierre de Comanda (borrador de integración)

## Propósito y fuentes

Cerrar una Comanda sin facturarla ni cobrarla aquí. Los cuatro CA de [#58](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/58) se conservan en orden. **Estado actual:** validación/cierre, lectura y error A02 estructurados y confirmación frontend implementados; navegación real al marcado y consumo M6 pendientes. El aviso de pendientes se muestra antes de aceptar confirmación; no se implementa HU-M4-08.

## Contrato HTTP y datos propuestos

**Persistencia M4 existente, integración pendiente:** `Comanda` y `DetalleComanda` están en `backend/app/modules/atencion/models.py` y en la migración `e7c9a1b3d5f0_crea_comandas.py`. El modelo guarda estado, instante UTC mediante `InstanteUTC` y, por detalle, estado_entrega e importes históricos `Decimal` como `Numeric(10, 2)`; descuento absoluto, no porcentaje. RED monetario/UTC/downgrade y GREEN focalizado figuran en `apply-progress.md` (3/30); no acreditan alta o cierre productivos. El servicio futuro debe obtener y capturar valores al crear, sin recálculo al cerrar; fórmula, redondeo y alcance por unidad/línea pendientes. A02 exige revalidar pendientes antes de cambiar estado: el dato persistido no proporciona por sí solo lectura, marcado ni navegación para el aviso **previo**. La producción reutilizará `ComandaSalida`, `DetalleComandaSalida`, `EstadoComanda` y `EstadoEntrega` compartidos, mapeando desde ORM, sin DTO Pydantic paralelo. No se ratifica lectura M6 ni HTTP.

**Contrato local implementado sin alterar S2-01:** `POST /api/v1/comandas/{id}/cerrar` devuelve `200 ComandaSalida` compartido. `GET /api/v1/comandas/{id}/pendientes` devuelve `{comanda_id, pendientes:[{id, producto_id, menu_ejecutivo_id, cantidad}]}`; el ID es el persistente del detalle y los campos producto/menú/cantidad reutilizan `DetalleComandaCrear` por herencia. Son metadatos de operación, no un reemplazo del DTO de salida. `DetalleComandaSalida` y los consumidores M5/M6 no se modifican. El frontend consulta pendientes antes de ofrecer confirmación, y el servidor revalida al cerrar. No se factura, cobra, entrega ni admite bypass.

**Errores locales implementados:** inexistente → `404`; CERRADA/ANULADA → `409 detalle`; datos/ID inválidos → `422 detalle`. Ante entregas pendientes, una excepción M4 derivada de `ReglaDeNegocioError` produce `409` con `detalle`, `comanda_id` y `pendientes` con la misma estructura del GET. No se cambia el manejador genérico ni los DTO compartidos. El fake histórico sigue lanzando solo mensajes y no se afirma que cumpla esta extensión M4. El cliente HTTP común conserva solo `detalle` en errores, por lo que el frontend reconsulta el GET ante rechazo y mantiene bloqueada la confirmación si falla la lectura. No se certifica bloqueo simultáneo entre lectura y escritura.

## Requisitos

### Requisito: Confirmar transición a CERRADA (#58 CA01)

Al confirmar el cierre de una Comanda ABIERTA con productos, el sistema DEBE cambiar su estado a CERRADA según #58 CA01. **Decisión A02 aprobada, adicional al criterio original:** si hay productos PENDIENTES, no puede aceptarse confirmación; después de entregarlos, la confirmación normal cierra la Comanda.

#### Escenario: CA01 — Cierre confirmado

- **Dado** una Comanda ABIERTA con productos registrados y todos entregados, lista para confirmación conforme a A02.
- **Cuando** el mozo confirma su cierre.
- **Entonces** la Comanda pasa a estado CERRADA.

El CA original no impone la condición de entrega; A02 la agrega por decisión de la persona. No se afirma que un cierre con pendientes cumpla CA01: primero deben entregarse, luego puede confirmarse normalmente.

#### Escenario: A02 — Confirmación tras completar entregas

- **Dado** una Comanda ABIERTA con productos registrados y todos sus detalles ENTREGADOS.
- **Cuando** el mozo confirma el cierre normalmente después de que se completaron las entregas.
- **Entonces** la Comanda pasa a estado CERRADA; no se realiza una segunda confirmación especial.

### Requisito: Impedir nuevas incorporaciones y permitir facturar (#58 CA02)

Después de cerrar, el sistema NO DEBE permitir agregar más productos a la Comanda y DEBE dejarla lista para facturar. La incorporación posterior pertenece a otra HU y no se crea aquí un endpoint artificial para ella.

#### Escenario: CA02 — Límite tras el cierre

- **Dado** una Comanda previamente ABIERTA que se cerró correctamente.
- **Cuando** se intenta agregarle un producto y se consulta su disponibilidad para facturación.
- **Entonces** se rechaza la incorporación y la Comanda permanece CERRADA y lista para facturar.

**Cobertura pendiente:** no existe todavía operación productiva de agregar productos; el doble S2-01 solo permite comprobar el estado/consulta, no el rechazo de esa incorporación. La prueba integral requiere la futura HU de incorporación y coordinación con M6.

### Requisito: Advertir entregas pendientes antes de confirmar (#58 CA03)

Ante productos sin entregar, el sistema DEBE advertirlo **antes** de solicitar o aceptar confirmación. La HU no prescribe bloqueo posterior; **A02 aprobada para este cambio** sí lo prescribe, e incluye informar cuáles productos están pendientes y ofrecer navegación a la pantalla donde puedan marcarse como entregados. No se marca ninguno automáticamente. La advertencia previa no se satisface con un error después de intentar confirmar.

#### Escenario: CA03 — Aviso previo de pendientes

- **Dado** una Comanda ABIERTA con al menos un producto sin entregar y sin confirmación de cierre todavía.
- **Cuando** el mozo inicia el intento de cierre.
- **Entonces** se le advierte **antes de cualquier confirmación aceptable** cuáles productos están pendientes, se identifican por los IDs persistentes de sus DetalleComanda, se ofrece navegar a su marcado como entregados y no se permite confirmar el cierre mientras sigan pendientes; la Comanda no cambia por el aviso.

#### Escenario: A02 — Bloqueo sin entregas automáticas

- **Dado** una Comanda ABIERTA con productos pendientes, incluso si su estado cambió desde una consulta previa.
- **Cuando** se intenta cerrar mientras aún hay pendientes.
- **Entonces** no se cierra ni se marca ningún producto como entregado; el bloqueo devuelve los IDs de los DetalleComanda pendientes y se informa cuáles siguen pendientes, manteniendo navegación al marcado sin aceptar confirmación de cierre.

**Dependencia de integración restante:** `AtencionPage` y `CierreComandaDialog` ya muestran los detalles pendientes por ID/referencia/cantidad sin permitir cierre ni marcado. No hay pantalla de entregas para enlazar; se informa el bloqueo en vez de inventar navegación. Por ello CA03 sigue parcialmente pendiente de esa navegación, aunque aviso previo y bloqueo estructurado están implementados y probados. El retorno de IDs no requiere agregar campos al DTO compartido.

### Requisito: Dejar disponible para facturación (#58 CA04)

Una Comanda cerrada correctamente DEBE quedar disponible para continuar el proceso de facturación con sus importes históricos y su instante UTC sin alteraciones ni recálculo, sin emitir factura ni registrar pago en este cambio.

#### Escenario: CA04 — Consulta posterior al cierre

- **Dado** que una Comanda se cerró correctamente.
- **Cuando** finaliza la operación y el consumidor de facturación consulta su estado.
- **Entonces** la encuentra CERRADA y disponible para continuar la facturación, sin que el cierre haya facturado o cobrado.

### Requisito: No repetir un cierre (D-24)

El sistema NO DEBE ejecutar otra transición de cierre sobre una Comanda ya CERRADA.

#### Escenario: Segundo cierre

- **Dado** una Comanda ya CERRADA.
- **Cuando** se intenta cerrarla de nuevo.
- **Entonces** no se ejecuta un segundo cierre; **Supuesto:** la respuesta pública propuesta es `409` con `detalle`.

## Integración pendiente antes de fijar el contrato

Los metadatos A02 y la confirmación normal ya están probados localmente; falta destino real de marcado, incorporación posterior y consumo M6. No hay aceptación compartida atribuida ni se declara cobertura íntegra de #58 CA02/CA03/CA04. La salida del pedido sigue usando S2-01; los esquemas de metadatos locales no se promueven a contrato de otros módulos.
