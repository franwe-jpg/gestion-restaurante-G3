# Diseño: HU-M4-06 — Anular Comanda

## Enfoque técnico

La operación se implementará en el servicio de M4 siguiendo el patrón de `cerrar_comanda`: validar la existencia y estado `ABIERTA`, consultar `pagos.service.esta_facturada(db, comanda_id) -> bool`, cambiar el estado a `ANULADA`, liberar la Mesa mediante el servicio público actual de M3 y confirmar conjuntamente bajo responsabilidad de M4. M6 agrega esta consulta como wrapper del repositorio existente, por autorización del equipo, sin alterar sus demás operaciones. La fila y sus detalles no se borran ni se alteran. En la interfaz de Atención, una acción para la Comanda elegible abre un diálogo de confirmación; solo la confirmación envía la solicitud. Un resultado satisfactorio refresca el listado existente, que conserva su alcance y registros históricos.

El diseño implementa únicamente la capacidad descrita en `specs/comanda-anulacion/spec.md`. La consulta M6 se agrega en esta HU; si la función falta durante runtime, M4 falla cerrado antes de mutar Comanda o Mesa. La carrera se acepta y se difiere al sprint siguiente, sin mitigación ahora. El contrato HTTP M4 se confirma en la especificación; S2-01 define DTO/doble, no rutas.

## Decisiones de arquitectura

### Decisión: M4 es propietario de la transacción

**Elección**: El servicio de M4 ejecuta la transición de estado y llama a la liberación de Mesa en una misma sesión, confirmando solo después de ambas operaciones; ante una excepción durante la modificación o confirmación revierte la transacción.

**Alternativas consideradas**: Hacer que M3 confirme la liberación por separado; confirmar primero la Comanda y luego liberar la Mesa.

**Justificación**: Ambas alternativas pueden dejar una Comanda anulada con Mesa ocupada o Mesa libre con Comanda ABIERTA. `salon.service.liberar_mesa(db, mesa_id)` ya realiza `OCUPADA -> LIBRE` sin commit, y el servicio de M4 usa esa semántica al cerrar una Comanda. Se respeta la propiedad transaccional de M4 y los límites intermodulares existentes.

### Decisión: anulación lógica sin cambios de persistencia

**Elección**: Actualizar únicamente el estado a `ANULADA`; conservar Comanda y detalles existentes, sin migración.

**Alternativas consideradas**: Borrado físico o agregar una marca/tabla de anulación.

**Justificación**: El estado `ANULADA` ya está incluido en el contrato compartido y en el modelo no existe restricción que impida persistirlo; la especificación requiere trazabilidad. Un cambio de esquema no aporta al comportamiento solicitado.

### Decisión: integración M6 solo a través de su servicio público acordado

**Elección**: M4 consume `pagos.service.esta_facturada(db, comanda_id) -> bool`; M6 implementa ese wrapper público sobre su consulta existente por autorización del equipo.

**Alternativas consideradas**: Consultar directamente `pagos.repository`, los modelos de M6 o la tabla de facturas; agregar unilateralmente un adaptador contra detalles internos de M6.

**Justificación**: M4 solo consume el servicio público de M6. `previsualizar_factura` rechaza Comandas `ABIERTA` y `generar_factura` tiene efectos de escritura, por lo que ninguno sirve como consulta. El wrapper M6 reutiliza `repository.existe_factura_de_comanda`; M4 nunca accede directamente al repositorio.

### Decisión: confirmar el contrato HTTP de anulación M4

**Elección**: Confirmar `POST /api/v1/comandas/{comanda_id}/anular`, sin cuerpo, con respuesta `200 ComandaSalida`; errores `404`/`409`/`422` con `detalle`.

**Alternativas consideradas**: Dejar la ruta sin un contrato M4 explícito o modificar el DTO/doble provisional S2-01 para tratarlo como una API HTTP.

**Justificación**: El router real y sus pruebas verifican ruta y salida. Los manejadores compartidos mapean `NoEncontradoError` a `404`, `ReglaDeNegocioError` a `409` y la validación `Path(gt=0)` a `422`, todos con `detalle`. S2-01 define DTOs y doble, no rutas HTTP.

## Flujo de datos

```text
Persona usuaria
  └─ confirma en diálogo M4
      └─ clienteHttp / api.ts M4 (`POST /comandas/{id}/anular`)
          └─ router M4
              └─ service M4
                  ├─ repository M4: obtiene Comanda y valida ABIERTA
                  ├─ service público M6: verifica existencia/condición de factura
                  ├─ marca Comanda ANULADA en la sesión de M4
                  ├─ service público M3: liberar_mesa(db, mesa_id), sin commit
                  └─ commit M4; rollback ante fallo
          └─ respuesta de API acordada → actualizar vista/historial existente
```

La confirmación cancelada no genera solicitud. Si M6 informa que la factura impide anular, M4 no modifica Comanda ni Mesa y propaga una excepción de regla de negocio para el mapeo HTTP acordado. La verificación del estado ABIERTA debe realizarse antes de los cambios; para evitar decisiones basadas en una entidad cacheada, seguir el patrón de relectura con `populate_existing=True` que ya usa el repositorio de M4 cuando corresponda. El usuario acepta que una factura puede generarse entre la consulta y la anulación; la protección de concurrencia se difiere al próximo sprint y no se implementa en esta HU.

## Cambios de archivos

| Archivo | Acción | Descripción |
|---|---|---|
| `backend/app/modules/atencion/service.py` | Modificar | Agregar operación de anulación, elegibilidad `ABIERTA`, integración con el contrato público M6 acordado, transición y transacción con liberación M3. Sin nombre/firma inventados para M6. |
| `backend/app/modules/pagos/service.py` | Modificar | Añadir solo `esta_facturada(db, comanda_id) -> bool` como wrapper de `repository.existe_factura_de_comanda`; preservar los demás comportamientos M6. |
| `backend/tests/modules/pagos/test_service.py` | Modificar | Pruebas Strict TDD de la consulta pública con y sin factura. |
| `backend/app/modules/atencion/repository.py` | Modificar solo si hace falta | Reutilizar `obtener_comanda`; incorporar una lectura/actualización condicional solo si el contrato de concurrencia acordado requiere soporte de persistencia adicional en M4. No escribir hasta concretar ese requisito. |
| `backend/app/modules/atencion/adaptadores.py` | Modificar | Si el contrato M6 requiere un adaptador M4, implementarlo aquí siguiendo el patrón `MesasDeSalon`; no cambiar el contrato M3. |
| `backend/app/modules/atencion/router.py` | Modificar | Exponer el endpoint M4 confirmado y delegar al servicio. |
| `backend/tests/modules/atencion/test_service.py` | Modificar | Pruebas unitarias de reglas, transacción, historia preservada y servicio M6 simulado contra el contrato ya acordado. |
| `backend/tests/modules/atencion/test_adaptadores.py` | Modificar | Si se incorpora adaptador, probar su delegación al servicio público M6 acordado y que no confirme transacción. |
| `backend/tests/modules/atencion/test_router.py` | Modificar | Pruebas HTTP solo cuando la ruta/respuesta se confirmen; mantener los códigos/formas de error acordados. |
| `frontend/src/modules/atencion/api.ts` | Modificar | Llamar al endpoint M4 confirmado mediante `clienteHttp`. |
| `frontend/src/modules/atencion/components/ComandasTabla.tsx` | Modificar | Agregar acción de anular para Comandas `ABIERTA`, siguiendo los controles de estado existentes. No alterar filtros ni el listado de HU-M4-07. |
| `frontend/src/modules/atencion/components/AtencionDialogs.tsx` | Modificar | Integrar el diálogo de confirmación como las demás acciones de Comanda. |
| `frontend/src/modules/atencion/components/AnularComandaDialog.tsx` | Crear | Confirmación explícita, envío tras confirmar, presentación de errores y bloqueo de interacción durante la solicitud. Si el proyecto decide reutilizar un patrón existente sin componente específico, ajustar esta previsión en tareas. |
| `frontend/src/modules/atencion/pages/AtencionPage.tsx` | Modificar | Coordinar apertura/cierre del diálogo y recargar la consulta existente al completar con éxito, sin retirar registros del historial. |
| `frontend/src/modules/atencion/pages/AtencionPage.test.tsx` y/o pruebas de componentes nuevos | Modificar/crear | Verificar confirmación, cancelación, respuesta exitosa, error y actualización de vista. |

La tabla de archivos incluye la única modificación M6 autorizada: el wrapper de consulta y su prueba. No se modifican otras reglas de Facturación, M3, S2-01 ni HU-M4-07.

## Interfaces y contratos

- **Entrada de negocio**: `comanda_id` en la ruta; solicitud sin cuerpo.
- **Operación M4**: responsabilidad del servicio de validar estado y coordinar persistencia. La forma concreta del parámetro de dependencia M6 queda abierta hasta acuerdo.
- **Servicio público M6**: `pagos.service.esta_facturada(db, comanda_id) -> bool`, implementado como wrapper en esta HU; M4 lo consume solo a través del service.
- **M3**: contrato existente `salon.service.liberar_mesa(db, mesa_id) -> None`; no confirma. Usar con la sesión de M4.
- **Salida API**: `200 ComandaSalida`, conforme al router y prueba existentes.
- **Errores**: `404` por `NoEncontradoError`, `409` por `ReglaDeNegocioError`, `422` por identificador no positivo; los manejadores globales devuelven `{"detalle":"mensaje legible"}`.
- **Frontend**: la llamada pasará por `frontend/src/modules/atencion/api.ts` y `clienteHttp`; la UI no usa `fetch` directamente.

## Estrategia de pruebas

Aplicar Strict TDD: escribir primero cada prueba, ejecutar para confirmar RED y luego implementar lo mínimo para GREEN; refactorizar conservando la suite. Mantener pruebas enfocadas en `backend/tests/modules/atencion/` y junto a los componentes frontend.

| Criterio / capa | Verificación prevista |
|---|---|
| Confirmación explícita y cancelación / frontend | El diálogo requiere confirmar para invocar API; cancelar/cerrar no realiza llamada ni altera la fila visible. Pruebas de componente con Vitest y Testing Library. |
| Anulación de ABIERTA no facturada / servicio | Dobles del contrato M6 y M3; verificar consulta, estado `ANULADA`, respuesta acordada y que el registro/detalles mantienen sus datos históricos. |
| Liberación atómica / integración backend | Usar M3 real con sesión compartida; tras commit una segunda sesión ve Comanda `ANULADA` y Mesa `LIBRE`. Inyectar fallo de liberación o commit y comprobar rollback conjunto, estado previo e inexistencia de cambios parciales. |
| Comanda facturada / servicio e integración | El doble M6 indica impedimento: no llamar liberación, no transicionar, preservar datos y exponer motivo de negocio. Cuando exista contrato real, probar el adaptador contra ese servicio público, no contra sus capas internas. |
| Estado distinto de ABIERTA / servicio y router | Parametrizar estados no elegibles (incluido `ANULADA`); rechazar sin liberar ni cambiar. El código HTTP solo se verifica una vez confirmado el mapa. |
| Historial preservado / integración | Consultar la capacidad existente después de anular: la fila continúa presente con estado `ANULADA`; no introducir cambios de listado de HU-M4-07. |
| Contrato HTTP / router | Verificar ruta, `ComandaSalida` y mapeos `404`/`409`/`422` contra router y manejadores compartidos. |
| Errores de solicitud / frontend | Mostrar el motivo devuelto por la API y permitir salir sin falso éxito; tras éxito recargar la vista existente. |

No se planifican pruebas E2E porque la configuración del proyecto declara esa capa no disponible. No se implementan ni prueban mecanismos de concurrencia en esta HU; el riesgo aceptado es que una factura pueda generarse mientras se anula la Comanda.

## Matriz de amenazas

**No aplica**: el cambio añade una ruta de negocio de API y una integración interna entre servicios, pero no introduce shell, subprocess, automatización VCS/PR, clasificación de ejecutables ni integración de procesos. La ruta HTTP por sí misma no activa la matriz especializada indicada por la guía de diseño.

## Migración y despliegue

No se espera migración: `ANULADA` ya forma parte de los estados compartidos, la columna de estado de Comanda ya persiste el valor y el listado existente no excluye estados. No se deben modificar tablas ni borrar filas.

## Preguntas abiertas y dependencias bloqueantes

- [x] **M6 — servicio público utilizable**: el equipo autorizó `pagos.service.esta_facturada(db, comanda_id) -> bool`, implementado en esta HU como wrapper del repositorio existente.
- [x] **Semántica de factura**: el método informa existencia de factura; una factura ADEUDADA o PAGADA cuenta como facturada.
- [x] **Concurrencia — diferida**: riesgo aceptado: puede emitirse una factura entre la comprobación y la anulación. Protección trasladada al próximo sprint; no se implementan locks, timers ni mecanismos equivalentes en HU-M4-06.
- [x] **Contrato HTTP M4**: `POST /api/v1/comandas/{comanda_id}/anular`, `200 ComandaSalida` y errores `404`/`409`/`422` con `detalle`; S2-01 no define rutas y no se modificó.
- [ ] **Límites funcionales**: precisar, si #54/API lo requiere, respuesta a identificador inexistente y repetición de anulación; no decidir aquí el comportamiento más allá de exigir `ABIERTA`.
- [ ] **Respuesta frontend**: ajustar actualización optimista o recarga al schema de salida acordado; el mínimo previsto es recargar la capacidad existente sin tocar el alcance de HU-M4-07.
