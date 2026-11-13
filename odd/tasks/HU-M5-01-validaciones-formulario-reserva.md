# HU-M5-01 — Validaciones del formulario de reserva

Objetivo: corregir cinco puntos pedidos por la responsable del módulo M5 sobre el formulario de reserva y entregar el comando para crear el usuario encargado.

Rama: `feature/HU-M5-01-validaciones-del-formulario` (desde `develop` en `2a218fb`) · entrega: un solo PR hacia `develop` (pendiente de confirmación) · TDD: Strict (`strict_tdd: true` en `openspec/config.yaml`; backend `pytest` con Docker Compose, frontend `npm test`) · estrategia de entrega: `ask-on-risk`.

## Alcance autorizado

1. Nombre del cliente nuevo: no admite dígitos al escribir y tiene un largo máximo.
2. Teléfono del cliente nuevo: no admite espacios en blanco.
3. Cliente existente: además del buscador, un desplegable con los clientes registrados.
4. El mensaje «La mesa elegida admite hasta N personas» se muestra en el campo mesa y no en el de cantidad de personas.
5. Entregar el comando para crear el usuario encargado (no se ejecuta sobre la base de la persona).
6. Después: commit, push y PR de `S1-09` (rama `feature/S1-09-conformidad-auditoria`, ya confirmado por la persona).

## Restricciones

- Solo el módulo M5 (`reservas`). No se cambia `atencion` (M4) ni `shared/` (AGENTS.md, sección 9.3). El listado de clientes ya existe en `GET /clientes` de M4.
- Los valores nuevos (largo del nombre, quitar espacios del teléfono) son supuestos marcados `Supuesto:` en la spec para validación del equipo.
- Sin secretos ni lectura de `.env`. No tocar la base local ni el sistema levantado; no `docker compose down -v`.
- Los escritores no hacen commit ni push; el commit lo hace el agente principal.
- Planificación: unas 400 líneas de cambio como referencia (no es un tope). Si el cambio la supera por la prueba y la spec, se explica y se continúa.

## Criterios de aceptación

1. El campo nombre descarta dígitos y símbolos al escribir o pegar, y no admite más de 60 caracteres; el backend de M5 rechaza con 422 un nombre de más de 60.
2. El campo teléfono descarta espacios al escribir o pegar; el backend de M5 rechaza con 422 un teléfono con espacios internos.
3. En el alta, un desplegable «Clientes registrados» lista los clientes (hasta 100) y elegir uno equivale a elegirlo en el buscador.
4. El error de capacidad, local o 409 del servidor, aparece bajo el campo mesa y no bajo cantidad de personas ni como alerta general.
5. Se entrega el comando para el usuario encargado, verificado sin tocar datos.

## Tasks

Ruta: delegada, un solo escritor a la vez. Evidencia del disparador: la corrección toca esquema, pruebas del backend, spec y varios componentes y pruebas del frontend (más de 2 archivos no triviales).

- [x] T1 · Backend M5 y spec: teléfono sin espacios, nombre con máximo de 60 caracteres, pruebas y spec (S66 revisado, S70 a S72). RED observado: 28 pruebas fallaron por la razón correcta; GREEN: 370 pasaron en `test_schemas.py` y `test_router.py`; carpeta completa del módulo: 737 pasaron, con `ruff`, `ruff format --check` y `lint-imports` en verde. Verificación independiente del agente principal: `ruff` y `format` sin hallazgos y 416 pruebas pasan en `test_schemas.py` y `test_service.py`. Ruta: delegada (escritor 1). S72 cubre alta y modificación.
- [x] T2 · Frontend: nombre (filtro de letras y espacios, máximo de 60) y teléfono (sin espacios). RED: 42 de 130 pruebas de `validarReserva.test.ts` y 4 de `SelectorCliente.test.tsx` fallaban; GREEN: pasan.
- [x] T3 · Frontend: desplegable «Clientes registrados» (hook `useClientesRegistrados`, `listarClientes` y campo en `SelectorCliente`). RED: 15 de 48 pruebas de `SelectorCliente.test.tsx` y el hook inexistente; GREEN: pasan. La prueba de `listarClientes` en `api.test.ts` se aplicó desde el diff del escritor, porque ese archivo no figuraba en las superficies permitidas (omisión del agente principal).
- [x] T4 · Frontend: error de capacidad en el campo mesa, local y 409, en el alta y en la modificación. RED: 4 pruebas de `ReservaFormDialog.test.tsx`; GREEN: pasan.
- [x] T5 · Comando para crear el usuario encargado: `docker compose up --build -d` y luego `docker compose exec backend python -m scripts.crear_encargado --correo <correo>`. Verificado solo el script y su `--help` en un contenedor descartable; el comando no se ejecutó sobre la base de la persona.
- [ ] T6 · Commit de la rama `feature/S1-09-conformidad-auditoria` ya hecho (`b5fd03e`); falta push y PR.

## Estado y evidencia

- Exploración delegada a un agente de solo lectura (informe con `ruta:línea`). Hallazgos: el nombre ya se valida como solo letras y espacios pero no tiene largo máximo ni filtro al escribir; el teléfono admite espacios (S66); el 409 de capacidad llega como alerta general y la validación local va al campo cantidad; `GET /clientes` vive en M4 (máximo 100 por página); el script `backend/scripts/crear_encargado.py` pide la contraseña con `getpass`.
- Hallazgo de entorno: la imagen Docker del backend es anterior a HU-TR-01 y no trae `bcrypt` (`ModuleNotFoundError`). Con el código actualizado de `develop` el backend local no arranca (`/docs` sin respuesta, logs con el mismo error) hasta reconstruir la imagen con `docker compose up --build -d`. Las pruebas del escritor usan `pip install --user -r requirements.txt` dentro del contenedor descartable.
- Numeración de supuestos: S69 es el último de `HU-M5-01-02-03`; S68 está en `HU-M5-06`. Se usan S70, S71 y S72.
- Resolución de skills: ninguna aplica a esta tarea (`skill_resolution: none`).
- Commit de S1-09: `b5fd03e` en `feature/S1-09-conformidad-auditoria`, sin push.
- Commit de T1: `ae83500` (backend y spec). El de T2 a T4 es el siguiente de esta rama.
- Verificación independiente del agente principal sobre el frontend completo: `npm run lint` (0 advertencias), `format:check`, `typecheck`, `npm run test:coverage` (161 archivos, 1865 pruebas, cobertura de líneas 90,14 % y de sentencias 89,35 %) y `vite build` (a un directorio temporal): todo en verde. La corrida del escritor había visto una falla intermitente en una prueba de M4 (`EntregasComandaDialog.test.tsx`); en esta corrida pasó.
- Decisiones del agente principal: el mensaje de fallo de la lista de clientes es el fijo «No se pudo cargar la lista de clientes. Se puede buscar por nombre o teléfono.» (la spec se alineó con el código); elegir la opción inicial del desplegable limpia la selección.
- Límites conocidos: los errores del servidor se reemplazan en el siguiente envío (no al editar el campo), igual que los demás; si el cliente elegido no está entre los primeros 100 del desplegable, este muestra la opción inicial y el cliente sigue visible como elegido; la lista se pide una vez, sin reintento al reabrir la tarjeta del cliente nuevo.
- No probado en un navegador: la verificación es con pruebas automáticas, y el backend local de la persona estaba caído por la imagen sin `bcrypt`.
