# Delta para control-de-acceso (HU-M4-12)

Modifica la capacidad `control-de-acceso` de HU-TR-01 (aún sin archivar). Agrega el permiso `COMANDAS_MARCAR_LISTO` a la matriz de M4. Lo no mencionado acá no cambia.

## MODIFIED Requirements

### Requisito: Matriz única de permisos (M4 Atención al Público)

La matriz de M4 DEBE quedar así (E encargado, M mozo, C chef):

| Endpoints | E | M | C |
| --- | --- | --- | --- |
| `GET /comandas`, `GET /comandas/{id}`, `GET /comandas/{id}/detalles`, `GET /comandas/{id}/pendientes` | Sí | Sí | Sí |
| `PUT /comandas/{id}/detalles/{detalle_id}/listo` (**nuevo**, `COMANDAS_MARCAR_LISTO`) | Sí | Sí | Sí |
| `POST /comandas`, `PUT /comandas/{id}`, `PUT /comandas/{id}/detalles/{detalle_id}/entrega`, `POST /comandas/{id}/cerrar`, `/reabrir`, `/anular` | Sí | Sí | 403 |
| `GET /clientes`, `PUT /clientes/{id}` | Sí | Sí | 403 |

- `Permiso.COMANDAS_MARCAR_LISTO` se agrega en `backend/app/shared/permisos.py` y se asigna a chef, mozo y encargado. El chef NO recibe `COMANDAS_OPERAR`. La misma asignación DEBE replicarse en `frontend/src/shared/auth/permisos.ts`.
- La autorización se evalúa después de la autenticación y antes de validar el cuerpo (403 antes que 422).

#### Escenario: Chef marca listo pero no entrega ni cierra (CA-2)

- DADO un chef con sesión y una comanda `ABIERTA` con un detalle pendiente
- CUANDO llama a `PUT /comandas/{id}/detalles/{detalle_id}/listo` con un cuerpo válido
- ENTONCES responde 200
- Y `PUT .../entrega`, `POST /comandas/{id}/cerrar` y `POST /comandas/{id}/anular` responden 403

#### Escenario: Mozo y encargado marcan listo (CA-2)

- DADO un mozo y un encargado con sesión
- CUANDO cada uno llama a `PUT .../listo` con datos válidos
- ENTONCES ninguno recibe 401 ni 403

#### Escenario: Sin sesión

- DADO una petición sin sesión
- CUANDO llama a `PUT .../listo`
- ENTONCES responde 401

#### Escenario: La matriz cubre la ruta nueva

- DADO la prueba que recorre `app.routes`
- CUANDO llama a `PUT .../listo` sin sesión
- ENTONCES responde 401 y la ruta declara un permiso (`test_cada_ruta_protegida_declara_un_permiso`)

La fila de `PUT .../listo` DEBE agregarse a la tabla parametrizada de la prueba de matriz (una verificación por rol).

### Requisito: Visibilidad en la interfaz según el rol (Atención)

Las filas de visibilidad de Atención DEBEN quedar así:

| Elemento | Encargado | Mozo | Chef |
| --- | --- | --- | --- |
| Atención: listado de comandas y detalle | Sí | Sí | Sí |
| Atención: abrir el diálogo de entregas («Entregas» con `COMANDAS_OPERAR`; «Ver detalle» sin él) y controles de listo (−, +, «Todo listo») | Sí | Sí | Sí |
| Atención: crear, editar, entregas (−/+/«Entregar todo»), cerrar, reabrir, anular; listado y edición de clientes | Sí | Sí | No |

El chef sigue sin ver crear, editar, cerrar, reabrir ni anular. Abre el diálogo de entregas con el botón «Ver detalle» que ya tiene el listado para los roles sin `COMANDAS_OPERAR` (diseño, L10); los controles de entrega dependen de `COMANDAS_OPERAR` y los de listo de `COMANDAS_MARCAR_LISTO`.

#### Escenario: El chef ve comandas y puede abrir las entregas (CA-2)

- DADO un chef con sesión en el listado de comandas
- CUANDO pulsa «Ver detalle» en una comanda
- ENTONCES se abre el diálogo de entregas, y NO aparecen los botones de crear, editar, cerrar, reabrir ni anular

#### Escenario: El chef no ve controles de entrega (CA-2)

- DADO un chef con sesión con el diálogo «Entregas» abierto
- CUANDO se muestra el diálogo
- ENTONCES aparecen los controles de listo y NO aparecen −, + ni «Entregar todo» de entrega

Este requisito reemplaza el escenario «El chef ve comandas sin botones de acción» de HU-TR-01 para la acción «Entregas» (las demás acciones siguen ocultas) y el escenario «Chef ve comandas y su detalle pero no las modifica», que mantiene sus 403 sobre entrega y cierre y suma el 200 de listo.
