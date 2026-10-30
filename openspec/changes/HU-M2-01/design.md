# Diseño: HU-M2-01 Crear un menú ejecutivo

## Decisión

Modelar `MenuEjecutivo` en M2 y relacionarlo con `Producto` mediante una tabla de asociación. La composición no se guarda como JSON: la relación mantiene referencias verificables a productos existentes.

## Backend

- `menus.models`: entidad `MenuEjecutivo` con nombre normalizado, descripción, `Numeric(10,2)`, estado `HABILITADO`, `seccion_id`, restricción `precio_fijo > 0` e índice único por nombre normalizado.
- Tabla de asociación con clave primaria compuesta y FK a `menus_ejecutivos` y `productos`; el borrado físico de la asociación sigue la vida de la fila del menú, mientras las referencias a productos restringen borrados.
- `menus.repository`: agrega el menú, consulta nombre normalizado y lista con relaciones necesarias. Consulta productos a través de `app.shared.models.producto.Producto`, que es el modelo compartido; no importa `productos.models`, `productos.repository` ni `productos.schemas`.
- `menus.service`: valida todo antes de escribir, consulta la sección mediante `productos.service.obtener_seccion`, verifica existencia/estado/categoría de productos y revierte la sesión ante fallas. Asigna el estado inicial; el cliente no puede establecerlo.
- `menus.schemas`: rechaza campos extra; separa entrada, salida y resumen de lista.
- `menus.router`: `POST` de alta y `GET` paginado; se registra en `main.py`.
- Migración Alembic posterior a `b2d4f6a8c0e1`, con downgrade completo de las dos tablas nuevas y sus índices.

## Frontend

- M2 mantiene sus propios tipos y llamadas en `types.ts` y `api.ts`; no importa archivos internos de `productos`.
- El selector consulta productos y secciones habilitadas desde las rutas públicas, oculta `MENU_DEL_DIA` y permite una selección múltiple como chips. La API vuelve a validar cada ID al guardar.
- Formulario con validación local para obligatorios, precio y selección; el servidor sigue siendo autoridad. Errores 409 se muestran junto al campo correspondiente y el éxito actualiza el listado y notifica.
- Reemplazar el `EmptyState` de la pantalla M2 por la gestión de alta/listado del menú ejecutivo. No introducir controles de edición/baja ni cambiar la carta pública.

## Consistencia y reversión

- Reutilizar `Estado`, `Categoria`, `normalizar_nombre` y `Pagina` de `app.shared`; usar las excepciones de `app.shared.excepciones`.
- Las pruebas de migración operan sobre una base temporal. El downgrade de prueba elimina solo `menus_ejecutivos` y su asociación, y conserva `productos` y `secciones`.
- El registro del router en `app/main.py` es un cambio de integración compartido, necesario para exponer la API.

## Decisiones que requieren confirmación

Revisar los puntos de longitud/precisión, tildes, IDs repetidos y alcance de `/carta` en `specs/menus-ejecutivos/spec.md` antes de aplicar.
