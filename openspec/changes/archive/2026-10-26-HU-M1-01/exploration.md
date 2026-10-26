# Exploración: HU-M1-01 Crear un plato

- **Issue:** #2 · **Rama:** `feature/HU-M1-01-crear-plato` · **Tarea padre:** #165
- **Entrada:** criterios de aceptación 1 a 14 del issue; decisiones de HU-M1-10 (`openspec/changes/archive/2026-10-25-HU-M1-10/design.md`, A1 a A10), que no se reexploran.

## 1. Estado actual relevante

| Pieza | Estado |
| --- | --- |
| `productos` (migración `a1c3e5f7b9d1`) | `nombre` String(100), `categoria` Enum (no nativo), `precio` Numeric(10, 2), `ingredientes` JSON, `descripcion` String(500) NULL, `imagen` String(255) NULL, `etiquetas` JSON, `estado`, `seccion_id` FK RESTRICT. Cubre todos los campos de la HU. |
| `Producto` en `backend/app/shared/models/producto.py` | Sin `nombre_normalizado` ni índice de unicidad. |
| Patrón de unicidad de HU-M1-10 | `Seccion.nombre_normalizado = nombre.casefold()` con `@validates("nombre")` e índice único (A1). Se reutiliza. |
| `productos/` (backend) | Solo `crear_seccion`, `listar_secciones` y `GET /productos` (selector de habilitados). No hay alta de productos. |
| `backend/requirements.txt` | No incluye `python-multipart`, `Pillow` ni `pillow-heif`. |
| `config.py` y `.env.example` | Solo `DATABASE_URL` y `CORS_ORIGIN`. No hay carpeta de archivos ni montaje estático. |
| S0-05 y S0-04 | Ninguna decisión D-xx ni RNF sobre subida de archivos. Aplican RNF-SEG-01 (validar todo en el backend), RNF-SEG-09 (errores sin rutas internas) y RNF-REN-03 (transacciones cortas). |
| `import-linter` | `service` no puede importar `fastapi`, y `router` no puede importar `repository` ni `models`. `UploadFile` vive solo en el `router`, que lee los bytes y se los pasa al `service`. |
| `GET /secciones` | Paginado; devuelve todas las secciones con su `estado`. No filtra por estado. |
| Frontend `shared/api/client.ts` | `post` fija `Content-Type: application/json` y hace `JSON.stringify`. No admite multipart. |
| Frontend `ProductosPage` | La pestaña «Productos» es un marcador pendiente; la pestaña «Secciones» ya existe. No hay ruta `/productos/nuevo`. |
| Componentes compartidos | `Input`, `Textarea`, `Select`, `FormField`, `Switch`, `Alert`, `Badge`, `Button`, `Card`, `Breadcrumbs`, `PageHeader`, `useApi`, `useToast`. No hay entrada de lista con chips ni selector de imagen. |

## 2. Hallazgos

### 2.1 Esquema

- Los tipos alcanzan: `Numeric(10, 2)` limita a 8 dígitos enteros y 2 decimales; `JSON` guarda las listas; `imagen` guarda un nombre de archivo.
- **Falta** la unicidad sin distinguir mayúsculas entre platos (criterio 3):
  - columna `productos.nombre_normalizado` (`casefold()`, no se expone en la API), mantenida por `@validates("nombre")` en `Producto` (patrón A1);
  - índice único **parcial** sobre `nombre_normalizado` con `WHERE categoria = 'PLATO'` (patrón A2), para que un postre pueda llamarse igual que un plato.
- Requiere una revisión nueva de Alembic con `down_revision = "a1c3e5f7b9d1"`, en modo `batch` (SQLite).
- `shared/models/producto.py` es compartido (M2, M4, M6): avisar en el PR (§9.3).

### 2.2 Imágenes

- **Almacenamiento:** carpeta local configurable (`MEDIA_DIR`, por defecto `./media`) en `config.py`, `.env.example` y `.gitignore`, servida con `StaticFiles` en `/media` desde `main.py`. En `productos.imagen` se guarda solo el nombre de archivo (`uuid4().hex` más la extensión que decide el servidor) y la API devuelve `imagen_url`.
- **Multipart:** FastAPI exige `python-multipart` para `Form` y `File`. La alternativa de dos pasos (JSON y luego la imagen) se descarta: crearía el plato aunque la imagen sea inválida, y el criterio 10 pide rechazar.
- **Validación por contenido (criterio 10):** extensión y `Content-Type` los decide el cliente, así que no alcanzan. Con `Pillow` se abre y verifica el archivo, con límite de píxeles. El tamaño se controla leyendo hasta 5 MB + 1 byte.
- **HEIC visible en cualquier navegador (criterio 12):** solo Safari muestra HEIC.

| Opción | Cómo | Ventajas | Desventajas |
| --- | --- | --- | --- |
| **A. Servidor (recomendada)** | `Pillow` + `pillow-heif`: HEIC se guarda como JPEG con la orientación aplicada; JPG y PNG se reguardan sin metadatos | Cubre cualquier cliente de la API; validación y conversión en un solo lugar | 3 dependencias nuevas de backend; la conversión corre dentro de la petición (acotada a 5 MB) |
| B. Cliente | `heic2any` en el navegador; el servidor solo valida firmas | Backend con una sola dependencia nueva | Otro cliente de la API puede subir HEIC crudo y el criterio 12 falla; suma peso al frontend (RNF-REN-08) |
| C. Guardar HEIC tal cual | Nada | Cero código | Incumple el criterio 12 |

- **Atomicidad:** se valida y convierte la imagen, se escribe el archivo y después se hace el `commit`; si el `commit` falla, se borra el archivo.

### 2.3 Forma del endpoint

| Opción | Descripción | Efecto en HU-M1-04 y HU-M1-07 |
| --- | --- | --- |
| **1. `service` compartido con una ruta por categoría (recomendada)** | `service.crear_producto(db, datos, categoria, imagen)`; `POST /api/v1/platos` fija `Categoria.PLATO` | Solo agregan su ruta y su esquema; HU-M1-07 declara `ingredientes` opcional |
| 2. `POST /productos` con `categoria` en el cuerpo | Un endpoint genérico | Contradice «la categoría la asigna el sistema» |
| 3. Solo `/platos` sin generalizar | Lo mínimo | HU-M1-04 y HU-M1-07 copian código |

- Esquemas: `ProductoBase`, `PlatoCrear(ProductoBase)` con al menos un ingrediente, y `ProductoSalida` con `categoria`, `estado` e `imagen_url`.
- En multipart los campos llegan como texto. Falta confirmar con una prueba rápida que `Annotated[PlatoCrear, Form()]` con `UploadFile | None` y listas funciona en `fastapi==0.146.0`. Alternativa: una parte `datos` en JSON validada con `PlatoCrear.model_validate_json`.
- Reglas del `service`, cada una en una función privada: sección inexistente → 404 y deshabilitada → 409; nombre repetido entre platos → 409 «El plato ya está registrado»; imagen inválida → 422 con formato y tamaño; guardar archivo, `commit` (captura `IntegrityError` → 409) y borrar el archivo si falla.

### 2.4 Frontend

- Página `/productos/nuevo` según `producto-nuevo.html` (es una página, no un diálogo), con ruta nueva en `App.tsx` y botón «Nuevo plato» en la pestaña «Productos».
- Componentes en `frontend/src/modules/productos/`: `pages/PlatoNuevoPage.tsx`, `components/ListaDeTextos.tsx` (chips para ingredientes y etiquetas; criterios 6 y 13), `components/SelectorImagen.tsx` («Elegir archivo» y «Sacar foto» con `capture="environment"`; criterio 11), `components/usePlatoForm.ts` y `components/validarPlato.ts`.
- La sección se elige entre las habilitadas (criterio 9): se recomienda agregar el filtro opcional `?estado=HABILITADO` a `GET /secciones`. Sin secciones habilitadas, se muestra un aviso con enlace a «Secciones» y se deshabilita «Guardar» (criterio 8).
- `shared/api/client.ts` necesita aceptar `FormData` sin fijar `Content-Type` (archivo compartido).
- Diferencias con la maqueta: el precio se escribe con coma decimal (es-AR) y se convierte; el interruptor «Estado» se muestra como texto fijo, porque la HU crea siempre Habilitado.
- Vista previa de HEIC: los navegadores sin soporte no la muestran; se ve el nombre y el tamaño, y la imagen convertida después de guardar.

### 2.5 Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 450 | ≈ 350 | ≈ 800 | 800: en el límite |
| Frontend | ≈ 600 | ≈ 300 a 350 | ≈ 850 a 950 | 800: por encima |

Va en un solo PR (AGENTS.md §4).

## 3. Decisiones de rumbo

1. **Dependencias nuevas de backend (§9.7):** `python-multipart` (obligatoria para recibir archivos), `Pillow` y `pillow-heif` (validación por contenido y conversión de HEIC).
2. **Estrategia HEIC:** conversión en el servidor (A) o en el cliente (B).
3. **Forma del endpoint:** `service` compartido con ruta por categoría (`POST /platos`).
4. **Archivos compartidos o ajenos al módulo:** `backend/app/shared/models/producto.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/.env.example`, `frontend/src/shared/api/client.ts`, `frontend/src/App.tsx` y `.gitignore`.
5. **Imágenes en disco local**, con efectos en despliegue y copias de seguridad.
6. **Filtro opcional `estado` en `GET /secciones`**, retrocompatible y del mismo módulo.

## 4. Supuestos

- S1: la unicidad del nombre usa `casefold()` con espacios recortados e incluye platos deshabilitados.
- S2: ingredientes y etiquetas se comparan con `casefold()` y espacios recortados para detectar repetidos.
- S3: cada ingrediente admite hasta 100 caracteres; un plato admite hasta 50 ingredientes y 20 etiquetas.
- S4: `precio` admite hasta 8 dígitos enteros y 2 decimales; la API recibe punto decimal y la pantalla acepta coma.
- S5: el nombre se recorta antes de contar los 100 caracteres.
- S6: el archivo se guarda como `uuid4().hex` más extensión; JPG y PNG se reguardan sin metadatos y HEIC se guarda como JPEG.
- S7: una imagen inválida o un fallo al guardar cancela el alta completa.
- S8: nombre repetido o sección deshabilitada → 409; sección inexistente → 404; datos, largo, precio o imagen inválidos → 422 con `{"detalle": ...}`.
- S9: la respuesta 201 devuelve `ProductoSalida` con `imagen_url` relativa (`/media/<archivo>`).
- S10: el estado no se elige al crear; el interruptor de la maqueta se reemplaza por texto fijo.
- S11: la vista previa de HEIC puede no estar disponible antes de guardar.
- S12: la carta pertenece a otra HU; el criterio 12 se cumple sirviendo la imagen como JPEG en `/media`.

## 5. Riesgos

- Frontend por encima del punto de control de 800 líneas.
- Doble cabeza de Alembic si otro módulo agrega migraciones en paralelo: verificar `alembic heads` antes del PR.
- `pillow-heif` trae binarios: confirmar que instala en Python 3.12 en la CI y en cada máquina.
- Archivos huérfanos si el proceso se corta entre escribir el archivo y confirmar; aceptable en esta etapa.
- Las pruebas de HEIC necesitan generar un HEIC mínimo con `pillow_heif`.
