# Propuesta: HU-M1-02-03 Modificar y dar de baja un plato

- **Issues:** [#3](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/3) HU-M1-02 Modificar un plato y [#4](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/4) HU-M1-03 Dar de baja un plato. Rama: `feature/HU-M1-02-03-modificar-baja-plato`.
- Un solo cambio para las dos HU (regla de agrupación de ABM del PR #179, aprobada por el responsable de M1 para este cambio).

## Intención

Hoy un plato solo se puede crear. Si cambia el precio, un ingrediente o la foto, o si el plato sale de la oferta, el encargado no tiene cómo reflejarlo. Esta HU agrega la modificación (incluida la reactivación) y la baja lógica, reutilizando las reglas y el formulario del alta (HU-M1-01).

## Alcance

### Incluido

- Consultar un plato por id, para cargar el formulario de edición.
- Modificar todos los datos del alta, la imagen (mantener, reemplazar o quitar) y el estado, con las mismas validaciones que HU-M1-01.
- Dar de baja con confirmación: el plato pasa a `DESHABILITADO`, se conservan sus datos y sale de `GET /api/v1/productos`.
- Frontend: pantalla de edición en ruta propia, que reutiliza página, `hook` y validador del alta en modo edición, y el botón «Dar de baja» con `ConfirmDialog`.
- Una prueba por criterio de aceptación de las dos HU.

### Excluido

- Listar productos y su filtro por estado (HU-M1-13, la construye Joaquín).
- Modificar o dar de baja postres y bebidas (otras HU), y la vista de la carta (HU-M1-14).
- Facturas y reportes (M6, Héctor). Cambios de esquema: la columna `estado` ya existe.

## Capacidades

### Nuevas

- Ninguna.

### Modificadas

- `carta-productos` (de HU-M1-01 y HU-M1-04, aún sin archivar): se agregan consultar, modificar, dar de baja y reactivar un plato.

## Enfoque

- **Backend:** `GET` y `PUT /api/v1/platos/{id}` (multipart, como el alta) y una operación de baja con `POST` sobre el subrecurso `/baja` (D-24). `service.modificar_producto` comparte con el alta la validación de sección, la unicidad (excluyendo el propio plato) y el manejo de imágenes. Un id que no es un plato responde 404.
- **Frontend:** `ProductoNuevoPage`, `useFormularioProducto` y `validarProducto` aceptan un plato inicial; el estado pasa a ser editable solo en edición. `shared/api/client.ts` necesita `PUT` multipart (archivo compartido, avisar §9.3); la baja reutiliza `post`.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S15 | Los estados Habilitado y Deshabilitado de las HU son `HABILITADO` y `DESHABILITADO` del código. |
| S16 | La pantalla de edición vive en `/productos/platos/:id/editar`. Hasta que exista HU-M1-13 se llega por URL directa; la lista futura enlazará a esa ruta. No se crea una lista provisoria. |
| S17 | CA 4 de HU-M1-03: el filtro por Deshabilitados es de HU-M1-13 (a cargo de Joaquín). Este cambio cubre solo la reactivación desde el formulario de modificación. |
| S18 | CA 4 de HU-M1-02 y CA 3 de HU-M1-03: `Factura` no existe en el código (`pagos/models.py` está vacío). El diagrama define `precioUnitario {copia al emitir}`, así que M6 copia el precio; aquí se prueba que modificar o dar de baja no borra ni altera filas existentes. |
| S19 | La sección se valida habilitada solo si cambia. Un plato puede reactivarse en una sección deshabilitada; no aparece en la carta hasta que la sección se habilite (CA 5). |
| S20 | La baja no se bloquea por menús (M2) ni comandas (M4); cada módulo decide cómo trata un producto deshabilitado. |
| S21 | Dar de baja un plato ya deshabilitado responde 409. |
| S22 | Al reemplazar o quitar la imagen, el archivo anterior se borra después del `commit`. Sin control de concurrencia: gana la última modificación. |
| S23 | Los textos de la pantalla se escriben en español neutro, sin el voseo de la maqueta («Puede volver a habilitarlo»). |

## Ronda de preguntas de la propuesta

Preguntas para que la persona valide (ritmo automático: se avanza con los supuestos):

1. ¿Dar de baja un plato que forma parte de un menú vigente (M2) debería advertirse o bloquearse? (S20; validar con el responsable de M2)

Resueltas: S19 sale del CA 5 de HU-M1-02 («vuelve a aparecer en la carta si su sección está habilitada»), y S16 lo decidió la persona (sin lista provisoria; HU-M1-13 la hace el responsable de M2).

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/{schemas,service,repository,router}.py`, `backend/tests/modules/productos/` | Modificado |
| `frontend/src/modules/productos/*` | Modificado |
| Compartidos (avisar §9.3): `frontend/src/shared/api/client.ts`, `frontend/src/App.tsx` | Modificado |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
| --- | --- | --- |
| El modo edición rompe el alta de platos y postres. | Media | Mantener verdes las pruebas existentes. |
| Frontend cerca o por encima de 800 líneas. | Media | Informativo; un solo PR. |
| M2, M4 o M6 esperan otra semántica de la baja. | Media | Avisar a los responsables con S18 y S20. |
| Delta sobre una spec sin archivar. | Baja | Archivar HU-M1-01 y HU-M1-04 antes. |

## Plan de reversión

Sin cambios de esquema ni migraciones. Revertir el merge en `develop`; los platos dados de baja conservan sus datos y se reactivan cambiando `estado`.

## Dependencias

- HU-M1-01 y HU-M1-04 integradas en `develop`.

## Criterios de éxito

- [ ] Cada criterio de aceptación de HU-M1-02 y HU-M1-03 tiene una prueba que pasa (CA 4 de HU-M1-03, solo la parte de reactivación).
- [ ] Las pruebas del alta de platos y postres siguen pasando.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida S15 a S23.
