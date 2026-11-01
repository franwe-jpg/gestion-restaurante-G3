# Diseño: HU-M4-08 Registrar la entrega de productos de una comanda

- **Issue:** #57 · **Rama:** `feature/HU-M4-08-marcar-entregado` · **Alcance:** decisión de la persona del 01/11/2026 (entrega por cantidad por línea).
- **Precondición de apply:** PR #207 integrado en `develop` y la rama actualizada. Solo se agregan funciones y rutas; no se modifican `cerrar_comanda`, `crear_comanda`, los puertos ni las rutas existentes.

## Enfoque técnico

Columna nueva `cantidad_entregada` en `DetalleComanda`, migración con datos, y dos rutas en las capas de M4 (D-01). La escritura fija un valor absoluto con un único `UPDATE` condicional que actualiza también `estado_entrega`; si no afecta filas, el `service` diagnostica la causa con lecturas. Ambas rutas devuelven `EntregasComanda`, y el modal se redibuja con cada respuesta.

## Decisiones de arquitectura

| # | Tema | Elegida | Descartada | Justificación |
| --- | --- | --- | --- | --- |
| E1 | Rutas | `GET /api/v1/comandas/{comanda_id}/detalles` y `PUT …/detalles/{detalle_id}/entrega` con `{"cantidad_entregada": int}`; 200 con `EntregasComanda` | Un `POST` para entregar y otro para desmarcar | Un solo `PUT` idempotente cubre parcial, «Entregar todo» y desmarcar (D-24). Devolver el estado completo evita otro `GET`. |
| E2 | Valor absoluto vs. incremento | Absoluto, última escritura gana | Incrementos relativos (`+1`/`−1`); control optimista con valor previo esperado | Ver «Concurrencia». |
| E3 | Coherencia de `estado_entrega` | `estado_entrega` se deriva con la función única de E12 en la misma transacción del `UPDATE` (ya no un `CASE` en SQL); la base solo exige el rango (`CHECK 0 ≤ cantidad_entregada ≤ cantidad`) | `CHECK` que también ate el estado a la cantidad | Un `CHECK` de coherencia rompe fixtures de Juan que crean detalles `ENTREGADO` sin cantidad (`conftest.py`, `test_service.py`, `test_alta.py`). El contrato compartido y A02 no cambian. |
| E4 | Escritura (D-09, D-10) | Primera sentencia: `UPDATE detalles_comanda SET cantidad_entregada=:n WHERE id=:d AND comanda_id=:c AND :n <= cantidad AND EXISTS (comanda :c ABIERTA)`; `rowcount == 1` → `commit`, `0` → `rollback` | Leer, validar y asignar con el ORM | Atómico con el escritor único de SQLite, espera el `busy_timeout`, sin `SQLITE_BUSY_SNAPSHOT`. SQLite cuenta las filas coincidentes aunque el valor no cambie: mismo valor → 200 (idempotente). |
| E5 | Diagnóstico (`rowcount == 0`) | Comanda inexistente → 404; detalle ausente en la comanda → 404; comanda no ABIERTA → 409; `n > cantidad` → 422 (`DatosInvalidosError`); sin causa visible → 409 «El detalle cambió; vuelva a consultar las entregas» | Validar antes del `UPDATE` | Las lecturas no compiten por el bloqueo. El 422 depende de la línea y no lo puede validar Pydantic (D-25, D-26). |
| E6 | Entrada | `EntregaDetalle`: `StrictInt` `ge=0`, `extra="forbid"` | `int` laxo | `"2"`, `2.0`, negativos o campos extra → 422. |
| E7 | Salida | `DetalleEntrega(DetallePendiente)` + `cantidad_entregada`, `estado_entrega`; `EntregasComanda {comanda_id, estado, detalles}` | Tocar `shared/contratos/comanda.py` | Contrato S2-01 de otros módulos; `estado` permite deshabilitar el modal. |
| E8 | Paginación | **Supuesto:** sin paginar, orden por `id` | `Pagina[DetalleEntrega]` | Subrecurso acotado por la comanda, como `/pendientes` (D-27 rige para entidades). |
| E9 | Nombres de productos | Diferidos: «Producto #id» / «Menú ejecutivo #id» | Leerlos de M1/M2 | Fuera de alcance; el adaptador de #207 es el punto de integración. |
| E10 | Modales | `AtencionPage` intercambia los modales, nunca anidados | Modal dentro de modal | Un solo `Dialog` evita conflictos de foco; el cierre recarga pendientes al volver. |
| E12 | Regla del estado en un solo lugar (pedido del 01/11/2026) | Una función pura de M4, `estado_segun_entrega(cantidad, cantidad_entregada)` en `atencion/models.py`: `ENTREGADO` si y solo si `cantidad_entregada == cantidad`, `PENDIENTE` en otro caso. La escritura la usa, y HU-M4-05 (Modificar una comanda, Giuliano) puede reutilizarla cuando cambien las cantidades | `CASE` duplicado en SQL y en otro código | Una sola fuente de la regla. Para poder llamarla desde Python, el `UPDATE` condicional fija solo `cantidad_entregada` (toma el bloqueo de escritura y valida comanda ABIERTA, detalle y tope); luego, en la misma transacción, el repository relee el detalle y asigna `estado_entrega` con la función. Se prueba directamente. |
| E11 | Errores en el modal | Todo `PUT` fallido muestra `error` en `role="alert"` y recarga | Distinguir el 409 | `RespuestaApi` no expone el código HTTP y el cliente es compartido; recargar es inocuo ante 404 o 422. |

### Concurrencia

Dos mozos que ven «1 de 3» y tocan «+» envían ambos `2`: el resultado es 2, no 3. El error es seguro (la línea queda pendiente y la comanda no se cierra) y cada respuesta muestra el valor real. Con incrementos, el mismo caso da 3, pero un reintento o doble envío sumaría de más y podría permitir cerrar con un producto sin servir; además «Entregar todo» y desmarcar necesitarían otra semántica. El control optimista queda como evolución.

**Riesgo residual:** `cerrar_comanda` lee los pendientes fuera de transacción y luego escribe. Si un desmarcado se confirma entre esa lectura y su `commit`, la comanda queda CERRADA con una línea pendiente. Antes no existía (solo se marcaba). La ventana es de microsegundos; endurecer el cierre con un `UPDATE` condicional corresponde a Juan en otra HU.

## Flujo de datos

```
EntregasComandaDialog ─ useEntregas ─ api.registrarEntrega ─PUT─→ router.registrar_entrega
service.registrar_entrega(db, c, d, datos)
  1. repository.registrar_entrega(db, c, d, n) → bool   (UPDATE condicional, E4; estado con E12)
  2. True → commit · False → rollback → _rechazar_entrega (404/409/422, E5)
  3. consultar_entregas(db, c) → EntregasComanda   (obtener_comanda, orden por id)
```

## Contratos

```python
# models.py: CheckConstraint("cantidad_entregada >= 0 AND cantidad_entregada <= cantidad",
#            name="ck_detalles_comanda_cantidad_entregada_rango")
cantidad_entregada: Mapped[int] = mapped_column(default=0, server_default="0")
# repository.py
def registrar_entrega(db: Session, comanda_id: int, detalle_id: int, cantidad: int) -> bool: ...
# models.py (E12): regla única, reutilizable por HU-M4-05
def estado_segun_entrega(cantidad: int, cantidad_entregada: int) -> EstadoEntrega: ...
# service.py
def consultar_entregas(db: Session, comanda_id: int) -> EntregasComanda: ...
def registrar_entrega(db: Session, comanda_id: int, detalle_id: int, datos: EntregaDetalle) -> EntregasComanda: ...
```

El default del modelo cubre `repository.crear_comanda` (arma el detalle desde `DetalleComandaSalida`, sin el campo), `conftest.py` y los fakes. Rutas con `Path(gt=0)`.

```ts
export interface DetalleEntrega extends DetallePendiente { cantidad_entregada: number; estado_entrega: 'PENDIENTE' | 'ENTREGADO'; }
export interface EntregasComanda { comanda_id: number; estado: EstadoComanda; detalles: DetalleEntrega[]; }
consultarEntregas(id) · registrarEntrega(id, detalleId, cantidadEntregada)  // api.ts, clienteHttp.get/put
```

## Frontend

| Pieza | Diseño |
| --- | --- |
| `components/useEntregas.ts` | Carga (bandera `vigente`); `registrar(detalleId, valor)` guarda la respuesta; `enviando` bloquea todos los controles; error → mensaje y recarga (E11). |
| `components/EntregasComandaDialog.tsx` | «{entregadas} de {cantidad}», «−» y «+» (deshabilitados en 0 y en `cantidad`), «Entregar todo»; todo deshabilitado si la comanda no está ABIERTA. Sin pendientes: «No falta servir nada». Fila en subcomponente para respetar 50 líneas. |
| `ComandasTabla.tsx`, `ComandasPanel.tsx` | Prop `onEntregas`; botón «Entregas» en cada fila, en cualquier estado. |
| `CierreComandaDialog.tsx` | Prop `onEntregas`; reemplaza el texto «pendiente de integración (HU-M4-08)» por «Gestionar entregas». |
| `pages/AtencionPage.tsx` | Estado `entregas: { id: number; volverACierre: boolean } \| null` (E10). |

## Cambios en archivos

| Archivo | Acción |
| --- | --- |
| `backend/app/modules/atencion/{models,schemas,repository,service,router}.py` | Modificar (agregar) |
| `backend/alembic/versions/<rev>_agrega_cantidad_entregada.py` | Crear |
| `backend/tests/modules/atencion/{test_migracion,test_service,test_repository,test_router}.py`, `conftest.py` (`cantidad_entregada=2` en el detalle ENTREGADO) | Modificar |
| `frontend/src/modules/atencion/{types,api,api.test}.ts` | Modificar |
| `frontend/src/modules/atencion/components/{useEntregas.ts,EntregasComandaDialog.tsx,EntregasComandaDialog.test.tsx}` | Crear |
| `ComandasTabla`, `ComandasPanel`, `CierreComandaDialog`, `AtencionPage` y `AtencionPage.test.tsx` | Modificar |

Sin cambios en `shared/`, otros módulos, `env.py` (el modelo ya está registrado) ni `pyproject.toml`.

## Estrategia de pruebas (Strict TDD)

| Capa | Qué | Cómo |
| --- | --- | --- |
| Migración | Columna, default 0 y `CHECK` de rango; los `CHECK` y claves foráneas previos sobreviven; datos `ENTREGADO` → `cantidad`; downgrade a revisión fija conserva `estado_entrega`; una sola cabeza | `base_temporal` de `test_migracion.py` |
| `service` | Parcial, «Entregar todo», desmarcar, idempotencia; 404 ×2 (el detalle ajeno no cambia); 409 CERRADA/ANULADA; 422 `n > cantidad`; la última unidad no cierra; entregar todo y `cerrar_comanda` funciona | Fixture con líneas de cantidad 3 |
| Concurrencia | Otra sesión cierra antes → 409 sin cambios; dos escrituras → gana la última | `sessionmaker(bind=db.get_bind())` |
| `router` | 200 y forma; 404/409/422 con `{"detalle": …}`; 422 por `"2"`, `-1`, campo extra, id 0 | `cliente` |
| Frontend | URL y método; contador y límites; «Entregar todo»; controles deshabilitados en vuelo y fuera de ABIERTA; mensaje sin pendientes; error recarga; intercambio cierre ↔ entregas | Vitest, Testing Library, `vi.mock('../api')` |

## Matriz de amenazas

N/A: sin enrutamiento de procesos, shell, subprocesos, VCS ni ejecutables. Consultas parametrizadas; el `UPDATE` exige `comanda_id`.

## Migración y despliegue

`batch_alter_table`: agrega la columna (`server_default '0'`) y el `CHECK`, y luego `UPDATE … SET cantidad_entregada = cantidad WHERE estado_entrega = 'ENTREGADO'`. Si la recreación pierde los `CHECK` existentes, usar `copy_from` con la definición completa (la prueba lo detecta). Encadenar a la **única cabeza al momento de apply** (`alembic heads`). Hoy `develop` (`fe08fc9`) tiene cabeza `e7a9c1b3d5f7` (medios de pago, encadenada después de `e7c9a1b3d5f0` por #205), no `e7c9a1b3d5f0`. Reversión: downgrade elimina la columna (se pierden las cantidades parciales; `estado_entrega` se conserva) y revertir el merge.

## Tamaño estimado

| Lado | Código | Pruebas | Total | Punto de control |
| --- | --- | --- | --- | --- |
| Backend | ≈ 170 | ≈ 360 | ≈ 530 | 800: holgado |
| Frontend | ≈ 260 | ≈ 260 | ≈ 520 | 800: holgado |

## Preguntas abiertas

- [ ] E8: confirmar con el equipo que el subrecurso no se pagina.
- [ ] Riesgo residual del cierre: ¿Juan endurece `cerrar_comanda` en otra HU?
- [ ] Tras integrar #207, confirmar que no tocó el frontend de atención ni agregó migraciones.
