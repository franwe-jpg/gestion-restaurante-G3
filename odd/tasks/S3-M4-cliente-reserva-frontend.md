# S3-M4 — Ajustes frontend Cliente y Reserva

Objetivo: corregir el alta de cliente nuevo dentro del formulario de reserva, mantener el listado de clientes en el módulo de Atención al Público y hacer claros los estados de carga, error HTTP, conexión y lista vacía.

Rama: `feature/S3-M4-integracion-clientes` · entrega: un solo PR · TDD: Strict (`npm test`, Node 22.23.4/npm 10.9.9) · ruta: delegada a un único writer para los cambios frontend de varias capas.

## Alcance autorizado

- Incluir los campos de cliente nuevo en una `Card` compartida dentro del formulario de Reserva; Cancelar descarta solo el borrador del cliente, conserva los otros datos de reserva y permite elegir un cliente existente.
- Mantener juntos los paneles Clientes y Comandas en Atención al Público según maqueta, navegación y HU-M4-03; conservar ambos comportamientos y su separación visual con componentes compartidos.
- Corregir la presentación de carga, errores HTTP, fallos de conexión y resultados vacíos del listado de clientes, mostrando el error real sin ocultarlo.
- Actualizar OpenSpec únicamente si cambia o se aclara comportamiento observable.

## Restricciones

- No cambiar backend, contratos HTTP, Comandas ni funcionalidades existentes.
- No leer archivos `.env`, claves ni credenciales.
- No ejecutar suites completas; solo pruebas frontend focalizadas y checks necesarios.
- No hacer commits, push ni PR (instrucción explícita del usuario); registrar la unidad sin identidad de commit.
- Preservar intactos los artefactos OpenSpec S3-M4 preexistentes no relacionados con estos ajustes.

## Criterios de aceptación

1. Cliente nuevo aparece en una `Card` compartida dentro de Reserva; Cancelar lo descarta sin perder mesa/fecha/hora/cantidad y permite elegir un cliente existente.
2. El cliente se persiste únicamente mediante el mismo envío de la reserva; no hay guardado independiente.
3. El listado Clientes permanece junto a Comandas en `/atencion`, conserva HU-M4-03 y usa separación/estados compartidos coherentes.
4. HTTP no exitoso muestra el error HTTP/API; fallo de red se distingue; respuesta vacía válida muestra EmptyState; carga muestra Spinner; no se transforma un error en lista vacía.
5. El endpoint/configuración se mantiene alineado con `/api/v1/clientes`; no se cambia backend salvo prueba concreta y coordinación.

## Tasks

- [x] T1 · Card compartida para los campos del cliente nuevo; Cancelar descarta el borrador y vuelve a permitir elegir un cliente existente sin tocar el estado de la reserva. Pruebas nuevas observaron RED y luego GREEN.
- [x] T2 · Clientes permanece en `/atencion` junto a Comandas; se conservan búsqueda/edición/paginación y ambos paneles. Carga, error y vacío se distinguen; un cambio de filtro/página vuelve a activar carga, limpia error anterior e ignora respuestas obsoletas. Reenvíos del filtro activo y selección de página actual no activan carga si la consulta no cambia; limpiar solo el texto de búsqueda tampoco inicia una consulta sin cambios de filtro/página.
- [x] T3 · El endpoint y la base no cambiaron. `ClienteApi` diferencia error HTTP, rechazo de fetch y JSON inválido en respuesta exitosa. El fallo de conexión del navegador sigue sin reproducirse: evidencia local previa es HTTP 500 `text/plain`, 21 bytes; para diagnosticar URL/CORS hace falta evidencia sanitizada de runtime (URL efectiva sin secretos, error/estado de Network y consola).
- [x] T4 · OpenSpec actualizado con el escenario de Cancelar. Verificación focalizada final tras regresión de consulta idéntica: 106/106 pruebas; Prettier write/check y ESLint focalizado; `tsc --noEmit` completado. No se ejecutaron suites completas.
- [x] T5 · Corregir tres regresiones reportadas: acotar el Spinner por contexto en `AtencionPage.test.tsx`; distinguir Cancelar del Card de Cliente del Cancelar del modal Reserva y comprobar que la reserva siga abierta; dividir `SelectorCliente.test.tsx` para respetar ESLint max-lines-per-function sin quitar aserciones. Strict TDD: RED reproducido; ver evidencia abajo.

## Estado y evidencia

- Resolución inicial: `strict_tdd: true`, obtenida de `sdd-init/gestion-restaurante-g3`; runner frontend `npm test`.
- Exploración delegada: el formulario ya usa `SelectorCliente`, `PanelClientes` ya es una `Card` separada junto a `ComandasPanel`, `/clientes` se construye vía `clienteHttp` con prefijo `/api/v1`; la causa concreta del mensaje genérico no queda demostrada por código estático.
- Diagnóstico local inicial (sin mostrar body): `GET http://127.0.0.1:8000/api/v1/clientes?limit=1&offset=0` respondió HTTP 500, `text/plain`, 21 bytes; esto prueba que hay respuesta HTTP y no confirma por sí solo el mensaje observado en el navegador.
- RED inicial: 3 aserciones fallaron por falta de Card/Cancelar, carga del listado y clasificación de JSON inválido. RED adicional confirmó que al cambiar filtro tras cargar no reaparecía Spinner.
- RED al cambiar filtro: prueba focalizada mostró que el Spinner no reaparecía al pasar de lista cargada a consulta pendiente.
- GREEN al cambiar filtro: Spinner aparece con consulta pendiente y se oculta contenido obsoleto.
- RED de la regresión del filtro idéntico: `npm test -- src/modules/atencion/pages/AtencionClientes.test.tsx -t "no queda cargando al volver a enviar el filtro activo sin cambios"` — 1 falló; encontró Spinner y no el listado después del submit sin cambio de query.
- GREEN de esa regresión: mismo comando — 1 passed, 10 skipped; submit de query activa conserva lista y no queda cargando.
- GREEN final: `npm test -- src/modules/reservas/components/SelectorCliente.test.tsx src/modules/reservas/components/ReservaFormDialog.test.tsx src/modules/atencion/pages/AtencionClientes.test.tsx src/shared/api/client.test.ts` — 4 archivos, 106/106 tests.
- Formato: `npx prettier --write` y `npx prettier --check` sobre los seis archivos frontend modificados; ambos finalizaron correctamente.
- Lint: `npx eslint` focalizado sobre las fuentes productivas modificadas; typecheck: `npx tsc --noEmit`.
- Runtime diagnóstico: solicitud local previa a `http://127.0.0.1:8000/api/v1/clientes?limit=1&offset=0` respondió HTTP 500, `text/plain`, 21 bytes. Esto no demuestra causa de conexión/CORS en el navegador.
- Commit: pendiente/no creado por instrucción del usuario.
- Rama confirmada: `feature/S3-M4-integracion-clientes`; mantenerla fija durante T5.
- Precaución del usuario: no editar backend, no cambiar de rama y no hacer commit hasta que OpenCode termine y las verificaciones indicadas se completen. Se observó un archivo no rastreado `backend/restaurante.db.backup`; preservar sin leer ni modificar.
- T5 RED: pruebas focalizadas reprodujeron dos fallos (Spinner con dos `role="status"`; dos botones `Cancelar`) y ESLint reportó función de 54 líneas en `SelectorCliente.test.tsx`.
- T5 RED adicional: tras añadir la prueba contextual del botón, falló al no encontrar grupo accesible para la Card de Cliente nuevo.
- T5 GREEN: `npm test -- src/modules/atencion/pages/AtencionPage.test.tsx src/modules/reservas/pages/ReservasPage.test.tsx -t 'usa el indicador de carga compartido mientras espera el listado|cerrar el modal descarta la elección'` — 2 passed, 42 skipped.
- T5 verificación focalizada final: `npm test -- src/modules/atencion/pages/AtencionPage.test.tsx src/modules/reservas/pages/ReservasPage.test.tsx src/modules/reservas/components/SelectorCliente.test.tsx` — 3 archivos, 60/60 tests.
- T5 calidad: ESLint focalizado en esos tres tests y `SelectorCliente.tsx`, `npm run typecheck` y Prettier check focalizado en los cuatro archivos — todos pasaron.
- T5 mantuvo la rama `feature/S3-M4-integracion-clientes`; no se editaron rutas `backend/`, no se cambió de rama ni se creó commit.

## Cierre de unidad

Sin commit por instrucción explícita. Se preservaron los demás artefactos de `openspec/changes/S3-M4/`; no se modificó backend ni comportamiento/componentes de Comandas. El origen del error genérico observado en el navegador requiere evidencia de URL efectiva y Network/Console sanitizada, sin secretos.
