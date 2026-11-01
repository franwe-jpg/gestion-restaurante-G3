# Especificación de listado de Comandas (borrador)

## Propósito y fuentes

Consultar Comandas y encontrar pedidos por Mesa o estado. Capacidad nueva, sin especificación principal previa. Los cuatro escenarios CA corresponden, en orden, a [#55](https://github.com/franwe-jpg/gestion-restaurante-G3/issues/55). La paginación responde además a D-27, no a un criterio inventado del issue.

## Contrato backend implementado y límites de integración

**Estado vigente: listado backend y frontend locales implementados; 9/30 tareas completas en el cambio.** Se conservan modelos/migración y S2-01. La pantalla presenta ID de Comanda/Mesa, estado y fecha en la zona del navegador; filtra por `mesa_id`/estado, pagina conservando filtros y distingue `total=0` de una página desplazada vacía. Tiene carga/error/reintento, sin importar otros módulos. Identidad número/sector, ocupación M3, consulta A01 e integraciones externas siguen pendientes.

**Implementado por autorización de listado backend independiente:** `GET /api/v1/comandas` responde `200 Pagina[ComandaResumen]`: `items`, `total`, `limit`, `offset`, reutilizando `shared/paginacion.py` y DTO/enums compartidos sin tipos Pydantic paralelos. Repositorio, servicio, mapeo y router registrado en `main.py` ya existen. El resumen contiene `id`, `mesa_id`, `estado`, `fecha_hora`; filtros `mesa_id` y `estado` sin estado predeterminado; `limit=50` entre 1 y 100, `offset=0` entero no negativo. `total` cuenta antes de paginar; sin coincidencias devuelve `200`, `items: []`, `total: 0`. El backend cubre los escenarios de #55 y D-27, no la pantalla completa.

**Compatibilidad S2-01:** el listado conserva `fecha_hora DESC, id DESC`, conjunción de filtros, `Pagina[ComandaResumen]` y estados en mayúsculas; `api.ts` usa `/comandas` mediante el cliente compartido con prefijo `/api/v1`. Los filtros inválidos devuelven `422 detalle`. La pantalla no traduce ID a número/sector sin integración M3. Fechas UTC recibidas se convierten solo al presentar; no se cambia la persistencia.

**Nota histórica:** antes de la autorización del lote independiente no existía listado productivo y esta sección describía una propuesta HTTP. La evidencia de esa etapa y del listado posterior se conserva en `apply-progress.md`; no cambia los cuatro CA.

**Integración con A01:** el bloqueo de segunda alta debe devolver el ID de la Comanda ABIERTA existente. El resumen compartido tiene `id`, pero el error del fake es solo un mensaje y el listado paginado no garantiza consulta de detalles. Acordar superficies de error y lectura sin declarar existente una ruta individual ni modificar los cuatro CA de #55.

## Requisitos

### Requisito: Mostrar pedidos abiertos (#55 CA01)

El sistema DEBE mostrar las Comandas abiertas incluidas en el resultado con su Mesa y su estado; NO DEBE asumir un filtro ABIERTA implícito solo porque la historia menciona pedidos en curso.

#### Escenario: CA01 — Listado con Comandas abiertas

- **Dado** que hay Comandas ABIERTAS registradas y la página pedida las contiene.
- **Cuando** el mozo solicita el listado sin filtro de estado.
- **Entonces** ve cada Comanda abierta incluida con su Mesa y estado; otras Comandas no se excluyen por defecto.

### Requisito: Buscar por Mesa (#55 CA02)

El sistema DEBE limitar el listado a las Comandas asociadas con la Mesa elegida cuando se aplique ese criterio.

#### Escenario: CA02 — Mesa seleccionada

- **Dado** que existen Comandas de distintas Mesas y una Mesa está identificada sin ambigüedad.
- **Cuando** el mozo busca por esa Mesa.
- **Entonces** solo obtiene Comandas asociadas a esa Mesa.

### Requisito: Filtrar por estado (#55 CA03)

El sistema DEBE devolver solo Comandas del estado elegido al aplicar el filtro.

#### Escenario: CA03 — Estado seleccionado

- **Dado** que existen Comandas ABIERTAS y CERRADAS.
- **Cuando** se aplica el filtro CERRADA.
- **Entonces** todos los elementos devueltos tienen estado CERRADA.

### Requisito: Informar listado vacío (#55 CA04)

Si no hay Comandas, el sistema DEBE informar que el listado está vacío.

#### Escenario: CA04 — Sin Comandas

- **Dado** que no se ha registrado ninguna Comanda.
- **Cuando** el mozo solicita el listado.
- **Entonces** se informa el resultado vacío; la respuesta paginada contiene `items: []` y `total: 0`.

### Requisito: Paginar los resultados (D-27)

El listado DEBE paginar mediante `limit` y `offset` sin perder el total de coincidencias.

#### Escenario: Página más allá del resultado

- **Dado** que hay tres Comandas coincidentes, con `limit=50` y `offset=10`.
- **Cuando** se consulta esa página.
- **Entonces** la respuesta `200` tiene `items: []`, `total: 3`, `limit: 50` y `offset: 10`; no indica que el conjunto total está vacío.

## Decisiones pendientes

- Identidad pública de Mesa (número/sector frente a ID) y coordinación con M3/consumidores. El backend local ya combina filtros por conjunción y conserva el orden S2-01; no hay una decisión de orden pendiente para este lote.
- Los avisos de conjunto vacío y página desplazada ya están implementados y probados; selectores por número/sector esperan M3.
- Acceso de consulta a la Comanda existente tras A01: retorno de su ID persistente en el bloqueo y superficie de lectura de datos completos por acordar; el listado paginado no equivale a un detalle individual.
