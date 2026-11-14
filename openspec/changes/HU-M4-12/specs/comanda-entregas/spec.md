# Delta para comanda-entregas (HU-M4-12)

Modifica la capacidad `comanda-entregas` de HU-M4-08 (aún sin archivar). Lo no mencionado acá no cambia.

## MODIFIED Requirements

### Requisito: Consultar el estado de entrega de los detalles (CA 2)

El sistema DEBE responder 200 con `EntregasComanda` para una comanda existente, con todos sus detalles ordenados por `id`, su `cantidad`, su `cantidad_entregada`, **su `cantidad_lista`** y su `estado_entrega`. Con todos los detalles `ENTREGADO`, la respuesta DEBE permitir saber que no falta servir nada (ningún detalle `PENDIENTE`). `DetalleEntrega` incorpora `cantidad_lista` (entero); `cantidad_lista` solo existe en los esquemas de M4 y NO modifica `backend/app/shared/contratos/comanda.py`.

#### Escenario: Comanda con pendientes y entregados

- DADO una comanda con un detalle `ENTREGADO` y otro `PENDIENTE` con 2 de 5 entregadas y `cantidad_lista` 3
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 200 con ambos detalles ordenados por `id`, cada uno con `cantidad`, `cantidad_entregada`, `cantidad_lista` y `estado_entrega`

#### Escenario: Detalle sin marcar listo

- DADO un detalle que nunca se marcó como listo
- CUANDO se consulta `GET /comandas/{comanda_id}/detalles`
- ENTONCES su `cantidad_lista` es 0

### Requisito: Modal «Entregas» en el listado de comandas (CA 1 y CA 2)

El modal «Entregas» DEBE mostrar, además de lo definido en HU-M4-08, el estado «Listo para servir» por línea (cantidad `max(cantidad_lista − cantidad_entregada, 0)`), con las tres etiquetas «Pendiente», «Listo para servir» y «Entregado». Los controles de entrega (−, +, «Entregar todo») DEBEN depender de `COMANDAS_OPERAR`; los de listo, de `COMANDAS_MARCAR_LISTO` (ver `comanda-listo-cocina`). Los controles de entrega NO DEBEN exigir que la línea esté marcada como lista.

#### Escenario: Insignia «Listo para servir»

- DADO una línea de `cantidad` 3, `cantidad_lista` 3 y `cantidad_entregada` 0
- CUANDO se muestra el modal
- ENTONCES se ve «Listo para servir» para las 3 unidades y «Entregar todo» sigue habilitado para un mozo

#### Escenario: Entregar sin que esté listo

- DADO una línea con `cantidad_lista` 0
- CUANDO el mozo pulsa «Entregar todo»
- ENTONCES se llama a `PUT .../entrega` con la cantidad completa y la línea queda «Entregado»

#### Escenario: Modo solo lectura para entrega

- DADO un usuario sin `COMANDAS_OPERAR` pero con `COMANDAS_MARCAR_LISTO` (chef)
- CUANDO abre el modal
- ENTONCES los controles de entrega no se muestran y los de listo sí

Los demás requisitos de `comanda-entregas` (registrar la cantidad entregada, migración de la cantidad entregada, acceso desde el cierre) NO cambian.
