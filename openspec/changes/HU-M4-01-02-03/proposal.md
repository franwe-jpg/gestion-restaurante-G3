# Propuesta: HU-M4-01-02-03 · Gestión de clientes

## Intención

Reunir el alta vinculada a la primera reserva, la modificación y el listado de `Cliente` en un único cambio del módulo M4. La persona encargada debe poder consultar y corregir datos de clientes sin crear registros huérfanos ni alterar un registro cuando una edición es inválida. Fuentes de aceptación: [HU-M4-01 (#48)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/48), [HU-M4-02 (#49)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/49) y [HU-M4-03 (#50)](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/50).

## Alcance

### Incluido

- **#48 — Alta:** registrar `Cliente` únicamente junto con su primera `Reserva`; exigir `nombre` y `telefono` como texto, sin unicidad para ninguno. `nombre` solo admite letras. No habilitar un alta independiente que deje clientes sin reserva.
- **#49 — Modificación:** permitir corregir datos de un cliente existente y mostrar los datos nuevos; rechazar un nombre con caracteres no válidos, un dato obligatorio vacío o un teléfono fuera del formato técnico provisional confirmado, sin aplicar cambios.
- **#50 — Listado:** mostrar cada cliente con sus datos de contacto; buscar coincidencias totales o parciales por nombre y buscar por teléfono, con avisos diferenciados para lista vacía y filtro sin resultados.
- En la especificación, trazar por separado los **3 criterios de #48, 4 de #49 y 5 de #50**, con un escenario y una prueba por criterio. Para #48, incluir la asociación al guardar la primera reserva, el rechazo de datos obligatorios faltantes con aviso del campo y el aviso ante números o caracteres especiales en `nombre`.

### Excluido

- Baja de clientes, alta independiente y cambios funcionales de `Reserva` pertenecientes a M5.
- Imponer unicidad al nombre o al teléfono, longitud telefónica o restricciones adicionales al formato técnico provisional confirmado.
- Modificar en esta tarea los diagramas de clases, código, migraciones, módulos ajenos o `shared/`.

## Capacidades

### Nuevas

- `atencion-clientes`: alta vinculada a la primera reserva, modificación segura y listado con búsqueda de clientes; la especificación posterior conservará la trazabilidad de #48, #49 y #50.

### Modificadas

Ninguna: `openspec/specs/` no contiene actualmente una especificación de clientes.

## Enfoque

Mantener la propiedad de `Cliente` y su consulta/edición en M4; definir el punto de integración con el servicio de reservas de M5 para el alta conjunta, con confirmación transaccional que impida dejar un cliente huérfano si la reserva falla. Según #61, la reserva admite seleccionar un cliente existente o, si no está registrado, ingresar nombre y teléfono obligatorios y guardarlos junto con la reserva; requiere fecha, hora, cantidad de personas, mesa disponible y estado activo. La fase de diseño deberá acordar con M5 quién inicia la operación y cómo se conserva la frontera entre módulos; no se prescribe aquí una ruta HTTP de alta independiente ni se cambia el módulo M5 por anticipado. Para el listado, seguir la paginación compartida y canalizar las llamadas de la interfaz por `frontend/src/modules/atencion/api.ts`.

## Áreas afectadas en una futura implementación

| Área | Impacto previsto |
| --- | --- |
| `backend/app/modules/atencion/` y `backend/tests/modules/atencion/` | Modelo, validación, servicio, consultas y pruebas de clientes. |
| `frontend/src/modules/atencion/` | Listado, búsqueda, edición y estados vacíos. |
| `backend/alembic/` | Migración versionada para persistir clientes, sujeta a la coordinación con M5. |
| `backend/app/modules/reservas/` | Dependencia de integración **por acordar** con el responsable de M5; fuera de los cambios autorizados aquí. |

## Diferencias documentales pendientes

- El diagrama M4 por módulo representa `nombre` como único y `telefono` como entero; las decisiones confirmadas son nombre **no único** y teléfono **texto, obligatorio y no único**.
- El diagrama unificado indica `telefono: str [0..1]` (opcional); prevalece la decisión confirmada de obligatoriedad. Corregir ambos diagramas corresponde a una tarea documental posterior, no a esta propuesta.
- El caso de prueba `SPRINT-1/S1-07-casos-de-prueba.md` describe teléfono opcional y longitud de 7 a 20 caracteres. No tomar esa regla como contrato nuevo: prevalece el formato técnico provisional confirmado en la spec y el diseño; la actualización documental queda pendiente.

## Riesgos y asuntos pendientes

| Asunto | Tratamiento |
| --- | --- |
| Integración con [M5 #61](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/61) | Los cuatro issues están **abiertos**. #48 remite a #61; #61 remite a #48 y M3. Sus cuerpos no declaran otros vínculos explícitos «Depende de». Coordinar con M5 y comprobar el cierre de las dependencias antes de implementar el flujo conjunto; no asumir que ya están cerradas. |
| Criterio de #49 sobre teléfono con formato no válido | `Supuesto:` formato técnico provisional confirmado: `str` obligatorio y no único; admite dígitos, espacios, guiones y `+` únicamente al comienzo, sin longitud ni otras restricciones añadidas. La definición funcional definitiva sigue pendiente del equipo. |
| Rama actual `feat/m4-clientes` distinta de `feature/<ID>-<descripcion>` exigida por `AGENTS.md` | Regularizar la rama antes de implementar; no modificarla durante esta fase de planificación. |
| Presupuesto de revisión de 400 líneas cambiadas por PR, con entrega en un solo PR | Pronosticar tamaño en tareas y señalar el exceso antes de aplicar; la pauta local de 800 líneas por lado no reemplaza este presupuesto de sesión. |

## Reversión

Si se implementa el esquema, comprobar el `downgrade` de Alembic en una base temporal y que no elimine datos de reservas u otros módulos. Para un entorno con datos, respaldar los clientes y las reservas asociadas antes de revertir una migración destructiva; revertir juntos la interfaz y la API del cambio, coordinando primero cualquier dependencia ya integrada por M5.

## Criterios de éxito

- [ ] Los 12 criterios suministrados de #48, #49 y #50 quedan trazados individualmente a escenarios y pruebas en la spec; el criterio de formato telefónico usa solo el supuesto técnico provisional confirmado.
- [ ] No puede persistir un cliente sin su primera reserva durante el alta; un fallo de la reserva no deja cliente creado.
- [ ] Una edición inválida conserva los datos previos; se pueden listar y buscar clientes por nombre o teléfono y distinguir los estados vacíos.
- [ ] Las reglas de nombre y teléfono reflejan las decisiones confirmadas, sin longitud telefónica inventada ni unicidad nueva.
- [ ] La integración con #61 se coordina y se comprueba el estado de las dependencias antes de implementar; no se modifican otros módulos sin acuerdo.
