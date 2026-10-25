# Diseño: HU-M1-01 Crear un plato

- **Issue:** #2 · **Rama:** `feature/HU-M1-01-crear-plato` · **Entrada:** `proposal.md` (D1 a D5, supuestos S1 a S12) y el patrón de HU-M1-10 (A1 a A10), que no se rediscute.

## Enfoque técnico

`POST /api/v1/platos` recibe `multipart/form-data` con una parte `datos` (JSON validado por `PlatoCrear`) y una parte opcional `imagen`. El `router` convierte `datos` en el esquema y lee como máximo 5 MB + 1 byte del archivo; el `service` compartido `crear_producto` procesa la imagen (sin base), valida las reglas, escribe el archivo y confirma (D-01, D-02, D-10). La lógica de Pillow vive en `productos/imagenes.py`, sin FastAPI ni base. Unicidad con `nombre_normalizado` e índice único compuesto (`categoria`, `nombre_normalizado`).

## Decisiones de arquitectura

| # | Tema | Opción elegida | Alternativa descartada | Justificación |
| --- | --- | --- | --- | --- |
| B1 | Unicidad por categoría (D5, S1) | Índice único **compuesto** `ux_productos_categoria_nombre_normalizado` sobre (`categoria`, `nombre_normalizado`) | Índice parcial `WHERE categoria = 'PLATO'` | Cubre platos, postres y bebidas a la vez: HU-M1-04 y HU-M1-07 no necesitan migración. Con índices parciales cada HU agregaría uno. Riesgo: alcanza también a `MENU_DEL_DIA` (pregunta abierta con M2). |
| B2 | Contrato multipart | Parte `datos` con JSON, convertida por la dependencia `datos_de(PlatoCrear)` del `router` (`Form()` de texto + `model_validate_json`); `imagen: Annotated[UploadFile \| None, File()] = None` | `Annotated[PlatoCrear, Form()]` (modelo de formulario) | En un formulario todo llega como texto: `StrictInt` rechazaría `"3"` y habría que relajar tipos, a diferencia de `SeccionCrear`. `Form()` de texto con `UploadFile` es estable desde hace años; los modelos de formulario con listas y archivos tienen casos borde. Mismo esquema y misma validación que un endpoint JSON. **Alternativa de respaldo:** si la prueba temprana (tarea de apply) falla con la dependencia, validar `datos` en el cuerpo de la ruta con la misma conversión. |
| B3 | Errores de validación de `datos` | La dependencia captura `ValidationError` y lanza `RequestValidationError` con cada `loc` prefijado por `("body",)` | Dejar pasar `ValidationError` | Sin conversión sería un 500. Con el prefijo, el manejador actual de `main.py` arma `{"detalle": "Datos invalidos. nombre: ..."}` (D-26). |
| B4 | 422 desde el `service` (imagen) | Nueva `DatosInvalidosError` en `shared/excepciones.py` y su manejador 422 en `main.py` | El `router` captura un error del módulo y lanza `HTTPException` | El `service` no importa FastAPI (contrato de `lint-imports`); otros módulos tendrán reglas que terminan en 422 (D-25). |
| B5 | Lugar de la lógica de imágenes | `backend/app/modules/productos/imagenes.py` (Pillow, `pillow_heif`, archivos) | `backend/app/shared/` | Un solo módulo la usa (mismo criterio que A9). Se mueve a `shared/` cuando otro la necesite. |
| B6 | Orden del alta | 1) procesar imagen en memoria; 2) sección y nombre; 3) escribir archivo; 4) `add` + `flush` + `commit`; ante cualquier error en 4, `rollback` y borrar el archivo | Procesar la imagen después de las consultas | Con WAL, una transacción que leyó y escribe después de otro `commit` falla con `SQLITE_BUSY_SNAPSHOT` sin esperar el `busy_timeout`. Procesar primero deja fuera de la transacción el trabajo pesado (RNF-REN-03) y el bloqueo de escritura dura solo `flush` + `commit`. Un 422 de imagen precede a 404 y 409. |
| B7 | Categoría y mensaje del 409 | `ClassVar` en el esquema: `CATEGORIA = Categoria.PLATO`, `MENSAJE_NOMBRE_REPETIDO = "El plato ya está registrado"` | Parámetro `categoria` y tabla de mensajes en el `service` | HU-M1-04 y HU-M1-07 solo agregan su esquema (con sus `ClassVar`) y su ruta, sin tocar el `service`. |
| B8 | Carpeta de imágenes | `media_dir` en `Settings` (D-12); `StaticFiles(directory=..., check_dir=False)` montado en `/media` con `name="media"` por `montar_media(app, directorio)`; `imagenes.py` crea la carpeta al escribir | Crear la carpeta al importar `main.py` | Importar la aplicación (pruebas, CI) no crea carpetas. `montar_media` se prueba sobre `tmp_path`. |
| B9 | Normalización | `normalizar_nombre(nombre) = nombre.strip().casefold()` en `shared/models/producto.py`, usada por `@validates("nombre")` y por el `service`; la migración copia la expresión | Repetirla en cada capa | Una sola definición para la consulta previa y la columna (A1). Las migraciones no importan código de la aplicación. |
| B10 | Dependencias (D1, §9.7, RNF-SEG-10) | `python-multipart==0.0.32`, `Pillow==13.0.0`, `pillow-heif==1.8.1` (últimas publicadas al 25/10/2026, verificadas con `pip index versions`). **Supuesto:** compatibilidad a confirmar en apply con `pip install` en Python 3.12 y `pip-audit`; si hay una versión estable posterior con ruedas para 3.12 y sin vulnerabilidades, se usa esa y se anota en el PR | Versiones con rango | Versión exacta (RNF-MAN-04). `pillow-heif` 1.1 requiere Pillow ≥ 11.1 y trae `libheif` en sus ruedas `manylinux`: la CI no necesita paquetes del sistema. |

## Flujo de datos

```
PlatoNuevoPage ─FormData{datos: JSON, imagen?}─→ router.crear_plato
  datos_de(PlatoCrear) → 422 · leer_imagen(imagen) → bytes (≤ 5 MB + 1) │
                                                                       ▼
service.crear_producto(db, datos, imagen)
  1. imagenes.procesar(bytes)        → 422 tamaño, formato o contenido
  2. _validar_seccion(seccion_id)    → 404 inexistente · 409 deshabilitada
  3. _validar_nombre_libre(categoria, normalizado) → 409
  4. imagenes.guardar(procesada)     → "<uuid4().hex>.jpg|.png"
  5. _guardar: add + flush + commit  → IntegrityError → 409; cualquier error → borrar archivo
  └→ ProductoSalida (201) con imagen_url "/media/<archivo>"
```

**`imagenes.procesar(contenido: bytes) -> ImagenProcesada(datos, extension)`:** vacío o > 5 MB → 422; `register_heif_opener()` al importar; `Image.open` y formato en {`JPEG`, `PNG`, `HEIF`} (el resto → 422); ancho × alto ≤ 50 MP antes de `load()` (**Supuesto:** límite de píxeles); `load()` detecta truncados; captura `UnidentifiedImageError`, `OSError`, `ValueError`, `SyntaxError` y `DecompressionBombError` → 422 sin detalles internos (RNF-SEG-09). `ImageOps.exif_transpose`; HEIF → RGB → JPEG (calidad 90); JPEG → JPEG; PNG → PNG. Se guarda sin `exif` (sin GPS ni metadatos de cámara).

## Contratos

**Modelo (`Producto`, compartido):** `nombre_normalizado: Mapped[str] = mapped_column(sa.String)`, `@validates("nombre")` e índice B1 en `__table_args__`.

**Esquemas (`productos/schemas.py`):**

```python
class ProductoCrear(BaseModel):            # base para PlatoCrear, PostreCrear, BebidaCrear
    model_config = ConfigDict(extra="forbid")   # categoria y estado no se reciben (S10)
    CATEGORIA: ClassVar[Categoria]
    MENSAJE_NOMBRE_REPETIDO: ClassVar[str]
    nombre: Texto[1, 100]                   # recortado antes de medir (S5)
    seccion_id: StrictInt = Field(gt=0)
    precio: Decimal = Field(gt=0, max_digits=10, decimal_places=2)   # S4; llega como "12500.50"
    ingredientes: list[Texto[1, 100]] = Field(default_factory=list, max_length=50)  # S3
    descripcion: Texto[0, 500] | None = None    # "" → None
    etiquetas: list[Texto[1, 30]] = Field(default_factory=list, max_length=20)

class PlatoCrear(ProductoCrear):
    CATEGORIA = Categoria.PLATO
    MENSAJE_NOMBRE_REPETIDO = "El plato ya está registrado"
    ingredientes: list[Texto[1, 100]] = Field(min_length=1, max_length=50)
```

`Texto[a, b]` es un alias `Annotated[str, StringConstraints(strip_whitespace=True, ...)]`. Repetidos en `ingredientes` o `etiquetas` (comparados con `casefold()`, S2) → 422 con `field_validator`. **Supuesto:** etiqueta de hasta 30 caracteres (maqueta). Salida `ProductoSalida {id, nombre, categoria, precio, ingredientes, descripcion, etiquetas, estado, seccion: SeccionResumen, imagen_url: str | None}`; `precio` viaja como texto (`"12500.50"`, serialización de `Decimal` de Pydantic).

**Service:** `crear_producto(db: Session, datos: ProductoCrear, imagen: bytes | None) -> ProductoSalida`; `listar_secciones(db, parametros, estado: Estado | None = None)`.

**Repository:** `obtener_seccion(db, id)`, `existe_producto(db, categoria, nombre_normalizado)`, `agregar(db, entidad: Seccion | Producto)` (se generaliza; solo `add` y `flush`), y `listar_secciones(db, parametros, estado)` con el filtro también en `contar`.

**API:**

| Ruta | Respuesta | Errores |
| --- | --- | --- |
| `POST /api/v1/platos` (multipart: `datos`, `imagen?`) | 201 `ProductoSalida` | 404, 409, 422 |
| `GET /api/v1/secciones?estado&limit&offset` | 200 `Pagina[SeccionListado]`; sin `estado`, igual que hoy (D-27) | 422 |
| `GET /media/<archivo>` | 200 `image/jpeg` o `image/png` | 404 |

## Frontend

| Pieza | Diseño |
| --- | --- |
| `shared/api/client.ts` | Método nuevo `postFormulario<T>(endpoint, formulario: FormData)` sin `Content-Type` (el navegador fija el `boundary`). `post` no cambia. |
| `api.ts` | `crearPlato(datos, imagen: File \| null)` arma el `FormData`; `listarSeccionesHabilitadas()` usa `?estado=HABILITADO&limit=100&offset=0` (D-16). |
| `pages/PlatoNuevoPage.tsx` | Ruta `/productos/nuevo` (`lazy`, D-19): `Breadcrumbs`, `PageHeader`, `FormField`, `Input`, `Select`, `Textarea`, estado fijo «Habilitado» (S10). Sin secciones habilitadas: `Alert` con enlace a `/productos?pestania=secciones` y «Guardar» deshabilitado. Éxito: toast y vuelta a `/productos`. |
| `components/ListaDeTextos.tsx` | Chips reutilizables para ingredientes y etiquetas: Enter agrega el texto recortado; vacío, repetido (`casefold`), largo o tope alcanzado muestran el error en línea. |
| `components/SelectorImagen.tsx` | «Elegir archivo» y «Sacar foto» (`capture="environment"`) sobre `input` ocultos; `accept` JPG, PNG, HEIC/HEIF; vista previa con `URL.createObjectURL` (se revoca); HEIC sin vista previa muestra nombre y tamaño (S11); valida 5 MB y tipo antes de enviar. |
| `components/useFormularioPlato.ts`, `validarPlato.ts` | Igual que `useFormularioSeccion`/`validarSeccion`. `convertirPrecio("12.500,50") → "12500.50"` acepta `^\d{1,3}(\.\d{3})*(,\d{1,2})?$` o `^\d+(,\d{1,2})?$`, hasta 8 enteros y mayor a cero. `errorDelServidor` ubica el 409 de nombre en el campo. |
| `ProductosPage.tsx` | Botón «Nuevo plato» en la pestaña «Productos»; pestaña inicial desde `?pestania=`. |

## Cambios en archivos

| Archivo | Acción | Compartido |
| --- | --- | --- |
| `backend/app/shared/models/producto.py` | Columna, validador, índice, `normalizar_nombre` | **Sí** (M2, M4, M6) |
| `backend/app/shared/excepciones.py`, `backend/app/main.py` | `DatosInvalidosError` y su manejador; `montar_media` | **Sí** |
| `backend/app/config.py`, `backend/.env.example`, `.gitignore` | `media_dir` (`MEDIA_DIR=./media`); ignorar `backend/media/` | **Sí** |
| `backend/requirements.txt` | Tres dependencias (B10) | **Sí** |
| `backend/alembic/versions/<rev>_agrega_nombre_normalizado_a_productos.py` | Crear (`down_revision = "a1c3e5f7b9d1"`) | **Sí** |
| `backend/app/modules/productos/{schemas,service,repository,router}.py`, `imagenes.py` | Modificar y crear | No |
| `backend/tests/modules/productos/{conftest,test_service,test_router,test_migracion}.py`, `test_imagenes.py` | Modificar y crear | No |
| `frontend/src/shared/api/client.ts` (+ `client.test.ts`), `frontend/src/App.tsx` | `postFormulario`; ruta nueva | **Sí** |
| `frontend/src/modules/productos/{types,api}.ts`, `pages/`, `components/` y pruebas | Modificar y crear | No |

## Estrategia de pruebas

| Capa | Qué | Cómo |
| --- | --- | --- |
| Primera tarea de apply | B2/B3: multipart con y sin `imagen`, JSON inválido y campo extra → 422 con `detalle` | `TestClient` (`files=` y `data=`) antes de escribir el resto |
| `imagenes.py` | JPG, PNG y HEIC válidos; HEIC → JPEG; orientación EXIF 6 aplicada y sin EXIF; texto con extensión `.jpg`; GIF; 5 MB + 1; vacío; PNG de 60 MP en modo `1` (bomba) | Imágenes de 8 × 4 creadas en memoria con `Image.new(...).save(BytesIO, formato)`; HEIC con `pillow_heif` (`format="HEIF"`). Respaldo: un `.heic` mínimo versionado en `tests/modules/productos/archivos/` |
| `service` | Un caso por criterio: sección inexistente (404) y deshabilitada (409); nombre repetido con otra capitalización e incluso deshabilitado (409); mismo nombre en otra categoría permitido; error en `commit` → sin fila ni archivo; imagen inválida → sin fila ni archivo | Fixture `directorio_media` (`MEDIA_DIR` en `tmp_path`, `get_settings.cache_clear()` al entrar y salir) |
| `router` | 201 y forma de `ProductoSalida`; 422 por campos (parametrizado); `estado=HABILITADO` filtra y cuenta bien; `montar_media` sirve `image/jpeg` | `cliente`; `FastAPI()` nueva con `montar_media(app, tmp_path)` |
| Migración | `upgrade` rellena `nombre_normalizado` de filas existentes; aborta si hay repetidos; `downgrade -1` quita columna e índice y conserva filas | Se ajusta `test_downgrade_elimina_productos_y_secciones` para bajar a `efdafc2a164c` (con dos revisiones, `-1` ya no elimina las tablas) |
| Frontend | `validarPlato` (precio con coma), `ListaDeTextos`, `SelectorImagen` (archivo, cámara, tamaño), página (aviso sin secciones, envío, 409), `api.ts` y `postFormulario` | Vitest y Testing Library; `vi.mock('../api')`; `File` en memoria |

Impacto en la CI: las ruedas de Pillow y `pillow-heif` para 3.12 se descargan en `pip install`; las imágenes de prueba pesan pocos bytes y se crean al vuelo.

## Matriz de amenazas

N/A: no hay enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS ni clasificación de ejecutables. La subida de imágenes se cubre con B6 y `imagenes.procesar`: validación por contenido, tope de bytes y píxeles, recodificación sin metadatos y nombre `uuid4().hex` decidido por el servidor (sin rutas del cliente).

## Migración y despliegue

Revisión en modo `batch`: 1) lee `id`, `nombre` y `categoria`, normaliza en Python y, si dos filas repiten (`categoria`, normalizado), aborta con un mensaje claro sin tocar el esquema; 2) agrega la columna nula; 3) rellena con `UPDATE` parametrizado; 4) la pasa a `NOT NULL` y crea el índice B1. `downgrade`: borra el índice y la columna. Verificar `alembic heads` antes del PR.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 370 (incluye ≈ 60 de migración) | ≈ 450 | ≈ 820 | 800: en el límite |
| Frontend | ≈ 520 | ≈ 370 | ≈ 890 | 800: por encima (informativo, un solo PR) |

## Preguntas abiertas

- [ ] B1 alcanza a `MENU_DEL_DIA`: confirmar con M2 si crea `Producto` con nombres repetidos; si es así, una migración futura pasa el índice a parcial (`WHERE categoria <> 'MENU_DEL_DIA'`).
- [ ] Starlette guarda en disco la subida completa antes del `router`: el tope de 5 MB protege memoria, no disco. El límite del cuerpo de la petición queda para el despliegue (proxy).
- [ ] No se reduce la resolución (hasta 50 MP); evaluar en HU-M1-14 si la carta lo necesita.
- [ ] Avisar a M2, M4 y M6 (`Producto`) y al equipo (`main.py`, `excepciones.py`, `client.ts`, dependencias) antes del PR (§9.3, §9.7).
