# Exploración: HU-M3-05 Crear una mesa

- **Issue:** [#38](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/38) · **Épica:** #37 · **Tarea padre:** #167
- **Rama:** `feature/HU-M3-05-crear-mesa`
- **Depende de:** HU-M3-01 (#33), que crea la entidad `Sector` y su tabla.
- **Entrada:** criterios de aceptación 1 a 7 del issue, diagrama de clases (Mesa y EstadoMesa) y `SPRINT-2/S2-04-maqueta/salon.html` (pestaña «Mesas» y formulario «Nueva mesa»).

## 1. Estado actual relevante

| Pieza | Estado |
| --- | --- |
| `Sector` (HU-M3-01) | `sectores` con `id`, `nombre`, `nombre_normalizado`, `descripcion` y `estado`. Es la dependencia de esta HU. |
| `backend/app/modules/salon/*` | Con HU-M3-01 integrada, tiene `Sector`, su alta y el router montado en `main.py`. No hay `Mesa`. |
| `backend/app/shared/models/enums.py` | `Estado` y `Categoria`. No existe `EstadoMesa`. |
| Diagrama de clases | `Mesa`: `id: int`, `numero: int {>0, único por sector}`, `capacidad: int {>0}`, `estado: EstadoMesa = LIBRE`; `EstadoMesa`: `LIBRE`, `OCUPADA`, `FUERA_DE_SERVICIO`. Asociación Sector 1 → 0..* Mesa. |
| Maqueta `salon.html` | Pestaña «Mesas» con filtros por sector y estado, tabla Número/Sector/Capacidad/Estado y formulario con Sector, Número y Capacidad. Aviso: «La mesa se crea en estado Libre» y «Solo sectores habilitados». |
| Frontend `salon/` | Con HU-M3-01 integrada, `types.ts` tiene `Sector` y `api.ts` tiene `crearSector`. `SalonPage` tiene el botón «Nuevo sector». Los tipos de `Mesa` son provisorios y en minúsculas. |
| Componentes compartidos | `Dialog`, `FormField`, `Input`, `Select`, `Button`, `Alert`, `PageHeader`, `useToast`, `useApi`. Se reutilizan. |

## 2. Hallazgos

### 2.1 Esquema

- Tabla nueva `mesas`: `id` entero; `numero` entero no nulo con `CHECK (numero > 0)`; `capacidad` entero no nulo con `CHECK (capacidad > 0)`; `sector_id` entero no nulo con FK a `sectores.id` y `ondelete=RESTRICT`; `estado` `Enum(EstadoMesa, native_enum=False)` no nulo con valor por defecto `LIBRE`.
- Unicidad: restricción única `(sector_id, numero)`. La comprobación previa en el `service` permite un 409 legible; la restricción cubre la carrera entre dos altas simultáneas.
- `EstadoMesa` va en `backend/app/shared/models/enums.py` (archivo compartido): M4 y M5 lo necesitan para mesas ocupadas y reservas, y el contrato de importación les prohíbe importar `salon/models.py`. Se avisa en el PR (§9.3).
- Es una entidad nueva: revisión de Alembic con `down_revision` en la revisión de HU-M3-01 y modo `batch` (SQLite).

### 2.2 Contradicción entre fuentes

`SPRINT-1/S1-07-casos-de-prueba.md` (caso CP-HU-M3-05) dice: número de 1 a 99, capacidad de 1 a 20 y estados `{LIBRE, OCUPADA, RESERVADA, INHABILITADA}`. El issue #38 y el diagrama de clases dicen: número entero mayor a cero, capacidad entera mayor a cero y `EstadoMesa {LIBRE, OCUPADA, FUERA_DE_SERVICIO}`. Según AGENTS.md §2, el issue gana para la HU y el diagrama para los atributos de la entidad: **no se agregan los topes 99/20 ni el estado `RESERVADA`**. La diferencia se señala en el PR.

### 2.3 API y capas

- `POST /api/v1/mesas` → 201 `MesaSalida {id, numero, capacidad, sector: {id, nombre}, estado}`.
- El estado no se recibe (`extra="forbid"`); el `service` fija `EstadoMesa.LIBRE`.
- Reglas: sector inexistente → 404; sector deshabilitado → 409 («Solo sectores habilitados», maqueta y S1-07); número repetido en el sector → 409; datos inválidos (número o capacidad no entero o ≤ 0, sector ausente) → 422.
- Para el selector del formulario hace falta leer los sectores habilitados. `GET /api/v1/sectores` (paginado, filtro opcional `estado`) se agrega como lectura de apoyo mínima; la pantalla de listado de sectores sigue siendo HU-M3-04. **Supuesto** a validar en la revisión de la spec.

### 2.4 Frontend

- En `/salon`, junto a «Nuevo sector», se agrega «Nueva mesa». El diálogo tiene Sector (obligatorio, solo habilitados), Número y Capacidad (obligatorios, enteros mayores a cero) y el aviso «La mesa se crea en estado Libre».
- Validaciones locales: número y capacidad con `^[1-9]\d*$`; mensajes «El número es obligatorio.» / «El número debe ser un número entero mayor a cero.» y «La capacidad es obligatoria.» / «La capacidad debe ser un número entero mayor a cero.»; sector «El sector es obligatorio.».
- El 409 de número repetido se muestra bajo Número; el de sector deshabilitado, bajo Sector; el resto, como error general.
- Sin sectores habilitados: aviso con enlace a la creación de sector y «Guardar» deshabilitado (mismo patrón que M1).
- Diferencias con la maqueta: sin tabla, filtros ni pestañas; el alta va en un diálogo. Se anota en el PR.

### 2.5 Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 245 (incluye ≈ 40 de migración y la lectura de apoyo) | ≈ 350 | ≈ 595 | 800: holgado |
| Frontend | ≈ 265 | ≈ 250 | ≈ 515 | 800: holgado |

Va en un solo PR (AGENTS.md §4).

## 3. Decisiones de rumbo

1. **Lectura de apoyo `GET /sectores`** para el selector del formulario: se incluye el mínimo paginado con filtro `estado`; el listado visible queda para HU-M3-04. Confirmar en la revisión de la spec.
2. **`EstadoMesa` en `shared/models/enums.py`**: archivo compartido, se avisa a M4 y M5.

## 4. Supuestos

- S1: la unicidad del número es por sector y se evalúa sobre `numero` entero; dos sectores pueden tener la mesa 1.
- S2: solo se puede asignar un sector habilitado; uno deshabilitado responde 409.
- S3: no hay tope superior de número ni de capacidad; la HU solo exige «mayor a cero». Se descartan los topes 99/20 de S1-07 por contradecir el issue.
- S4: el estado no se recibe; toda alta queda `LIBRE`.
- S5: el diálogo se guía por la maqueta; las tablas y filtros son de HU-M3-08.

## 5. Riesgos

- Dependencia de HU-M3-01: si no está integrada al empezar el apply, la rama se apila sobre `feature/HU-M3-01-agregar-sector` y se rebasa después del merge.
- Dos migraciones encadenadas (`sectores` → `mesas`): verificar `alembic heads` antes del PR.
- `shared/models/enums.py` y `main.py` son compartidos: cambios mínimos, avisados en el PR.
