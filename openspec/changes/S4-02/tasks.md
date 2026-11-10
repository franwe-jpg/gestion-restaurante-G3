# Tareas — S4-02 Aplicar las promociones en la comanda y la factura

Strict TDD: cada bloque empieza con la prueba que falla (se ejecuta y se comprueba el rojo) y sigue
con el código que la pasa. Solo backend. Referencias: requisitos de
`specs/promociones-en-comanda/spec.md` y decisiones D1–D9 de `design.md`.

## 1. Cálculo puro de promociones (M2)

- [x] 1.1 Prueba (rojo) en `backend/tests/modules/menus/test_promociones.py`: porcentaje, precio
  fijo y NxM con remanente (3 unidades de «2x1» descuentan 1), descuento acotado a cero y al bruto.
  Requisitos «Descuento según el tipo» y «Descuento acotado»; D9.
- [x] 1.2 Crear `backend/app/modules/menus/promociones.py` con `PromocionAplicable`,
  `calcular_descuento` y `elegir_promocion`. Pasa 1.1.

## 2. Vigencia por fecha, día y horario (M2)

- [x] 2.1 Prueba (rojo): la promoción se aplica dentro de la fecha, el día y la franja; no se aplica
  finalizada, fuera de fecha, en otro día, antes de `hora_desde` ni en `hora_hasta`. Requisitos
  «Aplicar la promoción vigente» y «No aplicar promociones no vigentes»; D4, D5.
- [x] 2.2 `es_vigente` en `promociones.py` con la zona UTC-3 y la franja semiabierta. Pasa 2.1.

## 3. Consulta y servicio de M2

- [x] 3.1 Prueba (rojo) en `backend/tests/modules/menus/test_service_promociones.py`:
  `promocion_para_linea` devuelve la promoción vigente del producto, elige la de mayor descuento,
  resuelve el empate por menor id, devuelve `None` sin promoción y `None` para un menú ejecutivo.
  Requisitos «Varias promociones vigentes», «Menús ejecutivos sin promoción»; D3, D6.
- [x] 3.2 `repository.promociones_del_producto` y `service.promocion_para_linea`. Pasa 3.1.

## 4. Aplicación en la comanda (M4)

- [x] 4.1 Prueba (rojo) en `backend/tests/modules/atencion/test_adaptadores.py`: línea con
  promoción vigente guarda descuento y `promocion_id`; sin promoción, finalizada o de menú ejecutivo
  guarda `0.00` y `None`. Requisitos «Aplicar la promoción vigente» y «No aplicar promociones no
  vigentes»; D2, D8.
- [x] 4.2 `CatalogoDeCarta.cotizar` usa `menus_service.promocion_para_linea`; reloj inyectable con
  `datetime.now(UTC)` por defecto. Pasa 4.1.

## 5. Factura e historial

- [x] 5.1 Prueba (rojo) en `backend/tests/modules/pagos/test_facturas.py`: una comanda creada con una
  promoción real previsualiza el mismo descuento y el subtotal correcto. Requisito «La factura
  conserva el descuento».
- [x] 5.2 Comprobar que no hace falta cambiar `pagos/service.py`; si la prueba falla, corregir solo
  lo necesario. Pasa 5.1.
- [x] 5.3 Prueba (rojo/verde) en `backend/tests/modules/atencion/`: finalizar la promoción no cambia
  el descuento ni el `promocion_id` de una comanda existente. Requisito «Historial inmutable».

## 6. Verificación

- [x] 6.1 Comprobar que cada requisito y escenario tiene al menos una prueba y que las funciones
  nuevas tienen 50 líneas como máximo (RNF-MAN-05).
- [ ] 6.2 Desde `backend/` con el entorno virtual activo:
  `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %).
- [ ] 6.3 Completar `apply-progress.md` y `verify-report.md`; anotar los supuestos S1–S6 y
  `Closes #223` en el PR.

## Presupuesto de revisión (Review Workload Forecast)

| Lado | Pronóstico | Límite |
| --- | --- | --- |
| `backend/` | ~420 líneas (≈ 170 de código y ≈ 250 de pruebas) | 800 |
| `frontend/` | 0 líneas (sin cambios) | 800 |

Es un punto de control, no un bloqueo: un solo PR (`delivery_strategy: single-pr`).
