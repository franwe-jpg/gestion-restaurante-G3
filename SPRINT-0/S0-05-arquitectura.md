# S0-05 · Decisiones de arquitectura y diseño

**ISFPP 2026 · Sistema de Gestión de Restaurante · Grupo 3**\
Responsable: Héctor Sánchez · Sprint 0, semana 1 · Issue #94 · Depende de S0-04 (#93)

## 1. Alcance y criterios

Este documento define la arquitectura del sistema: capas, estructura de carpetas del frontend y del backend, y estilo de la API. Cada decisión indica qué se eligió, qué alternativa se descartó y por qué, y se relaciona con los RNF de `S0-04-rnf.md`.

- **La arquitectura se adapta a los RNF, no al revés.** Cuando una decisión de diseño choca con un RNF, se cambia la decisión.
- No se escribe código de la aplicación: los esqueletos son las tareas S1-05 (backend) y S1-06 (frontend).
- Las decisiones que la consigna no fija y que dependen del criterio del equipo están marcadas como `Supuesto:` y se listan en la sección 8.
- Principio rector: **empezar por la estructura más simple que cumpla los RNF, y agregar abstracciones solo cuando exista una necesidad concreta.**

## 2. Visión general

```text
   Navegador                    Servidor                         Archivo
┌─────────────┐   HTTP/JSON   ┌───────────────────────────────┐   ┌──────────┐
│   React +   │ ────────────► │  FastAPI                      │   │  SQLite  │
│ TypeScript  │ ◄──────────── │  router → service → repository│──►│  (.db)   │
│   (Vite)    │   API REST    │                               │   └──────────┘
└─────────────┘               └───────────────────────────────┘
```

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| Frontend | React con TypeScript (Vite) | Interfaz de usuario. Solo habla con la API; nunca accede a la base. |
| Backend | Python con FastAPI | API REST y reglas de negocio. |
| Persistencia | SQLite | Un archivo, una escritura a la vez. |

### 2.1 Estructura del repositorio

```text
gestion-restaurante-G3/
├── backend/             # FastAPI (sección 3)
├── frontend/            # React (sección 4)
├── SPRINT-0/            # documentos del Sprint 0
├── material-catedra/
├── AGENTS.md            # reglas del equipo (S1-04)
├── README.md
└── .gitignore
```

| ID | Decisión | Alternativa descartada | Justificación | RNF |
| --- | --- | --- | --- | --- |
| D-31 | **Un solo repositorio con dos carpetas en la raíz: `backend/` y `frontend/`.** Cada una tiene sus propias dependencias, su linter y sus pruebas. | Dos repositorios separados, o nombres con el prefijo del proyecto (`restaurant-api`, `restaurant-web`). | Es un solo sistema, con un único tablero, un único flujo de ramas y Pull Requests hacia `develop`. Un cambio de la API y su pantalla se integran juntos. Los nombres cortos describen el rol y no repiten el del repositorio. | RNF-MAN-02, RNF-MAN-03, RNF-MAN-08 |

## 3. Backend

### 3.1 Estructura de carpetas

El backend se organiza **por módulo** (los 6 módulos del plan) y, dentro de cada módulo, **por capa**. Lo que usan varios módulos vive en `shared/`.

```text
backend/
├── app/
│   ├── main.py              # crea la app FastAPI y registra los routers de cada módulo
│   ├── config.py            # configuración y variables de entorno
│   ├── database.py          # conexión, sesión y configuración de SQLite
│   │
│   ├── modules/
│   │   ├── productos/       # M1 Productos y Carta
│   │   │   ├── router.py        # endpoints HTTP
│   │   │   ├── service.py       # reglas de negocio y transacciones
│   │   │   ├── repository.py    # acceso a datos (consultas)
│   │   │   ├── models.py        # tablas del módulo
│   │   │   └── schemas.py       # entrada y salida de la API
│   │   ├── menus/           # M2 Menús y Promociones   (misma estructura)
│   │   ├── salon/           # M3 Salón y Mozos
│   │   ├── atencion/        # M4 Atención al Público
│   │   ├── reservas/        # M5 Reservas
│   │   └── pagos/           # M6 Pagos
│   │
│   └── shared/
│       ├── models/          # entidades compartidas entre módulos (se definen en S0-09)
│       ├── base_repository.py   # operaciones CRUD genéricas
│       ├── excepciones.py   # errores de negocio comunes
│       ├── paginacion.py    # parámetros y respuesta paginada
│       └── seguridad.py     # punto de enganche de la autenticación (ver D-13)
│
├── tests/                   # replica la estructura de modules/
├── scripts/                 # carga de la base de datos de referencia
├── alembic/                 # migraciones
├── .env                     # no se versiona
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

### 3.2 Responsabilidad de cada pieza

| Pieza | Responsabilidad | Lo que NO debe hacer |
| --- | --- | --- |
| `main.py` | Crear la aplicación, registrar los routers y la configuración global (CORS, manejo de errores). | Contener lógica de negocio o acceso a datos. |
| `config.py` | Centralizar la configuración y leer las variables de entorno. | Repartir configuración por otros archivos. |
| `database.py` | Abrir la conexión, entregar la sesión y aplicar los `PRAGMA` de SQLite. | Contener consultas de negocio. |
| `router.py` | Recibir la solicitud, validar parámetros, delegar al servicio y devolver la respuesta HTTP. | Contener reglas de negocio, consultas SQL o importar el repositorio. |
| `service.py` | Implementar las reglas de negocio y abrir y cerrar las transacciones. | Depender de FastAPI (`Request`, `Response`, `HTTPException`) ni escribir consultas. |
| `repository.py` | Ejecutar las consultas de lectura y escritura sobre los modelos. | Contener reglas de negocio ni confirmar transacciones. |
| `models.py` | Definir las tablas del módulo y sus relaciones. | Contener reglas de negocio ni validación de entrada. |
| `schemas.py` | Definir qué datos recibe y devuelve la API y sus validaciones. | Exponer directamente los modelos de persistencia. |
| `shared/` | Contener solo lo que usan dos o más módulos. | Convertirse en un cajón de código sin responsabilidad clara. |

### 3.3 Flujo y reglas de dependencia

```text
Cliente → router → service → repository → models → SQLite
              (schemas en la entrada y la salida de la API)
```

| Archivo | Puede importar | No puede importar |
| --- | --- | --- |
| `router.py` | `service`, `schemas` y `shared` de su módulo | `repository`, `models` |
| `service.py` | `repository`, `models`, `schemas` y `shared` de su módulo, y el `service` de **otro** módulo | `router`, FastAPI; `repository`, `models`, `schemas` de otro módulo |
| `repository.py` | `models` de su módulo y `shared` | `router`, `service` |
| `models.py` | `shared/models` | cualquier otra capa |

Los errores de negocio se señalan con excepciones propias (`NoEncontradoError`, `ReglaDeNegocioError`, ...) definidas en `shared/excepciones.py`. Un manejador global en `main.py` las traduce a códigos HTTP.

### 3.4 Decisiones del backend

| ID | Decisión | Alternativa descartada | Justificación | RNF |
| --- | --- | --- | --- | --- |
| D-01 | **Arquitectura por capas simple**: router, service, repository, models y schemas. | Clean o Hexagonal Architecture. | Cada capa responde a un RNF concreto. Puertos, adaptadores y casos de uso agregarían archivos y conceptos sin que ningún RNF los pida, con 6 personas y un plazo corto. | RNF-MAN-01, RNF-MAN-10 |
| D-02 | **Capa de repositorios separada**: las consultas viven en `repository.py`. Los `service` no consultan la base y los `router` no importan el repositorio. | Que los `service` usen los modelos y la sesión directamente. | El RNF-MAN-01 exige una capa de acceso a datos separada y una regla de importaciones que impida que las rutas lleguen a ella. Además aísla el código específico de SQLite: si el límite de una escritura simultánea no alcanzara, solo se reescriben los repositorios. | RNF-MAN-01, RNF-REN-04 |
| D-03 | **Organización por módulo, y por capa dentro de cada módulo** (`modules/<modulo>/...`). | Organización por tipo de archivo (todos los routers juntos, todos los services juntos). | El RNF-MAN-09 pide que un módulo no importe las capas internas de otro. Con una carpeta por módulo la regla se puede comprobar en las importaciones. Además cada integrante trabaja en su carpeta, lo que reduce los conflictos de merge. | RNF-MAN-09, RNF-MAN-08 |
| D-04 | **Las reglas de dependencia (3.3) se verifican de forma automática** con una herramienta de contratos de importación (por ejemplo, `import-linter`) en la CI. | Revisarlas a mano en cada PR. | El RNF-MAN-01 pide una prueba o regla de importaciones. La revisión manual falla justo cuando los agentes de IA generan código inconsistente entre módulos. | RNF-MAN-01, RNF-MAN-09, RNF-MAN-08 |
| D-05 | **Entidades compartidas en `shared/models/`** (por ejemplo Producto, Cliente, Comanda), y **repositorio base genérico** en `shared/base_repository.py` para el CRUD común. | Que cada módulo defina su propia copia de la entidad, o que importe los modelos del otro módulo. | El RNF-MAN-09 pide un único lugar para las clases compartidas, que se define en la integración del diagrama (S0-09). El repositorio base evita repetir el mismo CRUD en los 6 módulos, lo que ayuda al límite de duplicación. | RNF-MAN-09, RNF-MAN-10 |
| D-06 | **`models` separados de `schemas`**: la API nunca devuelve un modelo de persistencia. | Usar el mismo modelo para tabla y API (por ejemplo, SQLModel). | Evita exponer campos internos y concentra la validación de entrada en un solo lugar. | RNF-SEG-01, RNF-SEG-09 |
| D-07 | **SQLAlchemy** como ORM y **Alembic** para migraciones versionadas. `Supuesto:` el equipo valida la elección. | SQL a mano con `sqlite3`. | Las consultas parametrizadas son el comportamiento por defecto, y las migraciones permiten reconstruir la base desde cero. Con SQL a mano habría que cuidar cada consulta contra la inyección. | RNF-SEG-05, RNF-MAN-06 |
| D-08 | **Endpoints síncronos** (`def`, no `async def`) y sesión síncrona. `Supuesto:` se valida con la prueba de carga. | Todo asíncrono con un driver async. | SQLite solo admite una escritura a la vez, así que lo asíncrono no mejora las escrituras y agrega complejidad. FastAPI ejecuta los `def` en un pool de hilos, suficiente para la carga esperada. | RNF-REN-01, RNF-REN-02, RNF-REN-04 |
| D-09 | **Configuración de SQLite en `database.py`**: modo WAL, `busy_timeout` de 5 s y `PRAGMA foreign_keys = ON` en cada conexión. | Configuración por defecto de SQLite. | Sin WAL las lecturas bloquean a las escrituras. Sin `busy_timeout` una escritura concurrente falla de inmediato con `database is locked`. Las claves foráneas vienen desactivadas por defecto. | RNF-REN-04, RNF-SEG-06 |
| D-10 | **Transacciones cortas, abiertas y cerradas en el `service`**, sin llamadas externas ni cálculos pesados dentro. `database.py` registra la duración de cada transacción de escritura. | Transacciones abiertas en el router o durante toda la solicitud. | Con una sola escritura simultánea, una transacción larga bloquea a todos los demás usuarios. El registro de duración es la forma de verificar el umbral de 200 ms. | RNF-REN-03 |
| D-11 | **Reportes con agregación en la base** (`GROUP BY`, `SUM`, `COUNT`) e índices en las columnas de filtro. Cada reporte vive en el repositorio y el servicio de su módulo. | Traer los registros y calcular en memoria. | Mueve el trabajo al motor y mantiene el tiempo de los reportes dentro del umbral. | RNF-REN-05 |
| D-12 | **Configuración y secretos por variables de entorno** leídas en `config.py`. `.env` fuera del repositorio y un `.env.example` versionado. | Valores fijos en el código. | Evita subir secretos al repositorio y permite cambiar de ambiente sin tocar el código. | RNF-SEG-04 |
| D-13 | **La autenticación se enchufa sin tocar los `service`**: `shared/seguridad.py` expone una dependencia de FastAPI que cada `router` puede aplicar a los endpoints que modifican datos. Mientras no se implemente, no restringe nada. | Controlar el acceso dentro de cada `service`, o no prever nada. | El RNF-SEG-02 pide que agregar autenticación no obligue a reescribir la lógica de negocio. Con la dependencia en el router, activar el control es un cambio en la capa HTTP. | RNF-SEG-02, RNF-SEG-03 |
| D-14 | **Pruebas en `tests/`**, que replica la estructura de `modules/`, con una base SQLite temporal por prueba. Un script en `scripts/` carga la base de referencia. | Probar contra la base de desarrollo. | Las pruebas no deben alterar datos reales y tienen que poder repetirse. El script de carga es la verificación del RNF-REN-06. | RNF-MAN-04, RNF-REN-06 |

## 4. Frontend

### 4.1 Estructura de carpetas

El frontend sigue el mismo criterio que el backend: **por módulo**, con lo común en `shared/`.

```text
frontend/
├── src/
│   ├── main.tsx             # punto de entrada
│   ├── App.tsx              # rutas principales
│   │
│   ├── modules/
│   │   ├── productos/       # M1
│   │   │   ├── pages/           # una pantalla por ruta
│   │   │   ├── components/      # componentes del módulo
│   │   │   ├── api.ts           # llamadas a la API del módulo
│   │   │   └── types.ts         # tipos de los datos del módulo
│   │   ├── menus/           # M2   (misma estructura)
│   │   ├── salon/           # M3
│   │   ├── atencion/        # M4
│   │   ├── reservas/        # M5
│   │   └── pagos/           # M6
│   │
│   └── shared/
│       ├── api/             # cliente HTTP común, manejo de errores y paginación
│       ├── components/      # componentes reutilizables (tablas, formularios, avisos)
│       ├── hooks/           # hooks comunes
│       └── types/           # tipos compartidos entre módulos
│
├── public/
├── .env                     # no se versiona
├── package.json
├── tsconfig.json            # modo strict
└── vite.config.ts
```

### 4.2 Decisiones del frontend

| ID | Decisión | Alternativa descartada | Justificación | RNF |
| --- | --- | --- | --- | --- |
| D-15 | **Organización por módulo, con `shared/`**, igual que el backend. Un módulo no importa los archivos internos de otro. | Organización por tipo (`pages/`, `components/` para toda la aplicación). | El RNF-MAN-09 vale para todo el sistema. Un criterio único en backend y frontend facilita que cada integrante trabaje de punta a punta en su módulo. | RNF-MAN-09, RNF-MAN-03 |
| D-16 | **Toda llamada a la API pasa por `api.ts` de cada módulo**, apoyado en el cliente de `shared/api`. Los componentes no usan `fetch` directamente. | Llamadas `fetch` dentro de cada componente. | Concentra la URL base, el manejo de errores y los tipos en un solo lugar, y el frontend solo habla con la API. | RNF-SEG-01, RNF-MAN-09 |
| D-17 | **TypeScript en modo `strict`** y tipos de la API en cada módulo. | JavaScript sin tipos. | Detecta en compilación los desajustes con el contrato de la API. | RNF-MAN-03 |
| D-18 | **URL de la API desde variable de entorno** (`VITE_API_URL`). El frontend no guarda secretos. | URL fija en el código. | Todo lo que va al navegador es público. Permite apuntar a desarrollo o producción sin tocar el código. | RNF-SEG-04 |
| D-19 | **React Router con carga diferida por módulo** (`React.lazy`) y estado local con hooks. `Supuesto:` el equipo valida si se agrega una librería de caché de datos (por ejemplo, TanStack Query). | Cargar toda la aplicación de una vez, o un gestor de estado global (Redux) desde el inicio. | La carga diferida mantiene liviana la carga inicial. La aplicación consulta y modifica datos del servidor, sin estado compartido complejo que justifique un gestor global. | RNF-REN-08 |
| D-20 | **Vite** como herramienta de compilación, con revisión del tamaño del bundle. | Create React App. | Vite es el estándar actual para proyectos nuevos y reporta el tamaño de los bundles. Create React App está discontinuado. | RNF-REN-08 |

## 5. API REST

| ID | Decisión | Alternativa descartada | Justificación | RNF |
| --- | --- | --- | --- | --- |
| D-21 | **Estilo REST sobre JSON**, con recursos en plural y en español: `/api/v1/mesas`, `/api/v1/sectores`, `/api/v1/comandas`. | GraphQL o RPC. | REST es lo que pide la consigna y se documenta solo en OpenAPI. GraphQL agregaría una capa sin aportar a los 58 RF. | RNF-MAN-07 |
| D-22 | **Versión en la ruta** (`/api/v1`). | Sin versión. | Deja evolucionar el contrato sin romper al frontend. Cuesta un prefijo. | RNF-MAN-07 |
| D-23 | **Verbos HTTP según la operación**: `GET` para listar y consultar, `POST` para crear, `PUT` o `PATCH` para modificar, `DELETE` para eliminar. | Un único `POST` para todo. | Es el uso estándar y permite que las herramientas y las pruebas entiendan cada operación. | RNF-MAN-07 |
| D-24 | **Acciones de negocio como `POST` sobre un subrecurso verbal**: `POST /comandas/{id}/cerrar`, `/reabrir`, `POST /reservas/{id}/cancelar`. | Modificar el estado con un `PUT` genérico. | El cambio de estado tiene reglas propias (por ejemplo, no cerrar una comanda ya cerrada) y debe ser explícito en la API y en los servicios. | RNF-MAN-01 |
| D-25 | **Códigos de estado**: `200` consulta o modificación, `201` creación, `204` eliminación, `404` recurso inexistente, `409` conflicto con una regla de negocio (por ejemplo, eliminar una mesa con comandas abiertas), `422` datos inválidos. | Devolver `200` siempre con un campo de error. | Permite al frontend y a las pruebas distinguir el resultado sin leer el cuerpo. | RNF-SEG-01, RNF-SEG-06 |
| D-26 | **Formato de error uniforme**: `{"detalle": "mensaje legible"}`, sin trazas, rutas internas ni SQL. Los registros (logs) no incluyen datos personales de clientes ni de pago. | Dejar el formato por defecto de cada excepción. | Un solo formato simplifica el frontend. No filtrar detalles internos es un requisito de seguridad. | RNF-SEG-09 |
| D-27 | **Paginación en todos los listados** con `limit` (por defecto 50, máximo 100) y `offset`, implementada una sola vez en `shared/paginacion.py`. | Devolver la tabla completa. | Mantiene el tiempo de respuesta estable a medida que crece la base. | RNF-REN-07, RNF-REN-01 |
| D-28 | **Los reportes son recursos de solo lectura** bajo `/api/v1/reportes/...`, con los filtros (período, mozo, medio de pago) como parámetros de consulta. | Calcularlos en el frontend. | La agregación se hace en la base (D-11) y el frontend solo muestra el resultado. | RNF-REN-05 |
| D-29 | **CORS** habilitado solo para el origen del frontend, tomado de la configuración. | `*` en todos los ambientes. | Un comodín permite que cualquier sitio use la API desde un navegador. | RNF-SEG-07 |
| D-30 | **Documentación OpenAPI automática** (`/docs`) con modelos de entrada, salida y errores declarados en cada endpoint. | Documentar a mano. | FastAPI la genera a partir de los `schemas`, así que no se desactualiza. | RNF-MAN-07 |

### Recursos por módulo

Es una guía, no un contrato: el detalle de cada endpoint se define en la spec de cada HU (S1-04).

| Módulo | Carpeta | Recursos principales |
| --- | --- | --- |
| M1 Productos y Carta | `productos` | `/platos`, `/postres`, `/bebidas`, `/secciones` |
| M2 Menús y Promociones | `menus` | `/menus-ejecutivos`, `/menus-del-dia`, `/promociones` |
| M3 Salón y Mozos | `salon` | `/mesas`, `/sectores`, `/mozos` |
| M4 Atención al Público | `atencion` | `/clientes`, `/comandas` |
| M5 Reservas | `reservas` | `/reservas` |
| M6 Pagos | `pagos` | `/facturas`, `/medios-de-pago`, `/comprobantes` |

## 6. Cómo se aplican los RNF a la arquitectura

| RNF | Decisiones |
| --- | --- |
| RNF-REN-01, RNF-REN-02 | D-08, D-27 |
| RNF-REN-03 | D-10 |
| RNF-REN-04 | D-02, D-08, D-09 |
| RNF-REN-05 | D-11, D-28 |
| RNF-REN-06 | D-14 |
| RNF-REN-07 | D-27 |
| RNF-REN-08 | D-19, D-20 |
| RNF-SEG-01 | D-06, D-16, D-25 |
| RNF-SEG-02, RNF-SEG-03 | D-13 |
| RNF-SEG-04 | D-12, D-18 |
| RNF-SEG-05 | D-07 |
| RNF-SEG-06 | D-09, D-25 |
| RNF-SEG-07 | D-29 |
| RNF-SEG-09 | D-06, D-26 |
| RNF-MAN-01 | D-01, D-02, D-03, D-04 |
| RNF-MAN-02 | D-31 |
| RNF-MAN-03 | D-15, D-17, D-31 |
| RNF-MAN-04 | D-14 |
| RNF-MAN-06 | D-07 |
| RNF-MAN-07 | D-21, D-22, D-23, D-30 |
| RNF-MAN-08 | D-03, D-04, D-31 |
| RNF-MAN-09 | D-03, D-04, D-05, D-15, D-16 |
| RNF-MAN-10 | D-01, D-05 |

Los RNF que no figuran (RNF-SEG-08, RNF-SEG-10, RNF-SEG-11, RNF-MAN-05) no dependen de la estructura del sistema: se cumplen con el diseño de datos (S0-09), la CI o las guías de estilo (S1-02 y S1-03).

## 7. Evolución prevista

La estructura no busca resolver problemas que todavía no existen. Si el proyecto crece:

- Si SQLite no alcanza para la concurrencia, el motor se cambia reescribiendo solo los repositorios y la configuración de `database.py` (D-02).
- Si se agrega autenticación, se activa la dependencia de `shared/seguridad.py` en los routers (D-13).
- Si un módulo crece mucho, se subdivide dentro de su propia carpeta sin afectar a los demás.

## 8. Supuestos y decisiones abiertas

1. **ORM y migraciones:** SQLAlchemy y Alembic (D-07).
2. **Endpoints síncronos** en lugar de asíncronos (D-08), a validar con la prueba de carga.
3. **Interpretación del RNF-MAN-09:** un módulo puede llamar al `service` de otro, pero no a su `router`, `repository`, `models` ni `schemas`. Las claves foráneas entre tablas de distintos módulos (por ejemplo, una comanda que referencia una mesa) se declaran por nombre de tabla, sin importar el modelo del otro módulo. Hay que confirmar que esta lectura coincide con la del equipo.
4. **Contenido de `shared/models/`:** qué entidades son compartidas lo define la integración del diagrama de clases (S0-09). Hasta entonces la lista es provisoria (Producto, Cliente, Comanda).
5. **Herramienta de contratos de importación:** `import-linter` es una propuesta (D-04).
6. **Gestión de estado en el frontend:** si alcanza con hooks o se agrega una librería de caché (D-19).
7. **Nombres de recursos en español** y la versión `/api/v1` (D-21, D-22).
