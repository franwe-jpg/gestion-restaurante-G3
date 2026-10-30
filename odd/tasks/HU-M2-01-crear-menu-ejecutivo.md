# HU-M2-01 — Crear un menú ejecutivo
Objetivo: implementar alta y consulta de menús ejecutivos, con validación de productos y sección, en backend y frontend.
Rama: `feature/HU-M2-01-crear-menu-ejecutivo` · entrega `single-pr` · pruebas: backend `pytest`, frontend `npm test`.

## Specs

### S1 — Alta de menú ejecutivo

**Alcance autorizado:** Crear un menú ejecutivo habilitado, asociar al menos un producto habilitado que no pertenezca a `MENU_DEL_DIA`, guardarlo en una sección habilitada y exponerlo en el gestor de menús. El listado paginado de menús ejecutivos acompaña el alta según el plan del módulo. No incluye modificación ni baja de HU-M2-02/03, ni cambios en la carta pública de M1.

**Texto de HU-M2-01 (verbatim):**

> Como encargado, quiero crear un Menú Ejecutivo agrupando varios productos para ofrecerlo en la carta.
>
> Épica: #20
> Prioridad: Alta
>
> Datos
> Nombre (obligatorio): cadena de texto. Debe ser único en todo el sistema.
> Precio Fijo (obligatorio): número decimal mayor a cero.
> Productos incluidos (obligatorio): lista de productos que componen el menú. Debe contener al menos un producto. Los productos deben estar previamente cargados en el sistema y no pueden pertenecer a la categoría MENU_DEL_DIA.
> Descripción (opcional): texto libre para detallar qué incluye o sus condiciones.
> Sección (obligatoria): una sección Habilitada de la carta donde se mostrará el menú.
> Estado: Lo asigna el sistema al crear; todo Menú Ejecutivo nuevo nace con estado Habilitado.
>
> Criterios de aceptación
>
> Dado que cargo un Menú Ejecutivo con todos los datos obligatorios válidos, cuando lo guardo, entonces queda registrado con estado Habilitado dentro de la sección elegida.
>
> Dado que falta el nombre, el precio fijo, los productos incluidos o la sección, cuando intento guardarlo, entonces no se guarda y se me indica qué dato falta.
>
> Dado un nombre que ya pertenece a otro Menú Ejecutivo, cuando intento guardarlo, entonces el sistema advierte que el nombre debe ser único.
>
> Dado un precio fijo que no es mayor a cero, cuando intento guardarlo, entonces el sistema advierte que el precio es inválido.
>
> Dado que intento crear el Menú Ejecutivo sin seleccionar ningún producto, cuando guardo, entonces el sistema me exige incluir al menos un producto.
>
> Dado que selecciono un producto que actualmente está en estado "Deshabilitado", cuando intento agregarlo al Menú Ejecutivo, entonces el sistema me advierte que solo puedo incluir productos habilitados.
>
> Dado que intento agregar un producto cuya categoría es MENU_DEL_DIA, cuando lo selecciono o intento guardar, entonces el sistema no lo permite y me advierte que no se pueden incluir menús del día dentro de un menú ejecutivo.

**Supuestos aplicados según aprobación del usuario:** nombre de 1–100 caracteres, descripción de hasta 500 y precio decimal positivo con dos posiciones, por consistencia con Producto; unicidad entre menús ejecutivos mediante `strip().casefold()`; los nombres con tildes distintas se consideran distintos, a diferencia de lo que afirma el plan local; los IDs repetidos se rechazan; la HU registra el menú en la sección, pero no extiende la respuesta `/carta` de M1. El endpoint de listado se incluye para mostrar los registros creados, de acuerdo con el plan del módulo.

**Checks:** una prueba pública por cada criterio de aceptación; cobertura de alta 201, campos obligatorios 422, nombre repetido 409, precio inválido 422, lista vacía 422, producto deshabilitado 409, producto `MENU_DEL_DIA` 409, sección inexistente 404 y sección deshabilitada 409; migración upgrade/downgrade sobre base temporal; `pytest`, `ruff check .`, `ruff format --check .`, `lint-imports`; `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test:coverage`, `npm run build`.

**Riesgo:** item 1 — agrega tablas, restricciones e índices persistentes; una reversión elimina los registros nuevos de menús.

## Tasks

- T0 · S1 · preparar y revisar OpenSpec · inline · estado: completado (usuario autorizó aplicar la propuesta) · commit: ninguno.
- T1 · S1 · modelo, asociación, migración y pruebas de integridad · inline · estado: completado y verificado con pytest · riesgo: item 1 · commit: pendiente.
- T2 · S1 · schemas, validación, repositorio, servicio, rutas POST/GET y pruebas backend · inline · estado: completado; 618 pruebas backend en verde · commit: pendiente.
- T3 · S1 · tipos, API, formulario, selector de productos, listado y pruebas frontend · inline · estado: completado; lint, typecheck, pruebas y build en verde · commit: pendiente.
- T4 · S1 · normalización final, verificaciones backend/frontend y revisión de riesgo · inline · estado: completado; verificación integral registrada en `openspec/changes/HU-M2-01/apply-progress.md` · commit: pendiente.

## Log

- L1 — HU original, verbatim:

```text
HU-M2-01 Crear un menú ejecutivo

Como encargado, quiero crear un Menú Ejecutivo agrupando varios productos para ofrecerlo en la carta.

Épica: #20
Prioridad: Alta

Datos
Nombre (obligatorio): cadena de texto. Debe ser único en todo el sistema.
Precio Fijo (obligatorio): número decimal mayor a cero.
Productos incluidos (obligatorio): lista de productos que componen el menú. Debe contener al menos un producto. Los productos deben estar previamente cargados en el sistema y no pueden pertenecer a la categoría MENU_DEL_DIA.
Descripción (opcional): texto libre para detallar qué incluye o sus condiciones.
Sección (obligatoria): una sección Habilitada de la carta donde se mostrará el menú.
Estado: Lo asigna el sistema al crear; todo Menú Ejecutivo nuevo nace con estado Habilitado.
Criterios de aceptación

Dado que cargo un Menú Ejecutivo con todos los datos obligatorios válidos, cuando lo guardo, entonces queda registrado con estado Habilitado dentro de la sección elegida.

Dado que falta el nombre, el precio fijo, los productos incluidos o la sección, cuando intento guardarlo, entonces no se guarda y se me indica qué dato falta.

Dado un nombre que ya pertenece a otro Menú Ejecutivo, cuando intento guardarlo, entonces el sistema advierte que el nombre debe ser único.

Dado un precio fijo que no es mayor a cero, cuando intento guardarlo, entonces el sistema advierte que el precio es inválido.

Dado que intento crear el Menú Ejecutivo sin seleccionar ningún producto, cuando guardo, entonces el sistema me exige incluir al menos un producto.

Dado que selecciono un producto que actualmente está en estado "Deshabilitado", cuando intento agregarlo al Menú Ejecutivo, entonces el sistema me advierte que solo puedo incluir productos habilitados.

Dado que intento agregar un producto cuya categoría es MENU_DEL_DIA, cuando lo selecciono o intento guardar, entonces el sistema no lo permite y me advierte que no se pueden incluir menús del día dentro de un menú ejecutivo.
```

- L2 — Instrucción de implementación del usuario, verbatim: `impelementa ne bakc y front`.
- L3 — El usuario autorizó consulta de GitHub y fetch local con: `ok, consulta`.
- L4 — El issue #21 está abierto y muestra «Relationships: None yet»; `origin/develop` se actualizó a `0bff1e0`. La rama activa anterior se conservó y el trabajo se aisló en la rama indicada en el encabezado.
- L5 — La revisión de OpenSpec es requisito del repositorio antes de aplicar código. No escribir fuentes hasta recibir esa revisión.
- L6 — El usuario respondió `implementalo hermano` después de recibir los artefactos y supuestos de OpenSpec; se interpreta como aprobación de la propuesta sin cambios para iniciar la aplicación.
- L7 — Se escribieron las primeras pruebas de modelo/migración, pero no se pudo observar RED: `pytest` no existe y `python3 -m pytest` informa `No module named pytest`. No se instalaron dependencias porque eso requiere autorización remota explícita.
- L8 — La primera implementación de backend y frontend está escrita. `python3 -m compileall -q app tests alembic/versions` y `git diff --check` terminaron sin errores. Las suites siguen sin poder ejecutarse; ESLint global 6.4.0 no reconoce el `eslint.config.js` del repo.

- L9 — Se reutilizó el entorno Python ya instalado del proyecto hermano `isfpp_ing3/venv` y los `node_modules` del checkout principal, enlazados temporalmente; no se instaló nada ni se modificaron manifests. `pytest` 618/618 y `npm` 444/444 en verde.
- L10 — Se corrigieron dos pruebas del propio cambio que llamaban setters inexistentes y una que omitía `descripcion`; ESLint detectó `react-hooks/set-state-in-effect` y complejidad 11, ambos corregidos sin tocar reglas.
- L11 — Las pruebas de downgrade posicional de M3 se fijaron a revisiones explícitas (`f3a5c7e9b1d2`, `c4e6a8b0d2f4`) porque la nueva cabeza rompía `-1` y `-2`. Cambio solo de pruebas, pendiente de revisión del responsable de M3.
