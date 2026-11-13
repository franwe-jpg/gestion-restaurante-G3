# Tareas: Registrar el mozo en la comanda (S4-04)

## Pronóstico de carga de revisión

| Campo | Valor |
|---|---|
| Líneas modificadas estimadas | 550–750 líneas entre backend, frontend y pruebas |
| Riesgo del límite de 400 líneas | Alto |
| PRs encadenados recomendados | No; AGENTS.md requiere un PR por HU y se eligió Single PR |
| Entrega | Un solo PR; excepción `size:exception` aprobada por la persona responsable |
| Estrategia de cadena | `size-exception` |

Justificación de la excepción: S4-04 implementa una sola HU que cruza el contrato compartido S2-01, los módulos M3/M4, frontend y pruebas de integración. AGENTS.md, sección 4, establece un único PR por HU y no permite dividir una HU en varios PR; mantener el cambio cohesivo preserva el contrato común y las pruebas de punta a punta.
Excepción aprobada explícitamente por la persona responsable antes de apply.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Unidad de trabajo sugerida

| Unidad | Objetivo | PR previsto | Prueba enfocada | Ejecución/runtime | Reversión |
|---|---|---|---|---|---|
| S4-04 completa | Contrato, service público M3, flujo M4, selector y visualización | Un PR a `develop`, con `size:exception` aprobado antes de apply | `pytest tests/modules/salon/test_mozo_service.py tests/modules/atencion/test_alta.py tests/modules/atencion/test_service.py tests/modules/atencion/test_router.py`; desde `frontend/`, `npm test -- src/modules/atencion/components/ComandaForm.test.tsx src/modules/atencion/components/ComandasTabla.test.tsx src/modules/atencion/components/catalogoComanda.test.ts` | Escenarios HTTP de alta/reasignación y uso del formulario con catálogo de mozos paginado | Revertir los cambios de S4-04; conservar intacta la migración nullable existente y los valores históricos |

## 1. Contrato compartido

- [x] 1.1 **RED** — En `backend/tests/modules/atencion/test_schemas.py`, agregar pruebas que exijan `mozo_id` positivo en la creación, permitan `mozo_id=None` al serializar comandas históricas y expongan el identificador en los resúmenes de listado; ejecutar `pytest tests/modules/atencion/test_schemas.py` y comprobar fallas de comportamiento.
- [x] 1.2 **GREEN** — Extender en sitio `backend/app/shared/contratos/comanda.py` con `mozo_id` en el contrato de alta y campo nullable en salidas/resúmenes; conservar compatibilidad con los campos y consumidores existentes de S2-01. No crear un contrato duplicado ni una migración.

## 2. Backend: validación pública M3 y flujo M4

- [x] 2.1 **RED** — En `backend/tests/modules/salon/test_mozo_service.py`, probar validación de mozo existente habilitado, inexistente y deshabilitado; exigir diferenciación entre `NoEncontradoError` y `ReglaDeNegocioError`.
- [x] 2.2 **GREEN** — En `backend/app/modules/salon/service.py` y `repository.py`, implementar la consulta puntual parametrizada y validación de estado; exponerla únicamente por el service público consumido por el adaptador M4, sin importar repository/model/schema M3 desde M4.
- [x] 2.3 **RED** — En pruebas M3 (`test_mozo_service.py` y `test_mozo_router.py`), demostrar búsqueda por nombre con estado habilitado y paginación estable; comprobar que la lista existente conserva su comportamiento si no se envía filtro.
- [x] 2.4 **GREEN** — Extender mínimamente `backend/app/modules/salon/service.py`, `router.py` y, si la consulta lo requiere, `schemas.py`/`repository.py` con filtro opcional de búsqueda sobre el listado público paginado. Mantener límite y envelope de `shared/paginacion.py`; el selector no debe asumir que la primera página contiene todos los mozos.
- [x] 2.5 **RED** — En `backend/tests/modules/atencion/test_alta.py` y `test_mozo_comanda.py`, probar alta con mozo habilitado, rechazo 422 si falta `mozo_id`, rechazo 404 inexistente, rechazo 409 deshabilitado y ausencia de inserción ante rechazo; verificar que la ruta de reserva no exige mozo al crear la reserva.
- [x] 2.6 **GREEN** — En `backend/app/modules/atencion/adaptadores.py`, `service.py` y `repository.py`, conectar el puerto M4 al service público M3, validar antes de persistir y guardar `mozo_id` al abrir una comanda; preservar transacción y evitar modificar la creación de reservas previa a la apertura.
- [x] 2.7 **RED** — En `backend/tests/modules/atencion/test_mozo_comanda.py` y `test_router.py`, probar asignación y corrección explícita de una comanda histórica, rechazo si la comanda no existe o el mozo no es válido, ninguna mutación en errores y log con ID de comanda y valores anterior/nuevo.
- [x] 2.8 **GREEN** — En `backend/app/modules/atencion/service.py`, `repository.py`, `schemas.py` y `router.py`, agregar la operación `PUT /comandas/{comanda_id}/mozo`; actualizar solo la comanda indicada, validar el mozo mediante M3, registrar old/new en log de aplicación y mantener el commit bajo control del service. No agregar pantalla, autenticación ni atribución del actor.
- [x] 2.9 **RED** — En `backend/tests/modules/atencion/test_schemas.py`, `test_mozo_comanda.py` y `test_router.py`, cubrir salida/listado de comandas con mozo asignado y con `mozo_id=None`, además de creación/reserva existente con los datos históricos intactos.
- [x] 2.10 **GREEN** — Completar proyección de salida/listado en `backend/app/modules/atencion/service.py` y `schemas.py` usando el contrato compartido; asegurar que NULL histórico serializa como ausente y que no hay consulta directa a tablas/repositorios M3 desde M4.

## 3. Frontend: catálogo, selector y listado

- [x] 3.1 **RED** — En `frontend/src/modules/atencion/api.test.ts`, `components/catalogoComanda.test.ts` y `components/useCatalogoComanda.test.tsx`, comprobar consulta paginada/búsqueda de mozos habilitados, agregación de páginas y conservación del catálogo de S4-03; confirmar fallas por comportamiento antes de implementar.
- [x] 3.2 **GREEN** — Extender `frontend/src/modules/atencion/api.ts`, `types.ts`, `components/catalogoComanda.ts` y `components/useCatalogoComanda.ts` para reutilizar el endpoint público M3, enviar filtros/paginación y exponer opciones habilitadas sin imports del módulo frontend M3 ni `fetch` en componentes.
- [x] 3.3 **RED** — En `ComandaForm.test.tsx`, probar un único combobox obligatorio etiquetado «Mozo», búsqueda backend, selección manual que conserva `mozo_id`, rechazo de texto sin seleccionar, solo habilitados, estado vacío/error y bloqueo de envío; reutilizar componentes S4-03/Guía de componentes.
- [x] 3.4 **GREEN** — Modificar `frontend/src/modules/atencion/components/ComandaForm.tsx` para ofrecer el combobox integrado con búsqueda y selección en un solo campo; conservar el ID seleccionado y bloquear el submit durante carga, ante error/vacío o sin selección. Mantener el resto de campos y flujos S4-03.
- [x] 3.5 **RED** — En `ComandasTabla.test.tsx` (y prueba de panel/detalle existente si aplica), probar presentación de `mozo_id` asignado y de histórico sin asignación, resolviendo nombres desde el catálogo público paginado sin una pantalla de corrección histórica.
- [x] 3.6 **GREEN** — Modificar `frontend/src/modules/atencion/components/ComandasTabla.tsx` y el panel/detalle existente solo si lo requiere el listado para mostrar el mozo asignado; representar NULL como no asignado y no ofrecer corrección desde una pantalla nueva.

## 4. Pruebas de integración y contrato

- [x] 4.1 Ejecutar los tests backend enfocados de 2.1–2.10 desde `backend/`, incluyendo prueba real de router para `201`/salida asignada, `404`, `409`, errores `{"detalle": ...}` y rollback/no inserción.
- [x] 4.2 Ejecutar tests frontend enfocados de 3.1–3.6 desde `frontend/` con Vitest; verificar además que el test existente de Comanda de S4-03 sigue pasando sin cambio de comportamiento.
- [x] 4.3 Ejecutar `lint-imports` desde `backend/` para comprobar que M4 solo importa el service público de M3; inspeccionar que no se agregó columna, constraint ni backfill y que los registros históricos continúan con `mozo_id=NULL`.
- [x] 4.4 Revisar consumidores del contrato S2-01 y compatibilidad de tipos de API; el responsable del contrato autorizó su extensión y la evidencia focalizada confirma compatibilidad con M3/M4 y consumidores M2/M6. No se encontró incompatibilidad de nombres que requiera modificar código ajeno.
- [x] 4.5 Confirmar que el cambio no altera operación de reservas antes de abrir comanda y que la corrección histórica queda disponible solo como service/API explícita, con log de valor previo y nuevo, sin autenticación ni identidad del actor.
- [x] 4.6 Revisar nombres y límites de funciones/complexity de backend/frontend conforme a S1-02/S1-03; no ejecutar suites completas durante apply por la restricción de costo. Las suites de CI corresponden a la validación final previa al PR.
