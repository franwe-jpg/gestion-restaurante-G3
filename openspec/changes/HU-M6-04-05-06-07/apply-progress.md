# Progreso de la implementación: HU-M6-04 a HU-M6-07

| Unidad | Commit | Estado |
| --- | --- | --- |
| 1 · Backend: entidad, migración y API | `72faa2c` | Hecha |
| 2 · Frontend: pantalla `/pagos` | `d302c2e` | Hecha |
| 3 · Cierre documental | este commit | Hecha |

## Ruta

El plan preveía dos escritores en paralelo. Los dos se detuvieron porque no podían mostrar los pedidos de permiso a la persona; del escritor del backend quedaron `conftest.py`, `test_modelo.py` y `test_migracion.py`, que se revisaron y se conservaron. El resto se implementó en la conversación principal con Strict TDD: cada archivo de pruebas se vio fallar antes de escribir el código.

## Desvíos respecto del diseño

- **`_confirmar` agrega y confirma en el mismo `try`.** En el alta, `repository.agregar` hace `flush`, así que un nombre repetido por carrera fallaría ahí. Se cubre con `test_crear_medio_pago_con_nombre_repetido_por_carrera_lanza_regla_de_negocio`.
- **Mensaje del 409 en el formulario.** Se muestra tal como lo envía el backend («El medio de pago ya existe»), bajo el campo Nombre.
- **Lista vacía con la casilla marcada.** Dice «No hay medios de pago cargados.»; sin la casilla, el texto de #77. El `EmptyState` exige descripción: «Agregá uno con «Nuevo medio de pago».».
- **Tamaño.** Backend +1135 líneas (unas 210 de código y el resto pruebas) y frontend +1129 / −25 (unas 470 de código). Los dos superan el punto de control de 800 por las pruebas; AGENTS.md §4 indica que no se divide el PR.

## Pendiente

- Comprobación manual en el navegador (tarea 3.2).
- Escenarios diferidos al Sprint 3 (S5): ver `verify-report.md`.
