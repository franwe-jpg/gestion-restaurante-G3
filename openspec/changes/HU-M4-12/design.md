# Diseño: HU-M4-12 Marcar un producto como listo en cocina

- **Issue:** #242 · **Rama:** `feature/HU-M4-12-listo-en-cocina` · **Precedente:** `openspec/changes/HU-M4-08/design.md` (E1 a E12).
- **Regla de base:** no se modifican `registrar_entrega`, `_rechazar_entrega`, `cerrar_comanda`, `EstadoEntrega` ni `shared/contratos/comanda.py`. Solo se agregan funciones, una columna y una ruta (D-01).

## Enfoque técnico

Contador `cantidad_lista` en `DetalleComanda`, independiente de `cantidad_entregada` (S2). La escritura repite E4 y E5 de HU-M4-08: un `UPDATE` condicional fija el valor absoluto; si no afecta filas, el `service` diagnostica la causa con lecturas. La respuesta es `EntregasComanda` ampliado. El estado visible por unidad se deriva en el frontend con una función pura.

## Decisiones de arquitectura

| # | Tema | Elegida | Descartada | Justificación |
| --- | --- | --- | --- | --- |
| L1 | Ruta | `PUT /api/v1/comandas/{comanda_id}/detalles/{detalle_id}/listo`, cuerpo `{"cantidad_lista": int}`, 200 con `EntregasComanda` | `POST …/listo` (D-24) o incrementos | Fija un valor, no cambia el estado de la comanda (D-23). Valor absoluto, idempotente y permite bajar (E1, E2). |
| L2 | Escritura (D-09, D-10) | `UPDATE detalles_comanda SET cantidad_lista=:n WHERE id=:d AND comanda_id=:c AND :n <= cantidad AND cantidad_entregada < cantidad AND EXISTS(comanda :c ABIERTA)`; `rowcount == 1` → `commit` | Leer, validar y asignar con el ORM | Atómico con el escritor único de SQLite. La regla de CA3 (S3) va en el `WHERE`: si otro mozo entrega la última unidad en paralelo, el `UPDATE` no la marca. No hay estado derivado que releer. |
| L3 | Diagnóstico (`rowcount == 0`) | `_rechazar_listo`: 404 comanda → 404 detalle → 409 comanda no ABIERTA → 409 «La línea ya se entregó por completo» → 422 `n > cantidad` → 409 «El detalle cambió; vuelva a consultar las entregas» | Reutilizar `_rechazar_entrega` con parámetros | Mismo orden que E5: el estado del recurso (409) antes que el tope (422). Función nueva para no tocar el código de HU-M4-08; complejidad 7, menos de 20 líneas. |
| L4 | Rango en la base | `CHECK (cantidad_lista >= 0 AND cantidad_lista <= cantidad)`, `ck_detalles_comanda_cantidad_lista_rango` | `CHECK cantidad_lista >= cantidad_entregada` | S4: entregar no exige marcar listo, así que la lista puede quedar por debajo de lo entregado. `modificar_comanda` solo agrega o quita líneas, nunca cambia `cantidad`. |
| L5 | Entrada | `ListoDetalle`: `StrictInt` `ge=0`, `extra="forbid"` | `int` laxo | Igual que `EntregaDetalle` (E6). |
| L6 | Salida | `DetalleEntrega` agrega `cantidad_lista: int` | Campos derivados en el schema; ampliar `DetalleComandaSalida` | S7: solo los schemas de M4. Los contadores alcanzan para derivar; un único consumidor (el diálogo). |
| L7 | Estado por unidad | Función pura del frontend: `entregadas = e`; `listas = max(l − e, 0)`; `pendientes = c − max(l, e)` | Calcularlo en el backend | Evita duplicar la regla en el contrato; se prueba sin red. |
| L8 | Permiso | `COMANDAS_MARCAR_LISTO` para encargado, mozo y chef (tercer supuesto del issue) | Dar `COMANDAS_OPERAR` al chef | S6: `COMANDAS_OPERAR` le daría entregar, cerrar, anular y crear. El encargado lo recibe solo (`frozenset(Permiso)`). |
| L9 | Botones de listo | Operan sobre las unidades listas sin servir: «+» envía `e + listas + 1`, «−» envía `e + listas − 1`, «Todo listo» envía `c`. «+» y «Todo listo» se deshabilitan sin pendientes; «−», sin listas | Operar sobre `cantidad_lista` cruda | Con `l < e` (S4), «+» sobre el valor crudo no cambiaría nada visible. El valor enviado nunca baja de `e`. |
| L10 | Acceso del chef | Botón actual «Ver detalle» de `ComandasTabla` (rama sin `COMANDAS_OPERAR`); `ComandasTabla` no cambia | Botón nuevo «Cocina» | Ya abre el mismo diálogo; menos cambios en código de M4. |

## Flujo de datos

```
EntregasComandaDialog ─ useEntregas.marcarListo ─ api.marcarListo ─PUT─→ router.marcar_listo
service.marcar_listo(db, c, d, datos)
  1. repository.marcar_listo(db, c, d, n) → bool          (UPDATE condicional, L2)
  2. True → commit · False → rollback → _rechazar_listo   (404/409/422, L3)
  3. consultar_entregas(db, c) → EntregasComanda
```

## Contratos

```python
# models.py
cantidad_lista: Mapped[int] = mapped_column(default=0, server_default="0")
# repository.py
def marcar_listo(db: Session, comanda_id: int, detalle_id: int, cantidad: int) -> bool: ...
# service.py
def marcar_listo(db: Session, comanda_id: int, detalle_id: int, datos: ListoDetalle) -> EntregasComanda: ...
# router.py: requiere(Permiso.COMANDAS_MARCAR_LISTO), Path(gt=0) en ambos ids
```

```ts
export interface DetalleEntrega extends DetallePendiente { cantidad_entregada: number; cantidad_lista: number; estado_entrega: 'PENDIENTE' | 'ENTREGADO'; }
export interface ListoDetalle { cantidad_lista: number; }
marcarListo(id, detalleId, cantidadLista)  // api.ts, clienteHttp.put (D-16)
unidadesDeLinea(detalle) → { entregadas, listas, pendientes }  // components/unidadesDeLinea.ts
```

## Frontend

| Pieza | Diseño |
| --- | --- |
| `EntregasComandaDialog.tsx` | `soloLectura` se reemplaza por `puedeEntregar` y `puedeMarcarListo` (obligatorias). Insignia: Entregado (`e == c`), Listo para servir (`listas > 0`), Pendiente. Se conserva «{e} de {c}» y se agrega «Listas para servir: n». `BotonesDeListo` nuevo, con etiquetas «Marcar una unidad lista de X», «Quitar una unidad lista de X», «Marcar todo listo de X» (no coinciden con `/Sumar\|Restar\|Entregar todo/`). Título «Entregas» con `puedeEntregar`, si no «Detalle». |
| `useEntregas.ts` | Agrega `marcarListo`; ambos envíos comparten un ayudante interno `enviar(llamada, mensaje)` (≤ 50 líneas, E11). |
| `AtencionDialogs.tsx` | Prop `soloLectura` → `puedeEntregar` y `puedeMarcarListo`. |
| `AtencionPage.tsx` | `puedeEntregar={opera}`, `puedeMarcarListo={puede('COMANDAS_MARCAR_LISTO')}`. |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/atencion/{models,schemas,repository,service,router}.py` | Modificar (agregar) |
| `backend/alembic/versions/<rev>_agrega_cantidad_lista.py` (`down_revision = "b8d0f2a4c6e8"`) | Crear |
| `backend/app/shared/permisos.py`, `frontend/src/shared/auth/permisos.ts` | Modificar (permiso nuevo en mozo y chef; en el frontend también en la lista explícita del encargado) |
| `backend/tests/modules/atencion/{test_migracion,test_service,test_repository,test_router}.py` | Modificar |
| `backend/tests/shared/test_permisos.py` (`MOZO`, `CHEF`), `test_matriz_permisos.py` (fila `PUT /comandas/1/detalles/1/listo` con `TODOS`; el test del chef pasa a `test_el_chef_marca_listo_pero_no_opera_comandas`: listo 200, entrega y cerrar 403) | Modificar |
| `frontend/src/modules/atencion/{types,api,api.test}.ts`, `components/{unidadesDeLinea.ts,unidadesDeLinea.test.ts}` | Modificar · Crear |
| `EntregasComandaDialog{,.test}.tsx`, `useEntregas.ts`, `AtencionDialogs.tsx`, `AtencionPage.tsx`, `AtencionPage{,.roles}.test.tsx`, `permisos.test.ts` | Modificar |

Sin cambios en `env.py`, `pyproject.toml` ni contratos de importación: todo queda dentro de M4 o en `shared/permisos` (`lint-imports` no cambia).

## Estrategia de pruebas (Strict TDD)

| Capa | Qué | Cómo |
| --- | --- | --- |
| Migración | Una cabeza y `down_revision`; columna no nula con default 0; relleno `ENTREGADO` → `cantidad`, `PENDIENTE` → 0; `CHECK` rechaza −1 y `cantidad + 1`; `CHECK` y FK previos sobreviven; downgrade a `b8d0f2a4c6e8` elimina columna y `CHECK` y conserva `cantidad_entregada` y `estado_entrega` | `base_temporal`; reutilizar `_sembrar_detalles` |
| `service` | Parcial, total, bajar, idempotente (CA1); listo con entrega parcial (S3); línea entregada → 409 sin cambios (CA3); 404 ×2; 409 CERRADA y ANULADA; 422 `n > c`; entregar sin listo y sin alterar `cantidad_lista` (S2); otra sesión entrega todo antes → 409 | Fixture con líneas de cantidad 3; `sessionmaker(bind=db.get_bind())` |
| `router` | 200 y forma con `cantidad_lista`; `{"detalle": …}`; 422 por `"2"`, −1, campo extra, id 0 | `cliente` |
| Permisos | Celdas de la matriz; el chef marca listo y recibe 403 al entregar y cerrar | `cliente_con_rol` |
| Frontend | Función de unidades (tres estados, `l < e`); insignias; botones según permiso; valores enviados; deshabilitados fuera de ABIERTA, en vuelo y sin pendientes; el chef marca listo y no ve botones de entrega | Vitest, Testing Library, `vi.mock('../api')` |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, shell, subprocesos, VCS ni ejecutables. Consulta parametrizada; el `UPDATE` exige `comanda_id`; el permiso se valida antes del cuerpo (403 antes de 422).

## Migración y despliegue

`batch_alter_table` agrega la columna (`server_default '0'`) y el `CHECK`; luego `UPDATE … SET cantidad_lista = cantidad WHERE estado_entrega = 'ENTREGADO'`. Las entregas parciales quedan en 0: por L7 se ven igual que con `cantidad_entregada`. Encadenar a la única cabeza al momento de apply (`alembic heads`); si HU-M4-11 agrega una migración antes, rebasar `down_revision`. Reversión: downgrade elimina columna y `CHECK`; entregas y cierre no cambian.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control 800 |
| --- | --- | --- | --- | --- |
| Backend | ≈ 110 | ≈ 280 | ≈ 390 | holgado |
| Frontend | ≈ 170 | ≈ 230 | ≈ 400 | holgado |

## Preguntas abiertas

- [ ] L3: confirmar en la spec el orden 409 «línea entregada» antes que 422.
- [ ] L10: ¿el equipo prefiere un botón con otro nombre para el chef?
- [ ] S3, S5 y S6 siguen pendientes de validación del equipo (propuesta).
