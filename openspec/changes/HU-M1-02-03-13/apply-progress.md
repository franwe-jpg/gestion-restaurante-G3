# Progreso de apply: HU-M1-02-03

- **Lote 1 de 2:** Fases 1 a 3 (backend). Modo Strict TDD, `pytest`.
- **Lote 2 de 2:** Fases 4 a 8 (frontend y cierre). Modo Strict TDD, Vitest. Con esto las 8 fases quedan completas.
- **Rama:** `feature/HU-M1-02-03-modificar-baja-plato`

## Tareas completadas

| Fase | Tareas | Commit |
| --- | --- | --- |
| 1. Consultar (`GET /platos/{id}`) | 1.1 a 1.4 | `90f9de7` |
| 2. Modificar (`PUT /platos/{id}`) | 2.1 a 2.7 | `d1ca30b` |
| 3. Baja (`POST /platos/{id}/baja`) | 3.1 a 3.4 | `6591926` |
| 4. Extraer `FormularioProducto` (E8) | 4.1 a 4.4 | `a64e338` |
| 5. Capa de datos y código compartido | 5.1 a 5.6 | `b8b7ac1` |
| 6. `hooks` de edición y baja | 6.1 a 6.6 | `5f9f0ec` |
| 7. Pantalla de edición, selector de imagen y ruta | 7.1 a 7.8 | `e9829fb` |
| 8. Cierre | 8.1 a 8.5 | commit `docs:` de los artefactos |

## Evidencia TDD

| Fase | Rojo | Verde |
| --- | --- | --- |
| 1 | 4 fallas (`test_consultar_plato_existente`, `..._deshabilitado_200`, `test_obtener_producto_existente`, `..._otra_categoria_error`): 405 de la ruta y función ausente. Los dos 404 del router pasaron desde el inicio porque la ruta no existía (404 por ruta inexistente). | 228 pruebas pasan |
| 2 | `test_schemas.py` y `test_service.py` fallan en la importación (`PlatoModificar` ausente); 33 fallas en `test_router.py` (405 de la ruta) | 288 pruebas pasan |
| 3 | 7 fallas (4 del router por 405, 3 del service por función ausente). Los 404 de baja y `test_reactivar_plato_tras_la_baja_200` pasaron desde el inicio (la ruta no existía; el plato seguía habilitado). | 298 pruebas pasan, cobertura 99,27 % |
| 4 | Extracción pura: las 130 pruebas de `productos` pasaban antes (línea base) | 130 pasan después, sin tocar pruebas |
| 5 | `putFormulario`, `urlDelBackend`, `precioParaEditar`, `obtenerProducto`, `modificarProducto`, `darDeBajaProducto` y `urlDeImagen` ausentes (17 fallas) | 176 pruebas pasan |
| 6 | `useCampos`/`useEnvioProducto` no exportados (5 fallas) y módulos `useEdicionProducto` y `useBajaProducto` ausentes (2 archivos sin cargar) | 191 pruebas pasan |
| 7 | `ProductoEditarPage` ausente (archivo sin cargar), ruta de `App` ausente e imagen actual ausente en `SelectorImagen` (2 fallas) | 210 pruebas pasan |

## Comandos corridos antes de cada commit (desde `backend/`, con `.venv`)

`ruff check --fix . && ruff format .` y luego `ruff check . && ruff format --check . && lint-imports && pytest`: todo en verde (10 contratos de importación cumplidos). Resultado final: `298 passed`, cobertura 99,27 % (umbral 70 %).

## Desviaciones y notas

- E2: la herencia múltiple `PlatoModificar(PlatoCrear, ProductoModificar)` funcionó con Pydantic; no hizo falta el respaldo.
- E4: `_guardar_producto` recibe `archivo_nuevo` explícito; el alta pasa su `archivo`. Hay una prueba de que un `commit` fallido con imagen conservada no borra el archivo vigente.
- E3: el borrado del archivo anterior usa `contextlib.suppress(OSError)` (regla SIM105 de Ruff).
- Se agregaron pruebas fuera de la lista: `test_modificar_plato_sin_estado_conserva_el_actual`, `test_modificar_plato_deshabilitar_con_estado_200`, `test_modificar_plato_con_categoria_enviada_422`, `test_modificar_plato_de_postre_404`, `test_modificar_producto_commit_fallido_con_imagen_conservada_no_la_borra` y `test_dar_de_baja_producto_otra_categoria_error`.
- Mensaje 404 de sección en `PUT`: «La sección {id} no existe» (reutiliza `_validar_seccion_habilitada`).
- Sin cambios en `shared/`, `models`, migraciones ni `frontend/`.

## Lote 2: frontend y cierre

### Comandos corridos antes de cada commit (desde `frontend/`)

`npm run format` y luego `npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run build`: todo en verde (0 advertencias de lint, sin `any`). Resultado final: 22 archivos y `210 passed`; cobertura global del frontend: sentencias 71,59 %, ramas 68,75 %, funciones 68,42 %, líneas 74,15 % (umbral 60 %). Build correcto.

### Verificación final (8.1 a 8.3)

- Backend (`ruff check . && ruff format --check . && lint-imports && pytest`): `298 passed`, cobertura 99,27 % (umbral 70 %), 10 contratos de importación cumplidos.
- `alembic heads`: una sola cabeza, `c4e6a8b0d2f4`, sin migración nueva en este cambio.
- Cada escenario de la spec tiene una prueba que pasa: backend en `backend/tests/modules/productos/` (Fases 1 a 3) y frontend en `ProductoEditarPage.test.tsx`, `useEdicionProducto.test.tsx`, `useBajaProducto.test.tsx`, `SelectorImagen.test.tsx`, `App.test.tsx` y la regresión del alta en `ProductoNuevoPage.test.tsx` (sin cambios; el estado fijo «Habilitado» sin interruptor ya estaba cubierto).

### Desviaciones del lote 2

- `FormularioProducto` recibe un único objeto opcional `edicion` (`estado`, `onCambiarEstado`, `imagenActual`, `onQuitarImagenActual`, `acciones`) en lugar de `modo`, `acciones` e `imagenActual` por separado: sin `edicion` el formulario es el del alta. Recibe `configuracion` como `Pick<ConfiguracionAlta, 'botonGuardar' | 'avisoSinSecciones'>` porque `ConfiguracionEdicion` no define esos textos.
- `seccionesParaEditar` vive en `components/seccionesParaEditar.ts` (un archivo de página no puede exportar funciones sin romper la regla de Fast Refresh) y trabaja con `Pick<SeccionListado, 'id' | 'nombre'>`.
- `useEnvioProducto` recibe `guardar(datos: ProductoCrear)` en lugar de construir la llamada a la API: así la edición y el alta comparten validación y manejo de errores (E9). `useFormularioProducto` conserva su API.
- Con una imagen nueva elegida, `quitar_imagen` se envía `false` aunque se haya quitado la actual (la nueva reemplaza); evita el 422 de «quitar y reemplazar».
- Si se elige una imagen nueva, el selector oculta la imagen actual; al descartar la nueva reaparece la actual (salvo que ya se haya quitado).
- El 404 del plato se distingue de otros errores de carga por el texto «no existe» del mensaje del servidor (`useApi` solo expone el mensaje); un id inválido muestra «El plato no existe.» sin llamar a la API.
- La baja usa un `Button` `danger` en el pie del formulario, a la izquierda de «Cancelar»; un error del servidor al dar de baja se avisa con un toast `danger`.
- Pruebas fuera de la lista: `useCampos` sin valores iniciales, error por defecto de `useEnvioProducto`, `quitar_imagen` con imagen nueva, error de la baja, otro error de carga, no repetir la sección habilitada.

## Notas para el PR

Plantilla `.github/pull_request_template.md`, hacia `develop`, con `Closes #3` y `Closes #4`.

- **Supuestos a validar por el equipo:** S15 a S25 (en especial S24 y S25). Con M2, S20: la baja de un plato incluido en un menú vigente no se bloquea. S18: `Factura` no existe todavía, M6 debe copiar el precio al emitir.
- **Código compartido (AGENTS.md §9.3), avisar al equipo:**
  - `frontend/src/shared/api/client.ts`: método `putFormulario<T>` y función exportada `urlDelBackend(ruta)`. `get`, `post` y `postFormulario` no cambian. Pruebas en `client.test.ts`.
  - `frontend/src/App.tsx`: ruta `productos/platos/:id/editar` con `ProductoEditarPage` en `lazy`. Prueba en `App.test.tsx`.
  - Sin cambios en `backend/app/shared/` ni en módulos ajenos.
- **Diferencia con la maqueta (E13):** el botón «Dar de baja» está en la pantalla de edición y no como ícono en la lista, que es de HU-M1-13.
- **Grupo ABM:** HU-M1-02 y HU-M1-03 comparten un cambio de SDD, una rama y un PR, según la regla que propone el PR #179 (ABM y listado de una misma entidad con el mismo responsable). Mientras #179 no se integre, es una desviación de la regla de una rama por tarea. Los issues #3 y #4 se cierran juntos (`Closes #3` y `Closes #4`).
- **Tamaño (informativo, un solo PR):** frontend ≈ 1.550 líneas agregadas y 210 borradas contra el punto de control de 800 (≈ 180 de movimiento mecánico en el commit `a64e338`, revisable aparte, sin cambios de lógica). Backend ≈ 930 líneas agregadas (pruebas incluidas) contra 800.
- **Commits (8):** `90f9de7`, `d1ca30b`, `6591926` (backend); `a64e338` (extracción), `b8b7ac1`, `5f9f0ec`, `e9829fb` (frontend); y el `docs:` de los artefactos.
