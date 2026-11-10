# Aplicación — S4-02 Aplicar las promociones en la comanda y la factura

## Resumen

- `menus/promociones.py` (nuevo): vigencia por estado, fecha, día y franja; cálculo de descuento
  para `PORCENTAJE`, `PRECIO_FIJO` y `NXM`; elección de la mejor promoción.
- `menus/repository.py`: `promociones_del_producto` filtra promociones habilitadas por producto y
  fecha.
- `menus/service.py`: `promocion_para_linea` expone la regla a otros módulos; solo lectura y sin
  commit.
- `atencion/adaptadores.py`: `CatalogoDeCarta.cotizar` completa `descuento` y `promocion_id`; reloj
  inyectable para pruebas.
- Sin cambios en `pagos/service.py`: la factura ya copia el descuento y calcula el subtotal.
- Sin cambios de esquema, migraciones ni rutas HTTP.

## TDD

1. Se escribieron primero las pruebas de `tests/modules/menus/test_promociones.py`; la colección
   falló con `ModuleNotFoundError: app.modules.menus.promociones` (rojo).
2. Se agregaron las pruebas de `menus/service`, `atencion/adaptadores` y `pagos/facturas`.
3. Se implementó el cálculo y la integración.
4. La corrida acotada de los cuatro archivos dio **94 passed** antes del formateo final.

## Verificación ejecutada

| Comando | Resultado |
| --- | --- |
| `pytest tests/modules/menus/test_promociones.py tests/modules/menus/test_service_promociones.py tests/modules/atencion/test_adaptadores.py tests/modules/pagos/test_facturas.py` | 94 passed (cobertura global del subconjunto: 69 %, no representativa) |
| `ruff check .` | Sin errores |
| `ruff format --check .` | 146 archivos formateados |
| `lint-imports` | 10 contratos mantenidos, 0 roto |

## Pendiente

- Correr la suite completa desde `backend/`:
  `ruff check . && ruff format --check . && lint-imports && pytest` (cobertura ≥ 70 %). No se
  ejecutó por indicación de la persona.
- Completar `verify-report.md` con el resultado de esa corrida.
- Abrir el PR con `Closes #223` y los supuestos S1–S6 de la propuesta.
