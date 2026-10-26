# Propuesta: HU-M1-01 Crear un plato

- **Issue:** [#2](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/2). Tarea madre: #165. Rama: `feature/HU-M1-01-crear-plato`.

## Intención

El encargado no puede dar de alta platos: solo existen las secciones y un `GET /productos` de lectura (HU-M1-10). Sin platos, la carta, los menús (M2) y los pedidos (M4) no tienen contenido. Esta HU agrega el alta con imagen y deja el `service` que reutilizarán HU-M1-04 (postres) y HU-M1-07 (bebidas).

## Alcance

### Incluido

- `POST /api/v1/platos` (201, multipart) que cubre los 14 criterios de aceptación.
- Unicidad del nombre entre platos sin distinguir mayúsculas (columna e índice nuevos, migración de Alembic).
- Subida, validación por contenido y conversión de imágenes; servicio estático en `/media`.
- Filtro opcional `estado` en `GET /api/v1/secciones`.
- Frontend: página `/productos/nuevo`, botón «Nuevo plato» en la pestaña «Productos», listas con chips y selector de imagen (archivo y cámara).
- Una prueba por criterio de aceptación.

### Excluido

- Listar, modificar, deshabilitar o habilitar productos (otras HU).
- Rutas `/postres` y `/bebidas` (HU-M1-04, HU-M1-07).
- Vista de la carta (HU-M1-14).

## Capacidades

### Nuevas

- `carta-productos`: alta de platos con sus reglas (sección habilitada, nombre único por categoría, ingredientes, etiquetas, precio e imagen).

### Modificadas

- `carta-secciones`: el requisito «Listar secciones» admite el filtro opcional `estado`, sin cambiar la respuesta cuando no se envía.

## Decisiones tomadas

- **D1. Imágenes en el servidor.** Dependencias nuevas con versión exacta: `python-multipart`, `Pillow`, `pillow-heif` (se anuncian al equipo, §9.7). Solo JPG, PNG y HEIC; hasta 5 MB; validación con Pillow; HEIC se guarda como JPEG.
- **D2. Endpoint.** `service.crear_producto(...)` compartido; una ruta por categoría. Esta HU agrega `POST /api/v1/platos` con `categoria` fija en `PLATO`.
- **D3. Almacenamiento.** Carpeta local `MEDIA_DIR` (`config.py`, `.env.example`, `.gitignore`), servida con `StaticFiles` en `/media`. La base guarda el nombre del archivo; la API devuelve `imagen_url`.
- **D4.** `GET /api/v1/secciones` recibe un filtro opcional y retrocompatible `estado`, para el selector de sección.
- **D5. Unicidad.** Columna `nombre_normalizado` en `Producto` e índice único parcial `WHERE categoria = 'PLATO'`, en una revisión posterior a `a1c3e5f7b9d1`. Opción a evaluar en el diseño: un único índice sobre (`categoria`, `nombre_normalizado`), equivalente y sin índices por categoría.

## Enfoque

Capas `router → service → repository → models`. El `router` lee el `UploadFile` y pasa los bytes al `service` (contrato de `lint-imports`). Orden: validar datos y sección, validar y convertir la imagen, escribir el archivo, `commit`; si el `commit` falla, se borra el archivo. `shared/api/client.ts` acepta `FormData` sin fijar `Content-Type`.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | Unicidad del nombre con `casefold()` y espacios recortados; incluye platos deshabilitados. |
| S2 | Ingredientes y etiquetas repetidos se detectan con `casefold()` y espacios recortados. |
| S3 | Ingrediente de hasta 100 caracteres; hasta 50 ingredientes y 20 etiquetas por plato. |
| S4 | Precio de hasta 8 dígitos enteros y 2 decimales; la API usa punto y la pantalla acepta coma. |
| S5 | El nombre se recorta antes de contar los 100 caracteres. |
| S6 | Archivo `uuid4().hex` más extensión; JPG y PNG se reguardan sin metadatos; HEIC pasa a JPEG. |
| S7 | Una imagen inválida o un fallo al guardar cancela el alta completa. |
| S8 | Nombre repetido o sección deshabilitada → 409; sección inexistente → 404; datos o imagen inválidos → 422 con `{"detalle": ...}`. |
| S9 | La respuesta 201 devuelve `ProductoSalida` con `imagen_url` relativa (`/media/<archivo>`). |
| S10 | El estado no se elige al crear; el interruptor de la maqueta pasa a texto fijo «Habilitado». |
| S11 | La vista previa de HEIC puede no estar disponible antes de guardar. |
| S12 | El criterio 12 se cumple sirviendo la imagen como JPEG en `/media`; la carta es otra HU. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/modules/productos/*`, `backend/tests/modules/productos/` | Modificado |
| `backend/alembic/versions/` | Nueva migración |
| `frontend/src/modules/productos/*` | Modificado |
| Compartidos o ajenos (avisar, §9.3): `backend/app/shared/models/producto.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/.env.example`, `backend/requirements.txt`, `.gitignore`, `frontend/src/shared/api/client.ts`, `frontend/src/App.tsx` | Modificado |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Frontend ≈ 850 a 950 líneas frente al punto de control de 800. | Informativo; un solo PR, revisar código y pruebas por separado. |
| `pillow-heif` trae binarios. | Confirmar la instalación en Python 3.12 en la CI y en cada máquina. |
| Doble cabeza de Alembic por migraciones paralelas. | Verificar `alembic heads` antes del PR. |
| Archivos huérfanos si el proceso se corta antes del `commit`. | Aceptado en esta etapa. |
| `Form()` con listas y `UploadFile` en `fastapi==0.146.0`. | Prueba temprana; alternativa: parte `datos` en JSON. |

## Plan de reversión

- `alembic downgrade -1` elimina el índice y la columna `nombre_normalizado`; los datos de `productos` se conservan.
- Revertir el merge en `develop` y quitar las tres dependencias. Las imágenes de `MEDIA_DIR` se pueden borrar sin efecto en la base.

## Dependencias

- HU-M1-10 integrada (tablas `secciones` y `productos`).

## Criterios de éxito

- [ ] Cada criterio de aceptación tiene una prueba que pasa.
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] `alembic upgrade head` y `alembic downgrade -1` funcionan.
- [ ] El equipo valida S1 a S12 y las dependencias nuevas.
