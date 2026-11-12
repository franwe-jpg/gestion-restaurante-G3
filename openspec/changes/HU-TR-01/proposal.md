# Propuesta: HU-TR-01 Inicio de sesión y usuarios con roles

- **Issue:** [#172](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/172) (transversal) · **Rama:** `feature/HU-TR-01-login-y-roles`
- **Entrega:** un solo PR.
- **Nota transversal para el PR:** con autorización de la persona, esta HU toca `shared/` y los seis módulos, y suma la entidad `Chef` en M3 (AGENTS.md §9.3).

## Intención

Hoy cualquiera que llegue a la API o al frontend puede usar todo: no hay usuarios, `shared/seguridad.py` es un marcador vacío (D-13) y varias specs anotaron que «el sistema no tiene roles» (HU-M5-06, S8). Esta HU agrega el inicio y el cierre de sesión con correo y contraseña, usuarios vinculados a mozos y chefs, y control de acceso por rol. El backend lo exige (RNF-SEG-02) y el frontend no muestra lo que el rol no puede ver ni hacer.

## Alcance

### Incluido

- Entidades `Usuario` y sesiones, con migración de Alembic.
- Nueva entidad `Chef` en M3. `Usuario` y `Chef` se agregan al diagrama de clases.
- Inicio de sesión (correo y contraseña), cierre de sesión y consulta de la sesión actual.
- M3: los formularios de alta y de modificación de `Mozo` y de `Chef` piden correo y contraseña, y ambos se pueden editar. Al guardar se crea o se actualiza el `Usuario` vinculado. Solo el encargado los gestiona.
- M3: nueva pestaña «Chefs» junto a «Mozos», con alta, modificación, baja y listado. El título del módulo nombra a los chefs.
- Dependencia de FastAPI en `shared/seguridad.py`: sin sesión responde 401 y sin permiso, 403. Se aplica en todos los endpoints según la matriz.
- Frontend: pantalla de inicio de sesión, rutas protegidas y encabezado con el usuario y el botón «Cerrar sesión». El menú lateral, las páginas, las pestañas, los botones y las acciones se ocultan según el rol.
- Script para crear el primer encargado, sin secretos en el repositorio.
- Una prueba por criterio de aceptación.

### Matriz de permisos (decidida por el equipo)

| Módulo | Encargado | Mozo | Chef |
| --- | --- | --- | --- |
| M1 Productos y Carta | Todo | Ver | Ver |
| M2 Menús y Promociones | Todo | Ver | Ver |
| M3 Salón, Mozos y Chefs | Todo | Ver mesas y sectores | Sin acceso |
| M4 Atención | Todo | Todo: ver, crear, editar, registrar entregas, cerrar, reabrir y anular **cualquier** comanda; listar y modificar clientes | Ver comandas y su detalle |
| M5 Reservas | Todo | Todo: ver, crear, modificar, cancelar con anticipación o por ausencia y abrir la comanda de una reserva | Ver |
| M6 Pagos | Todo | Ver la cuenta, facturar y cobrar **cualquier** comanda | Sin acceso |
| Reportes | Todo | — | — |

El encargado es también el gerente. No existe el rol cajero. Un usuario puede tener varios roles y recibe la suma de sus permisos.

Le corresponde solo al encargado:

- los reportes;
- en M3, las altas, bajas y modificaciones de sectores, mesas, mozos y chefs, incluidas sus credenciales;
- en M1 y M2, las altas, bajas y modificaciones de productos, secciones, menús y promociones;
- todo lo que la matriz no le asigna al mozo o al chef.

### Excluido

- El rol cajero.
- Una pantalla o un módulo aparte para gestionar usuarios. Los encargados no se gestionan desde la interfaz.
- Regla de «comanda propia». En esta HU no cambian `Comanda.mozo_id`, el `service` de M4 ni el paso de reserva a comanda de M5.
- Estado «no disponible» o baja de platos por parte del chef.
- El estado «listo» que marca el chef en cocina: lo agrega HU-M4-12 «Marcar un producto como listo en cocina» ([#242](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/242)). En esta HU el chef solo ve las comandas y su detalle.
- Renovación automática de la sesión.
- Recuperación de contraseña, bloqueo por intentos fallidos, auditoría de accesos y cambio de contraseña por la propia persona.
- HTTPS (RNF-SEG-11).
- El selector de mozo en el alta de comanda (S4-04, #225).

## Capacidades

### Nuevas

- `autenticacion-sesion`: inicio de sesión con correo y contraseña, cierre de sesión, sesión actual, vencimiento a las 8 horas y respuesta 401 sin sesión.
- `control-de-acceso`: matriz de permisos en la API (403) y en la interfaz (no mostrar).
- `salon-chefs`: alta, modificación, baja y listado de chefs, con sus credenciales.
- `salon-mozos-credenciales`: correo y contraseña en el alta y la modificación de mozos, con el `Usuario` vinculado.

### Modificadas

- Ninguna. La matriz se especifica de forma transversal en `control-de-acceso`. Las specs `carta-*` y `comanda-anulacion` no cambian su comportamiento; solo quedan restringidas por rol.

## Enfoque

- **Sesión (decidido):** token opaco (`secrets.token_urlsafe`), guardado como hash SHA-256 en la tabla `sesiones`. Vence 8 horas después del inicio de sesión, lo controla el servidor y no se renueva. Viaja en `Authorization: Bearer`. El frontend lo guarda en `sessionStorage`, así que se pierde al cerrar la pestaña. Al cerrar sesión se borra en el servidor.
- **Contraseñas:** `bcrypt` con versión exacta (RNF-SEG-03).
- **Backend (D-13):** `shared/seguridad.py` expone el usuario actual y un verificador de permisos, y lo aplican los `router`. Los `service` de M1, M2, M4, M5 y M6 no cambian. El `service` de salón crea y actualiza el `Usuario` junto con el `Mozo` o el `Chef`. En el diseño se decide la ubicación de `Usuario` (`shared/models/`) y del router de sesión.
- **Matriz única:** un solo lugar en el backend y otro en el frontend (`shared/auth/`). Así, en cada módulo el cambio se reduce a pocas líneas.
- **Frontend:** proveedor de sesión con una función `puede(permiso)`. `client.ts` agrega el token y, si recibe 401, vuelve a la pantalla de inicio de sesión. `navegacion.ts` filtra el menú por permiso. Pestaña «Chefs» y formularios en `Dialog`.
- **Pruebas existentes:** en el backend, `conftest` inyecta por defecto un encargado con `dependency_overrides`. En el frontend, un envoltorio de prueba con sesión de encargado.

## Supuestos

| # | Supuesto: |
| --- | --- |
| S1 | `Chef` tiene los mismos atributos que `Mozo`: DNI único, nombre, apellido, teléfono opcional y estado. |
| S2 | El correo es único sin distinguir mayúsculas y su formato se valida sin agregar dependencias. La contraseña tiene entre 8 y 72 bytes (límite de bcrypt). En la modificación, una contraseña vacía conserva la actual. |
| S3 | Si el correo ya pertenece a otro usuario, el alta o la modificación responde 409. Los formularios crean un usuario con un solo rol. El modelo admite varios roles, pero en esta HU no hay una vía en la interfaz para combinarlos. |
| S4 | La baja de un `Mozo` o de un `Chef` deshabilita su usuario e invalida sus sesiones. Un usuario deshabilitado no puede iniciar sesión. |
| S5 | Los mozos que ya existen quedan sin usuario. No pueden iniciar sesión hasta que el encargado cargue su correo y su contraseña en la modificación. |
| S6 | Los encargados se crean solo con el script, que recibe el correo y la contraseña al ejecutarse. |
| S7 | En M6, el mozo puede listar los medios de pago y consultar facturas y comprobantes, incluido el PDF. La gestión de los medios de pago y la caja del día le corresponden al encargado. |
| S8 | El módulo se titula «Salón, Mozos y Chefs» en el menú y en la página. |
| S9 | `/salud` y `/media` siguen públicos. |
| S10 | Se agregan los códigos 401 y 403 a D-25, con el formato `{"detalle"}`. Si el inicio de sesión falla, el mensaje es genérico: «Correo o contraseña incorrectos». |
| S11 | `bcrypt` es una dependencia nueva y se acuerda con el equipo (AGENTS.md §9.7). |
| S12 | En esta fase no se leyó el texto del issue #172. La spec debe contrastar los criterios de aceptación con el issue. |

## Áreas afectadas

| Área | Impacto |
| --- | --- |
| `backend/app/shared/seguridad.py`, `shared/models/` | Modificado: usuario, sesión, dependencia y matriz |
| Router de sesión (`/sesion`; ubicación en el diseño) | Nuevo |
| `backend/app/modules/salon/` | Modificado: entidad `Chef` y credenciales en `Mozo` |
| `backend/app/modules/*/router.py` (los seis módulos) | Modificado: permisos por endpoint |
| `backend/app/main.py`, `alembic/env.py`, `alembic/versions/`, `requirements.txt`, `scripts/`, `tests/` | Modificado y nuevo |
| `frontend/src/shared/{api/client.ts,auth/,components/layout/}`, `App.tsx`, `Inicio` | Modificado y nuevo |
| `frontend/src/modules/salon/` | Modificado: pestaña «Chefs» y campos de credenciales |
| `frontend/src/modules/*/pages` y `components` | Modificado: ocultar acciones |
| `SPRINT-0/G3 - Diagrama de clases unificado.drawio`, `FLUJO_DIARIO.md` | Modificado |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Se rompen las pruebas existentes de los seis módulos. | Encargado inyectado por defecto y pruebas específicas de 401 y 403. |
| Conflictos con los PR abiertos de otros integrantes. | Cambios de pocas líneas por endpoint, nota transversal en el PR y `git pull origin develop` antes del PR. |
| Ocultar algo en la interfaz no lo protege. | El backend siempre decide (403). |
| Una base existente sin usuarios, o mozos sin credenciales, dejan el sistema inaccesible. | Script del primer encargado, documentado en `FLUJO_DIARIO.md`. El encargado carga las credenciales de los mozos (S5). |
| No hay una vía en la interfaz para dar varios roles a un usuario (S3). | Queda señalado para que el equipo lo valide. El modelo lo soporta sin cambios de esquema. |

## Plan de reversión

- `alembic downgrade` de las migraciones de esta HU elimina `usuarios`, `sesiones` y `chefs`. Ninguna tabla de negocio previa depende de ellas.
- Revertir el merge en `develop`: `seguridad.py` vuelve a no restringir, desaparece la pestaña «Chefs» y el frontend vuelve a abrir sin inicio de sesión.

## Dependencias

- `Mozo` (M3) ya existe en `develop`.
- Acuerdo del equipo sobre `bcrypt` (S11).

## Criterios de éxito

- [ ] Sin sesión o con la sesión vencida (8 horas), la API responde 401 y el frontend muestra la pantalla de inicio de sesión.
- [ ] Cada celda de la matriz tiene una prueba en la API (permitido o 403) y cada rol ve solo lo que puede usar.
- [ ] El encargado da de alta un mozo o un chef con correo y contraseña, y esa persona puede iniciar sesión.
- [ ] La contraseña guardada no coincide con la original (RNF-SEG-03).
- [ ] CI en verde: ruff, `lint-imports`, pytest ≥ 70 %, frontend ≥ 60 % y build.
- [ ] El equipo valida los supuestos S1 a S12.
