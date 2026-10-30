# Exploración: HU-M2-01 Crear un menú ejecutivo

## Resultado

El alta requiere una entidad propia `MenuEjecutivo` y una relación persistente con uno o más productos; no alcanza con guardar la composición como JSON. El estado inicial y la sección deben validarse en el servidor, además de validaciones del formulario.

## Evidencia verificada

| Área | Evidencia | Implicación |
|---|---|---|
| Historia | Issue #21 abierto; sus relaciones muestran `None yet`. | No hay dependencia declarada en el issue. |
| Backend M2 | `menus/models.py` y `menus/router.py` contienen solo sus docstrings. | Falta modelo y API de menús ejecutivos. |
| Backend M1 | `Producto` vive en `app/shared/models/producto.py`; `productos.service.obtener_producto` exige categoría y no existe una consulta pública por lista de IDs en la base de `develop`. | No depender del helper que solo está en la rama de menú del día; consultar el modelo compartido desde el repositorio M2 o acordar una API pública aparte. |
| Secciones | `productos.service.obtener_seccion` ofrece una salida pública con estado; el service de productos ya rechaza secciones deshabilitadas al crear. | M2 puede validar sección existente/habilitada mediante el service público. |
| Frontend M2 | `MenusPage.tsx` muestra un estado pendiente; `api.ts` todavía consulta `/menus` usando `MenuPromocion`. | Reemplazar el prototipo por el flujo de menú ejecutivo, sin reutilizar archivos internos de M1. |
| Registro de rutas | `backend/app/main.py` registra productos y salón, no el router de menús. | El alta debe registrar el router M2 en la aplicación. |
| Persistencia | Las migraciones existentes forman la cadena `efdafc2a164c → a1c3e5f7b9d1 → c4e6a8b0d2f4 → f3a5c7e9b1d2 → b2d4f6a8c0e1`. | La nueva revisión debe seguir a `b2d4f6a8c0e1`; probar upgrade y downgrade en base temporal. |
| UI | La maqueta y el plan S2-05 prevén selector de sección, productos como chips y un listado; el plan delimita la integración con la carta pública de M1. | Mostrar el registro en el gestor M2; no alterar el contrato público de M1 sin coordinación. |

## Riesgos y preguntas para la revisión

- Persistencia nueva: el downgrade de la migración elimina las filas creadas en las tablas del menú ejecutivo.
- El plan local dice que la unicidad no distingue tildes, pero la normalización existente `strip().casefold()` no elimina diacríticos. La propuesta usa el helper existente y deja explícita esta diferencia para decisión.
- El issue dice que el menú se ofrece «en la carta»; el plan local interpreta que esta HU registra la sección y no amplía `/carta`, cuyo contrato pertenece a M1. Confirmar esa frontera antes de aplicar.
- La longitud máxima de nombre/descripción, la precisión del precio y el rechazo de IDs de producto repetidos no están definidos por el texto de la HU; se proponen valores alineados con Producto y se someten a revisión.

## Estado de preparación

Se consultó el issue #21 y se actualizó localmente `origin/develop`. La rama de HU se creó en un worktree separado desde `0bff1e0`; la rama activa de menú del día no se modificó. No se hicieron cambios de código.
