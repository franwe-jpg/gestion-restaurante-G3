# Especificación de comanda-listo-cocina (HU-M4-12)

## Propósito

Permitir que el chef avise qué cantidad de cada línea de una comanda ya salió de cocina, para que el mozo distinga lo pendiente, lo listo en espera de servir y lo entregado. Capacidad nueva del módulo M4 (Atención al Público). Entidades del diagrama de clases: `Comanda`, `DetalleComanda`. Cumple la historia HU-M4-12 (issue #242: «Como chef, quiero marcar un producto como listo para avisar al mozo que ya puede servirlo»). Depende de HU-M4-08 (entregas por cantidad) y HU-TR-01 (roles).

## ADDED Requirements

## Contrato de la API

Prefijo `/api/v1`. Errores con formato `{"detalle": "mensaje"}` (D-26) y códigos de D-25. Requiere sesión (HU-TR-01).

| Ruta | Permiso | Éxito | Errores |
| --- | --- | --- | --- |
| `PUT /comandas/{comanda_id}/detalles/{detalle_id}/listo` | `COMANDAS_MARCAR_LISTO` (chef, mozo, encargado) | 200, `EntregasComanda` | 401, 403, 404, 409, 422 |
| `GET /comandas/{comanda_id}/detalles` (ampliada) | `COMANDAS_VER` | 200, `EntregasComanda` | 401, 403, 404, 422 |

- `comanda_id` y `detalle_id` son enteros mayores a 0; otro valor responde 422.
- Cuerpo de `PUT`: `{"cantidad_lista": n}`, con `n` entero estricto, `0 ≤ n ≤ cantidad` de ese detalle. Un valor no entero (texto, decimal, booleano, `null`), negativo, mayor que `cantidad`, ausente o con campos extra responde 422 (`ListoDetalle`: `extra=forbid`, `StrictInt`, `ge=0`).
- `PUT` fija la cantidad lista **absoluta**, no un incremento. Cubre marcar parcial, «todo listo» (`n = cantidad`) y corregir bajando (hasta 0). Repetir el mismo valor es idempotente: 200 sin cambios.
- `DetalleEntrega` (esquema local de M4) agrega `cantidad_lista` (entero). Los demás campos no cambian: `id`, `producto_id`, `menu_ejecutivo_id`, `cantidad`, `cantidad_entregada`, `estado_entrega`. `EntregasComanda` no cambia de forma (`comanda_id`, `estado`, `detalles` ordenados por `id`).
- `backend/app/shared/contratos/comanda.py` (`DetalleComandaSalida`, `EstadoEntrega`) NO cambia (Supuesto S7): `cantidad_lista` solo se expone en los esquemas de M4.
- Orden de validación de `PUT`: 401 sin sesión; 403 sin permiso (antes de validar la ruta y el cuerpo); 422 de ruta y de cuerpo; 404 de comanda inexistente; 404 de detalle inexistente o de otra comanda; 409 de comanda no `ABIERTA`; 409 de línea entregada por completo; 422 de `n > cantidad` (depende del detalle). Nada se guarda si algo falla.
- Datos: columna nueva `detalles_comanda.cantidad_lista` (entero, no nulo, por defecto 0, restricción `ck_detalles_comanda_cantidad_lista_rango`: `0 ≤ cantidad_lista ≤ cantidad`), agregada con una migración de Alembic con `down_revision = "b8d0f2a4c6e8"` (rebasar si `develop` cambia la cabeza).
- Estados derivados por unidad de una línea (no se persisten):
  - entregadas = `cantidad_entregada`;
  - listas en espera de servir = `max(cantidad_lista − cantidad_entregada, 0)`;
  - pendientes = `cantidad − max(cantidad_lista, cantidad_entregada)`.
  Las tres suman `cantidad`.
- `registrar_entrega` (HU-M4-08) NO depende de `cantidad_lista` y no la modifica.
- Supuesto S1: «listo» se registra por cantidad en cada línea (supuesto del issue).
- Supuesto S2: el mozo puede entregar sin que el chef haya marcado listo (supuesto del issue).
- Supuesto S3: CA3 se rechaza con 409 solo si `cantidad_entregada = cantidad`; con entrega parcial se puede marcar listo.
- Supuesto S4: si `cantidad_lista < cantidad_entregada`, las unidades entregadas cuentan como entregadas y no como listas.
- Supuesto S5: solo una comanda `ABIERTA` admite marcar listo; `CERRADA` o `ANULADA` responden 409.
- Supuesto S6: el chef marca listo pero no registra entregas, ni cierra, ni anula; el mozo y el encargado hacen ambas cosas (supuesto del issue).
- Supuesto S7: el contrato compartido y la pantalla de inicio no muestran «listo» (fuera de alcance).
- Supuesto S8: orden de validación entre los dos 409 y el 422 de tope: primero 409 por estado de la comanda, luego 409 por línea entregada, luego 422 por `n > cantidad`.
- Supuesto S9: comanda inexistente o detalle de otra comanda responden 404 con mensajes distintos (como HU-M4-08).
- Supuesto S10: marcar listo no cambia `estado_entrega` ni la regla de cierre A02.

## Requisitos

### Requisito: Marcar la cantidad lista de un detalle (CA 1)

El sistema DEBE fijar `cantidad_lista` del detalle indicado de una comanda `ABIERTA` y responder 200 con `EntregasComanda`. Los demás detalles y `cantidad_entregada` NO DEBEN cambiar. Una línea con `cantidad_lista > cantidad_entregada` DEBE figurar como «listo, en espera de servir» en esas unidades.

#### Escenario: Marcar un producto pendiente como listo (CA 1)

- DADO una comanda `ABIERTA` con un detalle de `cantidad` 3, `cantidad_lista` 0 y `cantidad_entregada` 0
- CUANDO el chef hace `PUT /comandas/{comanda_id}/detalles/{detalle_id}/listo` con `{"cantidad_lista": 3}`
- ENTONCES responde 200 con ese detalle en `cantidad_lista` 3 y `cantidad_entregada` 0 (3 unidades listas en espera de servir, 0 pendientes)
- Y `GET /comandas/{comanda_id}/detalles` muestra el mismo valor

#### Escenario: Listo parcial

- DADO un detalle de `cantidad` 10
- CUANDO se hace `PUT` con `{"cantidad_lista": 4}`
- ENTONCES responde 200 con `cantidad_lista` 4 (4 listas, 6 pendientes) y los demás detalles sin cambios

#### Escenario: Corregir bajando la cantidad

- DADO un detalle de `cantidad` 3 con `cantidad_lista` 3 y `cantidad_entregada` 0
- CUANDO se hace `PUT` con `{"cantidad_lista": 1}`
- ENTONCES responde 200 con `cantidad_lista` 1 (1 lista, 2 pendientes)

#### Escenario: Fijar en cero

- DADO un detalle con `cantidad_lista` 3
- CUANDO se hace `PUT` con `{"cantidad_lista": 0}`
- ENTONCES responde 200 con `cantidad_lista` 0

#### Escenario: Repetir el mismo valor es idempotente

- DADO un detalle con `cantidad_lista` 2
- CUANDO se hace `PUT` con `{"cantidad_lista": 2}` dos veces seguidas
- ENTONCES ambas respuestas son 200 con el mismo contenido y nada cambia

#### Escenario: Marcar listo con entrega parcial (S3)

- DADO un detalle de `cantidad` 10 con `cantidad_entregada` 4
- CUANDO se hace `PUT` con `{"cantidad_lista": 10}`
- ENTONCES responde 200 con `cantidad_lista` 10 y `cantidad_entregada` 4 (4 entregadas, 6 listas, 0 pendientes)

#### Escenario: Listo menor que lo entregado (S4)

- DADO un detalle de `cantidad` 10 con `cantidad_entregada` 6
- CUANDO se hace `PUT` con `{"cantidad_lista": 2}`
- ENTONCES responde 200 con `cantidad_lista` 2 y las 6 unidades entregadas cuentan como entregadas (0 listas en espera, 4 pendientes)

#### Escenario: El chef marca listo (CA 1)

- DADO un chef con sesión y una comanda `ABIERTA` con un detalle pendiente
- CUANDO hace `PUT .../listo` con un cuerpo válido
- ENTONCES responde 200

#### Escenario: Mozo y encargado marcan listo (S6)

- DADO un mozo con sesión y, por separado, un encargado
- CUANDO cada uno hace `PUT .../listo` con un cuerpo válido sobre una comanda `ABIERTA`
- ENTONCES ambos responden 200

#### Escenario: Marcar listo no cambia la entrega ni el cierre (S10)

- DADO una comanda `ABIERTA` con un único detalle `PENDIENTE`
- CUANDO se marca toda su cantidad como lista
- ENTONCES `estado_entrega` sigue `PENDIENTE` y `POST /comandas/{comanda_id}/cerrar` responde 409 (regla A02)

### Requisito: Entregar un producto listo (CA 2)

Un detalle con unidades listas DEBE poder entregarse con `PUT .../entrega` (HU-M4-08), y esas unidades DEBEN pasar a contarse como entregadas. El sistema NO DEBE exigir que el detalle esté marcado como listo para entregarlo (S2).

#### Escenario: El mozo entrega un producto listo (CA 2)

- DADO un detalle de `cantidad` 3 con `cantidad_lista` 3 y `cantidad_entregada` 0
- CUANDO el mozo hace `PUT .../entrega` con `{"cantidad_entregada": 3}`
- ENTONCES responde 200 con `estado_entrega` `ENTREGADO` y `cantidad_entregada` 3 (3 entregadas, 0 listas en espera, 0 pendientes)

#### Escenario: Entregar sin que el chef haya marcado listo (S2)

- DADO un detalle de `cantidad` 3 con `cantidad_lista` 0
- CUANDO el mozo hace `PUT .../entrega` con `{"cantidad_entregada": 3}`
- ENTONCES responde 200 con `estado_entrega` `ENTREGADO`

#### Escenario: Entrega parcial de lo listo

- DADO un detalle de `cantidad` 10 con `cantidad_lista` 10
- CUANDO el mozo entrega 4
- ENTONCES quedan 4 entregadas, 6 listas en espera de servir y 0 pendientes

### Requisito: Rechazar marcar listo un producto entregado (CA 3)

El sistema DEBE responder 409 con `{"detalle": ...}` cuando el detalle ya está entregado por completo (`cantidad_entregada = cantidad`), sin modificar el dato, aunque el valor pedido sea igual al actual (S3).

#### Escenario: Producto ya entregado (CA 3)

- DADO un detalle `ENTREGADO` de `cantidad` 3 con `cantidad_entregada` 3, en una comanda `ABIERTA`
- CUANDO se hace `PUT .../listo` con `{"cantidad_lista": 3}`
- ENTONCES responde 409 con `{"detalle": ...}` y `cantidad_lista` no cambia

#### Escenario: Producto entregado al que se intenta bajar el listo

- DADO el mismo detalle entregado por completo
- CUANDO se hace `PUT .../listo` con `{"cantidad_lista": 0}`
- ENTONCES responde 409 y `cantidad_lista` no cambia

### Requisito: Errores de validación y de estado

El sistema DEBE aplicar el orden de validación del contrato.

#### Escenario: Cantidad mayor que la pedida

- DADO un detalle de `cantidad` 10 en una comanda `ABIERTA` sin entregar
- CUANDO se hace `PUT .../listo` con `{"cantidad_lista": 11}`
- ENTONCES responde 422 con `{"detalle": ...}` y el detalle no cambia

#### Escenario: Cantidad negativa o no entera

- DADO un detalle cualquiera
- CUANDO se hace `PUT .../listo` con `-1`, `2.5`, `"dos"`, `true`, `null`, sin el campo o con un campo extra
- ENTONCES responde 422 y el detalle no cambia

#### Escenario: Identificador inválido

- DADO un `comanda_id` o `detalle_id` igual a 0 o no numérico
- CUANDO se hace `PUT .../listo`
- ENTONCES responde 422

#### Escenario: Comanda inexistente

- DADO un `comanda_id` que no existe
- CUANDO se hace `PUT .../listo` con un cuerpo válido
- ENTONCES responde 404 con `{"detalle": ...}`

#### Escenario: Detalle de otra comanda o inexistente (S9)

- DADO un `detalle_id` que no existe o que pertenece a otra comanda
- CUANDO se hace `PUT .../listo` con un cuerpo válido
- ENTONCES responde 404 y ningún detalle cambia

#### Escenario: Comanda no abierta (S5)

- DADO una comanda `CERRADA` o `ANULADA` con un detalle pendiente
- CUANDO se hace `PUT .../listo` con un cuerpo válido
- ENTONCES responde 409 y el detalle no cambia

#### Escenario: Sin sesión

- DADO una petición sin sesión
- CUANDO se hace `PUT .../listo`
- ENTONCES responde 401

#### Escenario: Prohibido antes que inválido

- DADO un usuario con sesión sin el permiso `COMANDAS_MARCAR_LISTO`
- CUANDO hace `PUT .../listo` con un cuerpo inválido
- ENTONCES responde 403 y no 422

(Ningún rol del sistema carece del permiso; la prueba usa un usuario con roles de prueba sin el permiso o verifica la matriz de permisos.)

### Requisito: Distinguir listo, pendiente y entregado al consultar (CA 4)

`GET /comandas/{comanda_id}/detalles` DEBE incluir `cantidad_lista` en cada detalle, de modo que el cliente derive las tres cantidades por línea con las fórmulas del contrato. La consulta NO DEBE cambiar de permiso (`COMANDAS_VER`), de orden ni de códigos.

#### Escenario: Comanda con listos, pendientes y entregados (CA 4)

- DADO una comanda con tres detalles: A de `cantidad` 2 con `cantidad_entregada` 2; B de `cantidad` 3 con `cantidad_lista` 3; C de `cantidad` 4 sin marcar
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 200 con los detalles ordenados por `id`, cada uno con `cantidad`, `cantidad_lista` y `cantidad_entregada`
- Y de ellos se derivan: A 2 entregadas; B 3 listas en espera de servir; C 4 pendientes

#### Escenario: El chef consulta el detalle

- DADO un chef con sesión
- CUANDO hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 200 con `cantidad_lista`

#### Escenario: Comanda inexistente

- DADO un `comanda_id` que no existe
- CUANDO se hace `GET /comandas/{comanda_id}/detalles`
- ENTONCES responde 404 con `{"detalle": ...}`

### Requisito: Migración de la cantidad lista

La migración DEBE agregar `cantidad_lista` y completarla para los datos existentes. DEBE poder revertirse sin tocar `cantidad_entregada` ni `estado_entrega`.

#### Escenario: Datos existentes

- DADO detalles con `estado_entrega` `ENTREGADO` y otros `PENDIENTE`
- CUANDO se aplica la migración
- ENTONCES los `ENTREGADO` quedan con `cantidad_lista = cantidad` y los `PENDIENTE` con 0 (nada figura como «listo, en espera de servir» por la migración)
- Y la restricción `0 ≤ cantidad_lista ≤ cantidad` se cumple en todas las filas

#### Escenario: Reversión

- DADO la migración aplicada
- CUANDO se ejecuta `alembic downgrade` de esa revisión
- ENTONCES la columna `cantidad_lista` y su restricción desaparecen y `cantidad_entregada` y `estado_entrega` se conservan

### Requisito: Estados y botones por rol en el diálogo de entregas (CA 1, CA 2 y CA 4)

El diálogo «Entregas» de `frontend/src/modules/atencion/` DEBE mostrar por cada línea su referencia, «{entregadas} de {cantidad}» y las tres cantidades derivadas con etiquetas «Pendiente», «Listo para servir» y «Entregado» (cada una con su insignia `Badge` y solo cuando su cantidad es mayor a 0; una línea sin cantidad en ningún estado intermedio muestra la insignia de su estado dominante). Los botones DEBEN depender del permiso:

| Control | Permiso requerido | Encargado | Mozo | Chef |
| --- | --- | --- | --- | --- |
| Listo: −, +, «Todo listo» | `COMANDAS_MARCAR_LISTO` | Sí | Sí | Sí |
| Entrega: −, +, «Entregar todo» | `COMANDAS_OPERAR` | Sí | Sí | No |
| Acción «Entregas» en cada fila del listado | `COMANDAS_VER` | Sí | Sí | Sí (abre el diálogo) |

- Con la comanda no `ABIERTA`, todos los controles DEBEN estar deshabilitados.
- Los controles de listo DEBEN estar deshabilitados en una línea entregada por completo; − con `cantidad_lista` 0 y + con `cantidad_lista` igual a `cantidad` también.
- Toda llamada a la API DEBE pasar por `frontend/src/modules/atencion/api.ts` (`marcarListo`, D-16). El permiso nuevo `COMANDAS_MARCAR_LISTO` se agrega a `frontend/src/shared/auth/permisos.ts` con la misma asignación que el backend.
- Supuesto S11: el chef sigue sin ver crear, editar, cerrar, reabrir ni anular en el listado; abre el diálogo con «Ver detalle» y, dentro de él, gana los controles de listo.

#### Escenario: Tres estados por línea (CA 4)

- DADO el diálogo con una línea de `cantidad` 10, `cantidad_entregada` 2 y `cantidad_lista` 7
- CUANDO se muestra
- ENTONCES la línea indica «2 de 10» y distingue 2 «Entregado», 5 «Listo para servir» y 3 «Pendiente»

#### Escenario: El chef marca listo (CA 1)

- DADO un chef con sesión y una línea «Pendiente» de `cantidad` 3 en una comanda `ABIERTA`
- CUANDO pulsa «Todo listo»
- ENTONCES se llama a `PUT .../listo` con `{"cantidad_lista": 3}` y la línea figura «Listo para servir»

#### Escenario: Sumar una unidad lista con +

- DADO una línea con `cantidad_lista` 2 de 10
- CUANDO se pulsa + de listo
- ENTONCES se llama a `PUT .../listo` con `{"cantidad_lista": 3}`

#### Escenario: El chef no ve controles de entrega (CA 2)

- DADO un chef con sesión
- CUANDO abre el diálogo «Entregas»
- ENTONCES ve los controles de listo y NO ve −, + ni «Entregar todo» de entrega
- Y en el listado NO ve crear, editar, cerrar, reabrir ni anular

#### Escenario: El mozo entrega un producto listo (CA 2)

- DADO un mozo con sesión y una línea «Listo para servir» de 3
- CUANDO pulsa «Entregar todo»
- ENTONCES se llama a `PUT .../entrega` con `{"cantidad_entregada": 3}` y la línea figura «Entregado»

#### Escenario: Producto entregado no admite listo (CA 3)

- DADO una línea entregada por completo
- CUANDO se muestra el diálogo
- ENTONCES los controles de listo están deshabilitados

#### Escenario: Comanda no abierta

- DADO una comanda `CERRADA` o `ANULADA`
- CUANDO se abre el diálogo
- ENTONCES muestra las líneas con sus tres estados y todos los controles deshabilitados

#### Escenario: Error al marcar listo

- DADO que `PUT .../listo` responde 409 (por ejemplo, otro mozo entregó la línea)
- CUANDO la persona pulsa un control de listo
- ENTONCES el diálogo muestra el mensaje de `detalle` y recarga los datos de la comanda

## Fuera de alcance

- Mostrar «listo» en la pantalla de inicio o ampliar `DetalleComandaSalida` / `EstadoEntrega` (contrato compartido de M4, M5 y M6).
- Cambiar la regla de cierre A02 o el estado de la comanda.
- Notificaciones en tiempo real al mozo (el aviso es una consulta).
- Marcar listo en comandas cerradas o anuladas.
- El 403 del chef en `GET /mozos` (se corrige en otro cambio).

## Pruebas mínimas

Una prueba por criterio de aceptación (CA1 a CA4) en backend y en frontend, más los casos de error y de límite de arriba (401, 403, 404, 409 no `ABIERTA`, 409 entregada por completo, 422 `n > cantidad` y cuerpo inválido, idempotencia, migración). Nombres `test_<función>_<caso>` en el backend.
