# Exploración: HU-M1-10 Crear una sección de la carta

- **Issue:** #14 (épica #13, prioridad alta). Tarea madre: #165 (S2-M1).
- **Rama:** `feature/HU-M1-10-crear-seccion`

## Historia de usuario

Como encargado, quiero crear una sección de la carta para agrupar productos.

### Datos

- **Nombre** (obligatorio): hasta 50 caracteres, puede contener números. Único entre las secciones, sin distinguir mayúsculas.
- **Orden en la carta** (obligatorio): número entero mayor a cero. No se repite entre secciones habilitadas.
- **Productos** (opcional): productos habilitados que se muestran en la sección. Todo producto pertenece a una sola sección (es obligatoria al crearlo, HU-M1-01, HU-M1-04 y HU-M1-07). La sección puede crearse vacía.
- **Estado**: Habilitado o Deshabilitado. Lo asigna el sistema: toda sección nueva se crea Habilitada.

### Criterios de aceptación

1. Dado que cargo un nombre y un orden válidos, cuando guardo, entonces la sección queda Habilitada en esa posición de la carta y puedo asignarle productos.
2. Dado que falta el nombre o el orden, cuando intento guardar, entonces no se guarda y se me indica qué falta.
3. Dado un nombre que ya usa otra sección, cuando intento guardar, entonces el sistema advierte que la sección ya existe.
4. Dado un nombre de más de 50 caracteres, cuando intento guardar, entonces el sistema advierte que el nombre supera el largo permitido.
5. Dado un orden que no es un número entero mayor a cero, cuando intento guardar, entonces el sistema advierte que el orden es inválido.
6. Dado un orden que ya usa otra sección habilitada, cuando intento guardar, entonces el sistema advierte que esa posición está ocupada.
7. Dado que selecciono productos habilitados al crear la sección, cuando guardo, entonces aparecen en la carta dentro de esa sección.
8. Dado un producto que ya pertenece a otra sección, cuando lo selecciono, entonces se me avisa y, si confirmo, pasa a la nueva sección.

## Entidad en el diagrama de clases

Fuente: `SPRINT-0/G3 - Diagrama de clases unificado.drawio`.

`Seccion` (M1):

- `id: int`
- `nombre: str {≤ 50, único}`
- `orden: int {> 0, único entre habilitadas}`
- `estado: Estado = HABILITADO`
- Métodos: `agregarProducto(p)`, `modificar(datos)`, `deshabilitar()`, `habilitar()`.

Relaciones:

- `Seccion 1 — 0..* Producto` («agrupa»). La clave foránea `seccion_id` va en la tabla de productos.
- `Seccion 1 — 0..* MenuEjecutivo` (M2). M2 consumirá la sección a través del `service` de M1.
- `Producto`: `id`, `nombre` (≤ 100, único por categoría), `categoria`, `precio`, `ingredientes`, `descripcion`, `imagen`, `etiquetas`, `estado`. Sin subclases: usa el enum `Categoria`.

## Estado actual del código

### Backend

- Los archivos de `backend/app/modules/*/` (`router`, `service`, `repository`, `models`, `schemas`) son stubs de una línea. No hay ningún CRUD que sirva de patrón: esta HU fija el patrón que copiarán las demás.
- `shared/base_repository.py`, `shared/paginacion.py`, `shared/seguridad.py` y `shared/models/__init__.py` son stubs. Solo `shared/excepciones.py` está implementado (`NoEncontradoError` → 404, `ReglaDeNegocioError` → 409).
- `app/main.py` tiene los manejadores globales de errores (404, 409, 422 con `{"detalle": ...}`) y `/api/v1/salud`, pero no registra ningún router de módulo.
- `app/database.py` está completo (`Base`, `get_db`, WAL, `foreign_keys=ON`).
- `alembic/env.py` ya registra `app.shared.models` y `app.modules.productos.models`: no hay que tocarlo. Hay una sola migración, vacía (`efdafc2a164c_esquema_inicial_vacio.py`).
- `backend/tests/` solo tiene `test_salud.py` y `test_database.py`. No hay `conftest.py` ni `tests/modules/`.
- Los contratos de `import-linter` de `backend/pyproject.toml` ya cubren el módulo `productos`.

### Frontend

- `modules/productos/pages/ProductosPage.tsx` es un placeholder con `EmptyState`.
- `modules/productos/api.ts` y `types.ts` son stubs que no coinciden con el diagrama (`id: string`, `disponible`, `alergenos`).
- `shared/api/client.ts` solo expone `get` y `post`; alcanza para crear.
- `shared/components/ui/` ya tiene `dialog`, `form-field`, `input`, `select`, `checkbox`, `data-table`, `status-badge`, `confirm-dialog`, `toast`, `alert` y `empty-state`.
- La ruta `productos` ya está en `App.tsx` con carga diferida.

### Maqueta

- `SPRINT-2/S2-04-maqueta/productos.html`: pestaña «Secciones» con la leyenda «El orden define cómo aparecen las secciones en la carta.», botón «Nueva sección» y tabla con Orden, Nombre, Productos (cantidad), Estado y acciones.
- No hay maqueta del formulario de alta de sección: se diseña con el estilo existente y se anota en el PR.
- `producto-nuevo.html` tiene un select «Sección *» y `carta.html` muestra las secciones como píldoras.

### Otros módulos

Todos son stubs; ninguno consume todavía el `service` de M1.

## Superficie afectada

- `backend/app/modules/productos/`: `models.py`, `schemas.py`, `repository.py`, `service.py`, `router.py`.
- Fuera del módulo (coordinar, AGENTS.md §9.3): `backend/app/main.py` (primer `include_router` del proyecto), nueva migración en `backend/alembic/versions/`, `backend/tests/conftest.py`. Si `Producto` o el enum `Estado` van a `shared/models/` (D-05), también ese paquete.
- Pruebas: `backend/tests/modules/productos/test_service.py` y `test_router.py`.
- Frontend: `frontend/src/modules/productos/{types.ts, api.ts, pages/ProductosPage.tsx, components/*}` y sus `*.test.tsx`.

## Huecos y ambigüedades

1. **`Producto` no existe y su alta es de HU-M1-01.** Los criterios 7 y 8 no se pueden implementar ni probar sin la tabla `productos` con `seccion_id`. D-05 y S0-05 §8 (punto 4) ubican `Producto` en `shared/models/` como entidad compartida provisoria.
2. **Enum `Estado` (HABILITADO / DESHABILITADO).** No existe en el código. Hay que decidir si va en `shared/` (lo usan varios módulos) o en `productos/models.py`.
3. **Unicidad del nombre.** «Sin distinguir mayúsculas»: `NOCASE` de SQLite solo cubre ASCII. Hay que definir si se compara contra todas las secciones (también las deshabilitadas) y si se recortan los espacios.
4. **Unicidad del orden solo entre habilitadas.** Requiere un índice único parcial más la verificación en el `service`. Hay que definir si crear en una posición ocupada desplaza a las demás o se rechaza; el criterio 6 indica que se rechaza.
5. **Validación del orden.** Pydantic en modo laxo acepta `"3"` o `2.0`. Hay que usar entero estricto con `gt=0` para que «no entero» se rechace.
6. **Confirmación del criterio 8.** El formato de error solo transporta `{"detalle": ...}`. Hace falta un mecanismo de confirmación (por ejemplo, un campo `confirmar_traslado` en el cuerpo).
7. **Productos deshabilitados o inexistentes** en la selección: definir el código de respuesta.
8. **Respuesta del alta.** Para el criterio 7, la respuesta debería incluir los productos asignados. La carta en sí es de HU-M1-14.
9. **Listado de secciones.** La maqueta muestra la tabla, pero los criterios de HU-M1-10 solo hablan de crear. D-27 exige paginar los listados con `shared/paginacion.py`, que hoy es un stub.

## Enfoques

| Enfoque | Ventajas | Desventajas | Esfuerzo |
| --- | --- | --- | --- |
| A. `Seccion` completa + `Producto` solo como modelo y tabla (sin endpoints), en una migración | Cubre los 8 criterios; la clave foránea es real; HU-M1-01 parte con la tabla hecha | Adelanta parte de HU-M1-01; toca `shared/models/` si se respeta D-05; sube el tamaño del backend | Medio |
| B. Solo `Seccion` y criterios 1 a 6; criterios 7 y 8 en una HU posterior | Pequeño y rápido; no toca `Producto` | La HU queda incompleta | Bajo |
| C. Hacer HU-M1-01 antes que HU-M1-10 | Cada HU define su entidad | Contradice el orden de #165; además el producto exige una sección al crearlo, así que HU-M1-01 depende de HU-M1-10 | Medio |

El enfoque C tiene una dependencia circular: según el issue, la sección es obligatoria al crear un producto, así que HU-M1-01 necesita a HU-M1-10.

## Registro y migración

- `alembic/env.py` no requiere cambios.
- Nueva migración: tabla `secciones` (índice único por nombre normalizado e índice único parcial en `orden` para las habilitadas) y, en el enfoque A, tabla `productos` con `seccion_id`.
- Plan de reversión: el `downgrade` elimina las tablas creadas.
- `main.py`: registrar el router del módulo con el prefijo `/api/v1`.

## Estimación de tamaño

- **Backend:** unas 330 líneas de código más unas 250 de pruebas con el enfoque A (≈ 580 en total, por encima del punto de control de 400). Con el enfoque B, entre 400 y 450.
- **Frontend:** entre 400 y 550 líneas, dentro del punto de control de 800. El selector de productos de los criterios 7 y 8 necesita listar productos habilitados, endpoint que hoy no existe.

## Riesgos

- Los criterios 7 y 8 dependen de `Producto`, que no existe.
- Es el primer CRUD del repositorio: el patrón (conftest, capas, errores) se va a copiar en los demás módulos.
- Tocar archivos compartidos (`main.py`, `shared/`) requiere avisar al equipo.
- El flujo de confirmación del criterio 8 es un `Supuesto:` que el equipo debe validar.
- Los stubs del frontend contradicen el diagrama y hay que alinearlos.
- R17 (S0-10): la baja de una sección en uso condiciona el diseño de la clave foránea y del estado para HU-M1-12.

## Siguiente paso

`sdd-propose`, una vez decidido el enfoque (A, B o C) y validados los supuestos.
