# S2-01 · Contrato provisional y doble de Comanda

**Resultado:** DTO compartido y doble exclusivamente de pruebas para crear, consultar, listar y cerrar comandas sintéticas. **No es una API HTTP ni una implementación productiva**; el contrato M4–M5–M6 todavía no está congelado ni aceptado por Federico y Héctor.

## Uso local rápido

Desde `backend/`, seleccionar `backend/.venv/bin/python` como intérprete de VS Code y ejecutar `.venv/bin/pytest tests/shared/test_contrato_comanda.py`. La cobertura global del proyecto se exige incluso al ejecutar únicamente ese archivo: verificar el conteo de aserciones separado del resultado del umbral. No buscar el doble en `/docs`: no hay router de Comanda registrado para este fake.

El siguiente comando **se ejecutó localmente** desde `backend/` y produjo `crear/consultar/listar/cerrar: OK; duplicada/pendientes bloqueados: OK`. Se construye una fixture ya ENTREGADO aparte: no existe operación de marcar entregas en S2-01.

```bash
.venv/bin/python -c 'from datetime import datetime, timezone
from decimal import Decimal
from app.shared.contratos.comanda import ComandaCrear, ComandaSalida
from app.shared.excepciones import ReglaDeNegocioError
from tests.shared.fakes.comanda import CatalogoValor, ComandaFake
reloj = lambda: datetime(2026, 10, 29, 12, 30, tzinfo=timezone.utc)
catalogo = {("producto", 12): CatalogoValor(Decimal("10.00"), Decimal("0.50"), 3)}
entregada = ComandaSalida(id=1, mesa_id=8, estado="ABIERTA", fecha_hora=reloj(), detalles=[{"producto_id": 12, "cantidad": 1, "precio_unitario": Decimal("10.00"), "descuento": Decimal("0.50"), "promocion_id": 3, "estado_entrega": "ENTREGADO"}])
fake = ComandaFake({7: "LIBRE", 8: "OCUPADA"}, catalogo, reloj, comandas_iniciales=[entregada])
creada = fake.crear_comanda(ComandaCrear(mesa_id=7, detalles=[{"producto_id": 12, "cantidad": 2}]))
assert (creada.id, fake.consultar_comanda(creada.id).estado, fake.listar_comandas(mesa_id=7).total) == (2, "ABIERTA", 1)
bloqueos = []
for accion in (lambda: fake.crear_comanda(ComandaCrear(mesa_id=7, detalles=[{"producto_id": 12, "cantidad": 1}])), lambda: fake.cerrar_comanda(creada.id)):
    try:
        accion()
    except ReglaDeNegocioError as error:
        bloqueos.append(str(error))
assert len(bloqueos) == 2
cerrada = fake.cerrar_comanda(1)
assert (cerrada.estado, fake.consultar_comanda(2).estado) == ("CERRADA", "ABIERTA")
print("crear/consultar/listar/cerrar: OK; duplicada/pendientes bloqueados: OK")'
```

## Contrato implementado solo para el doble

| Superficie | Comportamiento verificable |
| --- | --- |
| `ComandaCrear`, `DetalleComandaCrear` | `mesa_id` y detalles, referencia XOR producto/menú; cantidad entera estricta positiva; observaciones opcionales. Sin cliente ni precio arbitrario de entrada. |
| `ComandaSalida`, `ComandaResumen` | Identidad, mesa, estado ABIERTA/CERRADA/ANULADA, fecha/hora del reloj del doble; detalle con precio/descuento `Decimal`, promoción y entrega. Serialización JSON con cadenas `.2f`, como Productos, sin fórmula de descuento nueva. |
| `ComandaFake.crear_comanda(datos)` | Captura valores de un catálogo sintético; bloquea otra ABIERTA en la misma mesa sin inserción. Si la mesa estaba LIBRE, pasa a OCUPADA simulada. |
| `ComandaFake.consultar_comanda(id)` | Devuelve una copia profunda de la comanda y sus valores históricos; después de conflicto se puede listar por `mesa_id` y consultar la existente por ID. |
| `ComandaFake.listar_comandas(parametros, mesa_id, estado)` | `Pagina[ComandaResumen]`: `items`, `total`, `limit`, `offset`; 50/0 por defecto, límites 1–100, filtros sin estado implícito, fecha descendente. **Supuesto:** desempate ID descendente, pendiente de validar. |
| `ComandaFake.cerrar_comanda(id)` | Solo ABIERTA con todos los detalles ENTREGADO: pasa a CERRADA y queda consultable por M6, sin factura/pago ni liberar la mesa. Un pendiente bloquea sin entregar ni cerrar. Segundo cierre no ejecuta transición. |
| `ComandaFake.crear_desde_reserva(id, detalles)` | Solo simulación: reserva ACTIVA del día, pedido con producto, mesa heredada; crea ABIERTA vinculada y marca ATENDIDA. No crea marcador vacío al reservar ni toca el módulo Reservas. |

**Errores del doble:** `NoEncontradoError` para identidad inexistente, `ReglaDeNegocioError` para conflictos y `DatosInvalidosError`/validación Pydantic para entrada inválida. Son excepciones internas; no hay respuesta HTTP ni `{"detalle": ...}` observable en este fake. A01 (bloqueo de alta duplicada) y A02 (bloqueo ante pendientes) son **Supuesto: decisiones locales para el doble**, más estrictas que el aviso solicitado originalmente en #52 CA02 y #58 CA03. Ante pendientes: revisar las entregas y, cuando exista la pantalla/operación correspondiente, marcarlas antes de reintentar. El destino de navegación NO está definido y no se implementó.

## Alcance, reinicio y validación pendiente

Construir una instancia nueva por prueba restablece IDs y estado; no hay endpoint de reinicio. Constructor: `mesas` sintéticas, `catalogo` indexado por `("producto" | "menu", id)`, `reloj` inyectado, `reservas` y `comandas_iniciales` opcionales. Las entradas iniciales y las salidas se copian; el catálogo se modifica solamente en pruebas para verificar historia. **Supuesto:** el fake usa la fecha del reloj inyectado como «hoy»; zona, medianoche, origen de mozo, descuentos, representación definitiva y precedencia de errores requieren acuerdo A05–A10.

Las pruebas trazan casos sintéticos a los 20 criterios originales de #52 (8), #55 (4), #58 (4) y #68 (4), **sin declarar su cobertura íntegra**: #55 CA02 se caracteriza con dos mesas de número 4 en sectores distintos, cuyos IDs diferentes se entregan al doble; no se prueba la búsqueda número/sector → ID de M3. **#58 CA02 solo tiene cobertura parcial**, porque CERRADA es consultable para facturación, pero la prohibición de agregar productos se probará en la HU de incorporación futura (P4-F2). No se crea esa operación artificial en el doble. El bloqueo A01/A02 no está reconciliado con M5/M6. No hay integración M1/M2/M3/M5/M6, rollback SQLite, concurrencia real ni API HTTP; R04 no se considera mitigado por este documento o por el fake. Véanse [las decisiones y los escenarios aún abiertos](../openspec/changes/S2-01-contrato-comanda/specs/comanda-contrato/spec.md) y [el progreso observado](../openspec/changes/S2-01-contrato-comanda/apply-progress.md).
