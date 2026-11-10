# Diseño: HU-M5-07 Reporte de reservas y ausentismo por período

- **Entradas:** `exploration.md`, `proposal.md` y `specs/reservas-reporte-ausentismo/spec.md` de este cambio; `openspec/changes/HU-M5-01-02-03/design.md` y `openspec/changes/HU-M5-04-05/design.md` para el estilo y las decisiones previas del módulo.
- **Patrón de referencia:** HU-M1-15 (reporte de productos más vendidos, ya en `develop`). Todo lo que este diseño cita del código se leyó en el estado actual del repositorio; las citas son `ruta:línea`.
- **Numeración:** las decisiones siguen desde la última de `HU-M5-04-05/design.md`, que es la **Decisión 38**. Este diseño usa las **Decisiones 39 a 49**.
- **Idioma:** español neutro (`openspec/config.yaml:10`); los identificadores siguen los estándares del proyecto.

## Mapa del patrón de referencia (HU-M1-15, de punta a punta)

| Capa | Archivo M1 | Qué hace | Equivalente en este cambio |
| --- | --- | --- | --- |
| Consulta agregada | `backend/app/modules/atencion/service.py` (`sumar_productos_pedidos`, invocada en `productos/service.py:569-571`) y `productos/repository.py` (`obtener_productos`, `obtener_secciones_por_ids`, `productos/service.py:573-574`) | M1 agrega en M4 porque las comandas son de otro módulo | `reservas/repository.py:contar_reservas_por_estado` (Decisión 39): las reservas son del propio módulo, sin puente |
| Cálculo puro | `backend/app/modules/productos/reporte.py:24-36` (`validar_periodo`), `:39-46` (`intervalo_utc`), `:83-110` (`armar_secciones`) | Valida el período y arma el DTO sin base | `reservas/reporte.py` (Decisión 40), sin `intervalo_utc` (ver Decisión 39) |
| DTO | `backend/app/modules/productos/schemas.py:269-288` (`LineaReporteProductos`, `SeccionReporte`, `ReporteProductosMasVendidos`) | `fecha_desde`, `fecha_hasta` y los datos | `reservas/schemas.py:ResumenReservas` (Decisión 41) |
| Service | `backend/app/modules/productos/service.py:563-579` (`generar_reporte_mas_vendidos`), `:582-585` (`ArchivoPdf`), `:588-595` (`generar_pdf`) | Valida → consulta → arma; PDF con nombre que incluye el período | `generar_reporte_reservas_ausentismo` y `generar_pdf_reservas_ausentismo` (Decisión 42) |
| Composición del PDF | `backend/app/modules/productos/reporte_pdf.py:14-23` (constantes), `:63-83` (`componer`) | Arma un `DocumentoPdf`; no dibuja | `reservas/reporte_pdf.py:componer` (Decisión 43) |
| Dibujo del PDF | `backend/app/shared/pdf.py:37-53` (`TablaPdf`, `DocumentoPdf`), `:143-157` (`renderizar`) | Único archivo que conoce `fpdf2` | Se usa sin modificarlo |
| Router | `backend/app/modules/productos/router.py:193-197` (JSON) y `:200-209` (PDF) | Solo delega; `fecha_desde`/`fecha_hasta` como `date \| None = None` | Dos rutas en `reservas/router.py` (Decisión 44) |
| Errores 422 | `backend/app/main.py:78-82` (`DatosInvalidosError` → `{"detalle"}`) y `:85-91` (`RequestValidationError` → `"Datos invalidos. fecha_desde: ..."`) | Formato D-26 | Sin cambios |
| Pruebas backend | `backend/tests/modules/productos/test_reporte.py`, `test_reporte_pdf.py`, `test_router_reporte.py` | Puro, composición y HTTP | Mismos tres archivos en `tests/modules/reservas/`, más uno de `repository` |
| Tipos y API frontend | `frontend/src/modules/productos/types.ts:107-137`; `api.ts:136-156` (`consultaPeriodo`, `obtenerReporteMasVendidos`, `descargarReportePdf` con `clienteHttp.obtenerArchivo`) | D-16 | `reservas/types.ts` y `reservas/api.ts` (Decisión 45) |
| Validación local | `frontend/src/modules/productos/validarPeriodo.ts:1-10` | Mismos 4 mensajes que el backend | `reservas/validarPeriodo.ts` (Decisión 46) |
| Hook | `frontend/src/modules/productos/components/useReporteMasVendidos.ts:24-77` | Estado del período, `generar`, `descargarPdf` con `guardarArchivo` | `reservas/pages/useReporteReservasAusentismo.ts` (Decisión 47) |
| Página | `frontend/src/modules/productos/pages/ReporteMasVendidosPage.tsx:10-58` | `Breadcrumbs`, `PageHeader`, `DateRangePicker`, «Generar», alertas, «Descargar PDF» | `reservas/pages/ReporteReservasAusentismoPage.tsx` (Decisión 48) |
| Registro | `frontend/src/shared/components/reportes.ts:8-15` (catálogo) y `frontend/src/App.tsx:27-31` (`lazy`) y `:71` (`<Route>`) | Tarjeta en `/reportes` y ruta | Una entrada y una ruta (Decisión 49) |

## Enfoque técnico

El reporte es una lectura agregada de `Reserva`, toda dentro de `reservas/`, con la misma forma de cuatro capas que HU-M1-15: una consulta `GROUP BY estado` parametrizada en `repository`, un `reporte.py` puro (validación del período, cálculo del porcentaje y armado del DTO), dos funciones del `service` (JSON y PDF) y dos rutas `GET` que solo delegan. El PDF reutiliza `app/shared/pdf.py:renderizar()` sin modificarlo, con un `reporte_pdf.py` propio que solo compone el `DocumentoPdf`. No hay migración, puente, ni importación de otro módulo.

En el frontend, la página, su hook, un `validarPeriodo.ts` local y dos funciones de `api.ts` siguen el patrón de M1, con dos diferencias deliberadas que pide la spec y que M1 no hace: el hook muestra el `detalle` del 422 de la API, y la página muestra «No hay datos para el período seleccionado» sin ningún porcentaje cuando `total_reservas` es 0. El registro en `/reportes` es una entrada del catálogo y una `<Route>`, más un ajuste obligatorio en una prueba compartida (ver «Contradicciones», punto 4).

## Decisiones de arquitectura

### Decisión 39: `contar_reservas_por_estado` en `repository`, una sola consulta `GROUP BY estado`

**Elección:** en `backend/app/modules/reservas/repository.py`, al final del archivo (después de `listar_reservas`, `:54-71`):

```python
from sqlalchemy import func, select  # se agrega `func` al import existente de la línea 5


def contar_reservas_por_estado(
    db: Session, desde: date, hasta: date
) -> dict[EstadoReserva, int]:
    """Cuantas reservas hay en cada estado con `fecha` en [desde, hasta], ambos incluidos (HU-M5-07).

    Una sola consulta agregada, resuelta con el indice `ix_reservas_fecha_hora`. Los estados sin
    reservas en el periodo no aparecen en el resultado: el que lo lee los toma como 0.
    """
    consulta = (
        select(Reserva.estado, func.count(Reserva.id))
        .where(Reserva.fecha.between(desde, hasta))
        .group_by(Reserva.estado)
    )
    return dict(db.execute(consulta).tuples().all())
```

- **Firma:** `(db: Session, desde: date, hasta: date) -> dict[EstadoReserva, int]`. El primer parámetro se llama `db`, como en todas las funciones del módulo (`repository.py:12`, `:22`, `:40`, `:54`), no `sesion` como sugería la propuesta (ver «Contradicciones», punto 5). `desde` y `hasta` ya llegan validados (no `None`): la validación vive en `reporte.py`, igual que en M1 (`productos/service.py:567`).
- **Tipo de retorno:** un `dict` de `EstadoReserva` a cantidad. La columna `estado` es `sa.Enum(EstadoReserva, native_enum=False)` (`models.py:43-45`), así que SQLAlchemy devuelve miembros del `StrEnum`, no textos. Un estado sin reservas en el período **no aparece** en el diccionario; completar con 0 es responsabilidad de `reporte.py` (Decisión 40), que es puro y se prueba sin base.
- **Filtro por `fecha` sola, sin zona:** `Reserva.fecha` ya es la fecha local del restaurante (S2; `models.py:40`), así que no hace falta el `intervalo_utc` semiabierto de M1 (`productos/reporte.py:39-46`), que existe porque M1 filtra instantes UTC de las comandas. `BETWEEN` incluye los dos extremos, que es lo que pide el requisito «Los bordes del período cuentan». La `hora` no participa.
- **Parametrizada:** `between` y `group_by` generan parámetros ligados (D-07, RNF-SEG-05). El índice `ix_reservas_fecha_hora` (`models.py:33`) tiene `fecha` como primera columna, así que resuelve el rango.
- **No confirma ni escribe:** es solo lectura; respeta la regla del encabezado del archivo (`repository.py:1`).

**Alternativas descartadas:**

- *Tres o cuatro `count` separados, uno por estado:* la spec pide una sola consulta agregada (requisito «Calcular el resumen», último párrafo); además serían cuatro idas a la base.
- *Traer las reservas y contarlas en Python* (`listar_reservas` sin paginar): lo prohíbe la spec y escala con la cantidad de reservas.
- *Devolver una lista de filas `(estado, cantidad)` o un `NamedTuple` con los cuatro contadores:* la lista obliga a buscar cada estado en el `reporte`; un `NamedTuple` con los cuatro campos fijos mete en el `repository` la regla de qué estados se informan, que es del `reporte`. El `dict` deja al `repository` como consulta pura.
- *`Reserva.fecha >= desde, Reserva.fecha <= hasta`:* equivalente; `between` se lee más directo y genera el mismo SQL.

### Decisión 40: `reservas/reporte.py`, puro: `validar_periodo`, `calcular_porcentaje_ausentismo` y `armar_resumen`

**Elección:** archivo nuevo `backend/app/modules/reservas/reporte.py`:

```python
"""reservas: calculo puro del reporte de reservas y ausentismo (HU-M5-07), sin base de datos."""

from collections.abc import Mapping
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.modules.reservas.models import EstadoReserva
from app.modules.reservas.schemas import ResumenReservas
from app.shared.excepciones import DatosInvalidosError

_DOS_DECIMALES = Decimal("0.01")


def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Exige ambas fechas y que el periodo no sea inverso; devuelve las fechas validas (S4)."""
    # Mismo cuerpo y mismos cuatro mensajes literales que productos/reporte.py:24-36.


def calcular_porcentaje_ausentismo(canceladas_por_ausencia: int, total: int) -> Decimal | None:
    """`canceladas_por_ausencia / total * 100` con 2 decimales ROUND_HALF_UP; `None` sin reservas (S1, S3)."""
    if total == 0:
        return None
    porcentaje = Decimal(canceladas_por_ausencia) * 100 / Decimal(total)
    return porcentaje.quantize(_DOS_DECIMALES, rounding=ROUND_HALF_UP)


def armar_resumen(
    desde: date, hasta: date, conteos: Mapping[EstadoReserva, int]
) -> ResumenReservas:
    """Completa con 0 los estados ausentes y calcula el porcentaje sobre el total del periodo."""
    total = sum(conteos.values())
    por_ausencia = conteos.get(EstadoReserva.CANCELADA_POR_AUSENCIA, 0)
    return ResumenReservas(
        fecha_desde=desde,
        fecha_hasta=hasta,
        total_reservas=total,
        atendidas=conteos.get(EstadoReserva.ATENDIDA, 0),
        canceladas_anticipada=conteos.get(EstadoReserva.CANCELADA_ANTICIPADA, 0),
        canceladas_por_ausencia=por_ausencia,
        porcentaje_ausentismo=calcular_porcentaje_ausentismo(por_ausencia, total),
    )
```

- **`validar_periodo` se copia, no se importa:** `productos/reporte.py:24-36`, mismo orden y mismos cuatro mensajes. Importarlo de `productos` rompería el contrato «Otros módulos solo usan el service de productos» (`backend/pyproject.toml:104-118`) y moverlo a `shared/` está excluido (proposal, «Excluido»; S4). La unificación queda como seguimiento del equipo (S116 de HU-M1-15).
- **`total` es la suma de todos los estados**, incluidos `ACTIVA` (S2): el denominador del porcentaje es el total del período, nunca solo las canceladas (requisito «Cálculo del porcentaje»). `ACTIVA` no tiene campo propio.
- **La invariante `total_reservas == 0 ⇔ porcentaje_ausentismo is None` se cumple por construcción:** la única rama que devuelve `None` es `total == 0`; con `total > 0` siempre hay un `Decimal`, incluido `0.00` cuando no hay ausencias.
- **Aritmética exacta:** `Decimal(...) * 100 / Decimal(total)` con el contexto por defecto (28 dígitos) y después `quantize(0.01, ROUND_HALF_UP)`. Ejemplos de la spec: 2/10 → `20.00`; 1/3 → `33.33`; 0/5 → `0.00`; 4/4 → `100.00`. Se multiplica antes de dividir para no redondear dos veces.
- **Dependencias:** importa `models` (el enum) y `schemas` (el DTO), como `productos/reporte.py:7-16`. Ningún contrato de `pyproject.toml` lo impide (los contratos de capas aplican a `router`, `service`, `repository` y `models`, `pyproject.toml:155-186`).
- **Tamaño:** tres funciones públicas de menos de 15 líneas y complejidad ≤ 5 (RNF-MAN-05).

**Alternativas descartadas:**

- *Calcular el porcentaje en SQL:* mezcla redondeo con la consulta y SQLite no tiene `DECIMAL` real (guarda `REAL`); el redondeo `ROUND_HALF_UP` exacto se hace en Python.
- *`float` en lugar de `Decimal`:* el diagrama fija `porcentajeAusentismo: Decimal` (proposal, «DTO resultante») y `round()` de `float` no es `ROUND_HALF_UP`.
- *Validar la invariante con un `model_validator` en `ResumenReservas`:* agrega una regla que nunca puede fallar porque el único constructor productivo es `armar_resumen`; la invariante se fija con pruebas (Estrategia de pruebas).

### Decisión 41: `ResumenReservas` en `schemas.py`; el `Decimal` sale como texto con 2 decimales o `null`

**Elección:** en `backend/app/modules/reservas/schemas.py`, al final del archivo:

```python
from decimal import Decimal  # import nuevo


class ResumenReservas(BaseModel):
    """Reporte de reservas y ausentismo de un periodo (HU-M5-07; diagrama, celda `rep-rM5dto`).

    `atendidas` no esta en el diagrama: lo pide el issue, que gana (proposal, Decision `atendidas`).
    """

    fecha_desde: date
    fecha_hasta: date
    total_reservas: int
    atendidas: int
    canceladas_anticipada: int
    canceladas_por_ausencia: int
    porcentaje_ausentismo: Decimal | None

    @field_serializer("porcentaje_ausentismo")
    def _porcentaje_con_dos_decimales(self, porcentaje: Decimal | None) -> str | None:
        return None if porcentaje is None else f"{porcentaje:.2f}"
```

- **Representación JSON:** `"20.00"`, `"33.33"`, `"0.00"`, `"100.00"` (texto con punto decimal y exactamente 2 decimales), o `null` sin reservas. Es la convención de todos los `Decimal` de salida ya integrados en el proyecto:
  - `backend/app/modules/productos/schemas.py:109-111`: `@field_serializer("precio")` → `f"{precio:.2f}"` (es el módulo de HU-M1-15);
  - `backend/app/modules/menus/schemas.py:291-293`: la variante nulable, `None if precio_fijo is None else f"{precio_fijo:.2f}"`, que es exactamente la forma que necesita este campo;
  - `backend/app/modules/pagos/schemas.py:78-79`: `Importe` con `PlainSerializer(lambda valor: f"{valor:.2f}", return_type=str)` y el comentario «Importes como cadenas con 2 decimales, igual que Productos».
  - El frontend ya consume ese formato como `string` (`frontend/src/modules/productos/types.ts:53`, `:58`).
- **Por qué no se puede copiar «el reporte de M1»:** `ReporteProductosMasVendidos` y `LineaReporteProductos` (`productos/schemas.py:269-288`) **no tienen ningún `Decimal`**: solo `int`, `str`, enums y fechas. S3 pide seguir «el resto de los reportes ya integrados», y el único integrado no serializa decimales; se sigue entonces la convención de `Decimal` del proyecto, que incluye al propio módulo de M1 (ver «Contradicciones», punto 1).
- **`field_serializer` y no `PlainSerializer` en un alias:** es la forma del módulo de referencia (M1) y de M2, y del propio `reservas/schemas.py:73-75` (`_serializar_hora`); un solo campo no justifica un alias de tipo.
- **Nombres:** `ResumenReservas` (diagrama, corregido en la propuesta); campos en `snake_case` según la tabla de la spec. Sin `model_config`: se construye con argumentos, no desde un `model` (`from_attributes` no hace falta).

**Alternativas descartadas:**

- *Número JSON (`20.0` o `33.33`):* Pydantic v2 serializa `Decimal` como texto por defecto en modo JSON, y hacerlo número pierde los ceros finales (`20.0`) y se aparta del resto del proyecto.
- *Texto con coma o con `%` (`"33,33 %"`):* el formato de presentación es de la pantalla y del PDF (Decisiones 43 y 48); la API devuelve el dato.

### Decisión 42: dos funciones del `service`, `generar_reporte_reservas_ausentismo` y `generar_pdf_reservas_ausentismo`, con un `ArchivoPdf` propio

**Elección:** en `backend/app/modules/reservas/service.py`, al final del archivo:

```python
from dataclasses import dataclass                          # import nuevo
from app.modules.reservas import puente, reporte, reporte_pdf, repository  # se suman dos
from app.modules.reservas.schemas import (..., ResumenReservas)            # se suma uno
from app.shared.pdf import renderizar                      # import nuevo


def generar_reporte_reservas_ausentismo(
    db: Session, fecha_desde: date | None, fecha_hasta: date | None
) -> ResumenReservas:
    """`generar()` del servicio `ReporteReservasAusentismo` del diagrama (HU-M5-07). Solo lectura."""
    desde, hasta = reporte.validar_periodo(fecha_desde, fecha_hasta)
    conteos = repository.contar_reservas_por_estado(db, desde, hasta)
    return reporte.armar_resumen(desde, hasta, conteos)


@dataclass(frozen=True)
class ArchivoPdf:
    contenido: bytes
    nombre: str


def generar_pdf_reservas_ausentismo(
    db: Session, fecha_desde: date | None, fecha_hasta: date | None
) -> ArchivoPdf:
    """PDF con los mismos datos y validaciones que el JSON; un periodo sin reservas tambien se genera."""
    resumen = generar_reporte_reservas_ausentismo(db, fecha_desde, fecha_hasta)
    documento = reporte_pdf.componer(resumen, ahora())
    periodo = f"{resumen.fecha_desde.isoformat()}_{resumen.fecha_hasta.isoformat()}"
    return ArchivoPdf(
        contenido=renderizar(documento), nombre=f"reservas-ausentismo_{periodo}.pdf"
    )
```

- **Nombres:** el diagrama modela un servicio `ReporteReservasAusentismo` con `generar(): ResumenReservas`. Como en M1 (`generar_reporte_mas_vendidos`, `productos/service.py:563`), el servicio del diagrama se implementa como función del módulo y su nombre lleva el del reporte: `generar_reporte_reservas_ausentismo`. La variante PDF es `generar_pdf_reservas_ausentismo` y no `generar_pdf` como en M1 (`productos/service.py:588`): `reservas/service.py` ya tiene 15 funciones públicas y privadas de otras HU, y el nombre explícito dice qué reporte genera sin leer el cuerpo.
- **Orden validar → consultar → armar**, igual que `productos/service.py:567-579`. Con un período inválido `validar_periodo` lanza `DatosInvalidosError` **antes** de llamar al `repository`: no se ejecuta ninguna consulta de conteo (requisito «Validación del período»).
- **El PDF reutiliza la función JSON** (`productos/service.py:590`): mismas validaciones, mismos datos y mismo 422 JSON (no un PDF de error), que es lo que pide el escenario «La ruta `/pdf` valida el período igual que la ruta JSON».
- **Fecha de generación con `ahora()`** (`reservas/service.py:26-32`), no con `datetime.now(...)` como M1 (`productos/service.py:591`). Da el mismo valor (hora local UTC−3 sin zona, S28) y la fixture autouse `reloj` (`tests/modules/reservas/conftest.py:128-130`) ya la fija en `AHORA`, así que las pruebas del `service` pueden afirmar la fecha de generación sin parches nuevos.
- **Nombre del archivo:** `reservas-ausentismo_<desde>_<hasta>.pdf`, con fechas ISO, misma forma que `productos-mas-vendidos_<desde>_<hasta>.pdf` (`productos/service.py:593-594`). Incluye el período, como pide la spec.
- **`ArchivoPdf` propio:** el `dataclass` de M1 vive en `productos/service.py:582-585`. Importarlo crearía una dependencia `reservas → productos` sin motivo de negocio (la spec pide que `reservas` no agregue importaciones de otro módulo, requisito «Aislamiento», escenario «Contratos de importación»), y moverlo a `shared/` está excluido. Son 4 líneas; la unificación entra en el mismo seguimiento que `validar_periodo`.
- **Sin `commit` ni `flush`:** solo lectura (requisito «El reporte no modifica ninguna reserva»).
- **Contratos:** `service` no importa FastAPI (`pyproject.toml:162-167`); `app.shared.pdf` es `shared`, permitido.

**Alternativas descartadas:**

- *Una clase `ReporteReservasAusentismo` con `fecha_desde`, `fecha_hasta` y `generar()`, literal del diagrama:* ningún `service` del proyecto usa clases de servicio; M1 tradujo el mismo tipo de clase del diagrama a funciones del módulo.
- *Devolver `bytes` y armar el nombre en el `router`:* el nombre es regla del reporte (incluye el período validado); en M1 lo decide el `service` y el `router` solo lo pone en el encabezado.

### Decisión 43: `reservas/reporte_pdf.py` compone un `DocumentoPdf` con una tabla de cinco datos

**Elección:** archivo nuevo `backend/app/modules/reservas/reporte_pdf.py`, con la forma de `productos/reporte_pdf.py`:

```python
"""reservas: composicion del PDF del reporte de reservas y ausentismo (HU-M5-07). No dibuja nada."""

from datetime import datetime
from decimal import Decimal

from app.modules.reservas.schemas import ResumenReservas
from app.shared.pdf import DocumentoPdf, TablaPdf

TITULO = "Reservas y ausentismo por período"
SIN_DATOS = "No hay datos para el período seleccionado."
_TITULO_TABLA = "Resumen del período"
_COLUMNAS = ["Dato", "Cantidad"]
_ANCHOS = (3, 1)
_EXPLICACION = (
    "El porcentaje de ausentismo es la cantidad de reservas canceladas por ausencia dividida por "
    "el total de reservas del período, por 100, redondeado a 2 decimales. El total incluye las "
    "reservas en cualquier estado, también las activas. Una reserva pertenece al período según "
    "su fecha, con las dos fechas del período incluidas."
)


def formatear_porcentaje(porcentaje: Decimal) -> str:
    """`Decimal("33.33")` → `"33,33 %"`: coma decimal, como la pantalla (Decision 48)."""
    return f"{porcentaje:.2f}".replace(".", ",") + " %"


def _filas(resumen: ResumenReservas, porcentaje: Decimal) -> list[list[str]]:
    return [
        ["Total de reservas", str(resumen.total_reservas)],
        ["Atendidas", str(resumen.atendidas)],
        ["Canceladas anticipadamente", str(resumen.canceladas_anticipada)],
        ["Canceladas por ausencia", str(resumen.canceladas_por_ausencia)],
        ["Porcentaje de ausentismo", formatear_porcentaje(porcentaje)],
    ]


def componer(resumen: ResumenReservas, generado: datetime) -> DocumentoPdf:
    """Arma el documento con los mismos datos que el JSON; `generado` va en hora local."""
    porcentaje = resumen.porcentaje_ausentismo
    tablas = (
        []
        if porcentaje is None
        else [
            TablaPdf(
                titulo=_TITULO_TABLA,
                columnas=list(_COLUMNAS),
                filas=_filas(resumen, porcentaje),
                anchos=list(_ANCHOS),
                alinear_derecha=frozenset({1}),
            )
        ]
    )
    parrafos = [_EXPLICACION] if tablas else [_EXPLICACION, SIN_DATOS]
    return DocumentoPdf(
        titulo=TITULO,
        periodo=f"Período: {resumen.fecha_desde:%d/%m/%Y} al {resumen.fecha_hasta:%d/%m/%Y}",
        generado=generado,
        parrafos=parrafos,
        tablas=tablas,
    )
```

Qué compone, elemento por elemento (S6):

| Elemento | Valor | Equivalente M1 |
| --- | --- | --- |
| Título | `TITULO` = «Reservas y ausentismo por período» | `productos/reporte_pdf.py:14` |
| Período (dd/mm/aaaa) | `"Período: 01/10/2026 al 31/10/2026"` | `productos/reporte_pdf.py:78` (mismo formato literal) |
| Fecha de generación | `generado` (`ahora()` del `service`); `shared/pdf.py:87` la dibuja como «Generado el dd/mm/aaaa HH:MM» | `productos/reporte_pdf.py:79` |
| Los cinco datos | Una `TablaPdf` «Resumen del período», dos columnas, cinco filas, cantidades alineadas a la derecha | `productos/reporte_pdf.py:65-74` (una tabla por sección) |
| Línea del cálculo | `_EXPLICACION`, primer párrafo | `productos/reporte_pdf.py:18-23`, `:75` |
| Sin datos | Sin tabla; párrafos `[_EXPLICACION, SIN_DATOS]` | `productos/reporte_pdf.py:75` (misma regla) |
| Recuadro `resumen` | No se usa (lista vacía; `shared/pdf.py:151-152` lo omite) | M1 lo usa con 3 datos (`:51-60`) |
| Página | A4 vertical, la fija `renderizar` (`shared/pdf.py:145`) | igual |

- **Tabla y no el recuadro `resumen`:** el recuadro de `shared/pdf.py:96-114` reparte el ancho útil (~170 mm) en partes iguales y escribe cada etiqueta con `cell` sin salto de línea; con cinco datos quedan ~28 mm por etiqueta y «Canceladas anticipadamente» no entra en 8 pt. La tabla usa `pdf.table` (`shared/pdf.py:126-140`), que ajusta el texto, y no requiere tocar `shared/`.
- **Sin datos:** la condición es `porcentaje_ausentismo is None`, que por la Decisión 40 equivale a `total_reservas == 0`. Sin tabla no aparece ningún número ni porcentaje: el documento muestra título, período, fecha de generación, la explicación y «No hay datos para el período seleccionado.» (requisito «Exportación a PDF», S5). El texto coincide con el de la pantalla (Decisión 48); M1 dice «período elegido» (`productos/reporte_pdf.py:15`), pero la spec de este cambio fija «seleccionado».
- **`formatear_porcentaje` es pública** para que la prueba la cubra directamente; la coma decimal y el sufijo ` %` siguen el formato `es-AR` del frontend (`frontend/src/shared/lib/format.ts:26-28`). El texto pasa por `normalizar_texto` (latin-1) al dibujar; «í», «ó» y «%» son representables.
- **Tamaño:** `componer` tiene unas 20 líneas, complejidad 2.

**Alternativas descartadas:**

- *Recuadro `resumen` con cinco datos:* ver arriba; requeriría cambiar `shared/pdf.py`, excluido.
- *Recuadro con dos datos (total y porcentaje) más la tabla:* duplica información y agrega una rama más sin pedido de la spec.
- *Mostrar los cinco datos en cero sin datos:* lo prohíbe la spec («en lugar de mostrar los cinco datos en cero»).

### Decisión 44: dos rutas `GET` en `reservas/router.py`, copia de las de M1

**Elección:** en `backend/app/modules/reservas/router.py`, al final del archivo (después de `cancelar_por_ausencia`, `:60-62`):

```python
from datetime import date                       # import nuevo
from fastapi import APIRouter, Depends, Query, Response, status   # se suma `Response`
from app.modules.reservas.schemas import (..., ResumenReservas)   # se suma uno


@router.get("/reportes/reservas-ausentismo")
def reporte_reservas_ausentismo(
    db: Sesion, fecha_desde: date | None = None, fecha_hasta: date | None = None
) -> ResumenReservas:
    return service.generar_reporte_reservas_ausentismo(db, fecha_desde, fecha_hasta)


@router.get("/reportes/reservas-ausentismo/pdf")
def reporte_reservas_ausentismo_pdf(
    db: Sesion, fecha_desde: date | None = None, fecha_hasta: date | None = None
) -> Response:
    archivo = service.generar_pdf_reservas_ausentismo(db, fecha_desde, fecha_hasta)
    return Response(
        content=archivo.contenido,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{archivo.nombre}"'},
    )
```

- **Parámetros opcionales con `None` por defecto** (`productos/router.py:195`, `:202`): así la falta de una o de las dos fechas llega al `service` y responde los mensajes literales de `validar_periodo` (422 vía `main.py:78-82`). Si fueran obligatorios, FastAPI respondería «Datos invalidos. fecha_desde: Field required» y no los mensajes de la spec.
- **Formato inválido** (`15/10/2026`): lo rechaza FastAPI al convertir a `date`; `main.py:85-91` responde 422 `{"detalle": "Datos invalidos. fecha_desde: ..."}`, que nombra el campo, sin llegar al `service` ni a la base. Mismo comportamiento que prueba M1 en `test_router_reporte.py:130-136`.
- **Sin conflicto de rutas:** el prefijo `/reportes/` no choca con `/reservas/{reserva_id}` (`router.py:45`); el router se monta en `/api/v1` (`main.py:36`). La ruta `/pdf` se declara después de la JSON, como en M1; no hay parámetro de ruta que la capture.
- **Solo delega** (D-02); no importa `repository` ni `models` (`pyproject.toml:155-160`).

**Alternativa descartada:** *un único `GET` con `?formato=pdf`:* se aparta del contrato de la spec (dos rutas) y del patrón de M1.

### Decisión 45: tipos y dos funciones nuevas en `reservas/api.ts`

**Elección:**

`frontend/src/modules/reservas/types.ts`, al final:

```ts
/** Reporte de reservas y ausentismo (HU-M5-07). Nombres de campo del backend. */
export interface ResumenReservas {
  fecha_desde: string; // YYYY-MM-DD
  fecha_hasta: string; // YYYY-MM-DD
  total_reservas: number;
  atendidas: number;
  canceladas_anticipada: number;
  canceladas_por_ausencia: number;
  /** Texto decimal con punto y 2 decimales ("33.33"); `null` cuando `total_reservas` es 0. */
  porcentaje_ausentismo: string | null;
}
```

`frontend/src/modules/reservas/api.ts`, al final (se suma `ResumenReservas` al `import type` de las líneas 3-10):

```ts
function consultaPeriodo(fechaDesde: string, fechaHasta: string): string {
  return new URLSearchParams({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta }).toString();
}

/** HU-M5-07: `GET /reportes/reservas-ausentismo`. Un 422 llega en `error` con el `detalle`. */
export function obtenerReporteReservasAusentismo(
  fechaDesde: string,
  fechaHasta: string,
): Promise<RespuestaApi<ResumenReservas>> {
  return clienteHttp.get<ResumenReservas>(
    `/reportes/reservas-ausentismo?${consultaPeriodo(fechaDesde, fechaHasta)}`,
  );
}

/** HU-M5-07: el mismo reporte en PDF, como `Blob` para `guardarArchivo`. */
export function descargarReporteReservasAusentismoPdf(
  fechaDesde: string,
  fechaHasta: string,
): Promise<RespuestaApi<Blob>> {
  return clienteHttp.obtenerArchivo(
    `/reportes/reservas-ausentismo/pdf?${consultaPeriodo(fechaDesde, fechaHasta)}`,
  );
}
```

- **Mismas firmas que M1** (`productos/api.ts:140-156`): dos `string` `YYYY-MM-DD`, `RespuestaApi<T>` y `RespuestaApi<Blob>` con `clienteHttp.obtenerArchivo`.
- **Manejo del 422:** no hace falta código propio. `ClienteApi.solicitar` y `obtenerArchivo` ya devuelven `{ exito: false, error: detalle }` cuando la respuesta trae `{"detalle"}` (`frontend/src/shared/api/client.ts:30-35`, `:41-43`, `:66-68`). El hook decide mostrarlo (Decisión 47).
- **`URLSearchParams` y no la plantilla con `encodeURIComponent` de M1** (`productos/api.ts:136-138`): es la forma que ya usa `reservas/api.ts` (`:19-23`, `:31`, `:68`); el resultado es el mismo para fechas ISO.
- **`porcentaje_ausentismo: string | null`**, porque la API lo envía como texto (Decisión 41), igual que `precio: string` en `productos/types.ts:53`. Sin `any` (AGENTS.md §5).

### Decisión 46: `reservas/validarPeriodo.ts` local, copia de M1

**Elección:** archivo nuevo `frontend/src/modules/reservas/validarPeriodo.ts`, mismo contenido que `frontend/src/modules/productos/validarPeriodo.ts:1-10` (firma `validarPeriodo(desde: string, hasta: string): string | null` y los cuatro mensajes literales, en el mismo orden que el backend). Las fechas `YYYY-MM-DD` se comparan como texto, que equivale a compararlas como fechas.

- **Ubicación en la raíz del módulo** (`reservas/validarPeriodo.ts`), igual que M1 (`productos/validarPeriodo.ts`) y que el `fechas.ts` del propio módulo (`reservas/fechas.ts`); la propuesta lo ubicaba en `pages/` (ver «Contradicciones», punto 6).
- **No se importa de `productos`:** un módulo del frontend no importa archivos de otro (AGENTS.md §9.4). Moverlo a `shared/` excede el alcance; queda en el seguimiento de S116.

### Decisión 47: hook `useReporteReservasAusentismo`, con la forma de M1 y el `detalle` del 422

**Elección:** archivo nuevo `frontend/src/modules/reservas/pages/useReporteReservasAusentismo.ts`:

```ts
import { useState } from 'react';

import { guardarArchivo } from '../../../shared/lib/guardarArchivo';
import { descargarReporteReservasAusentismoPdf, obtenerReporteReservasAusentismo } from '../api';
import type { ResumenReservas } from '../types';
import { validarPeriodo } from '../validarPeriodo';

export const ERROR_CARGA = 'No se pudo cargar el reporte.';
export const ERROR_DESCARGA = 'No se pudo descargar el PDF.';

export function useReporteReservasAusentismo() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [resultado, setResultado] = useState<ResumenReservas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const generar = async () => {
    setResultado(null);
    setErrorDescarga(null);
    const invalido = validarPeriodo(desde, hasta);
    setError(invalido);
    if (invalido) return;

    setCargando(true);
    const respuesta = await obtenerReporteReservasAusentismo(desde, hasta);
    setCargando(false);
    if (respuesta.exito && respuesta.datos) {
      setResultado(respuesta.datos);
    } else {
      setError(respuesta.error ?? ERROR_CARGA);
    }
  };

  const descargarPdf = async () => {
    if (!resultado) return;
    const { fecha_desde: d, fecha_hasta: h } = resultado;
    setErrorDescarga(null);
    setDescargando(true);
    const respuesta = await descargarReporteReservasAusentismoPdf(d, h);
    setDescargando(false);
    if (respuesta.exito && respuesta.datos) {
      guardarArchivo(respuesta.datos, `reservas-ausentismo_${d}_${h}.pdf`);
    } else {
      setErrorDescarga(respuesta.error ?? ERROR_DESCARGA);
    }
  };

  return {
    desde, hasta, setDesde, setHasta, resultado,
    error, errorDescarga, cargando, descargando, generar, descargarPdf,
  };
}
```

- **Firma pública:** `useReporteReservasAusentismo(): { desde: string; hasta: string; setDesde(v: string): void; setHasta(v: string): void; resultado: ResumenReservas | null; error: string | null; errorDescarga: string | null; cargando: boolean; descargando: boolean; generar(): Promise<void>; descargarPdf(): Promise<void> }`, el mismo conjunto de claves que `useReporteMasVendidos` (`productos/components/useReporteMasVendidos.ts:64-76`); el tipo se infiere, como en M1.
- **Validación local primero:** si `validarPeriodo` devuelve un mensaje, se muestra y **no se llama a la API** (`useReporteMasVendidos.ts:36-38`), como pide el escenario «Validación local sin llamar a la API».
- **Diferencia con M1, pedida por la spec:** M1 reemplaza cualquier error por «No se pudo cargar el reporte.» (`useReporteMasVendidos.ts:46`) y pierde el `detalle` del 422. La spec exige mostrar ese `detalle` (escenario «Un 422 de la API se muestra igual que el de la validación local»), así que este hook usa `respuesta.error ?? ERROR_CARGA`. El cliente ya trae en `error` el `detalle` o un texto de conexión (`client.ts:30-35`, `:57`); el respaldo cubre un `error` ausente. La descarga usa la misma regla, por coherencia (ver «Contradicciones», punto 3).
- **Sin transformación del resultado:** M1 necesita `aResultado` para elegir los 5 más vendidos (`useReporteMasVendidos.ts:17-22`); acá el DTO se muestra tal como llega.
- **La descarga usa el período del resultado,** no el de los campos: si la persona cambia las fechas después de generar, el PDF corresponde a lo que está en pantalla (`useReporteMasVendidos.ts:51-52`). El nombre del archivo coincide con el del `Content-Disposition` del backend.
- **Ubicación en `pages/`**, junto a la página, como `reservas/pages/useListadoReservas.ts`; M1 lo ubica en `components/`, pero la propuesta y el precedente del propio módulo indican `pages/`.

**Alternativa descartada:** *un `useReducer` o un estado único `{ estado: 'cargando' | ... }`:* más claro en abstracto, pero se aparta del patrón de M1 que el equipo ya revisó y no resuelve ningún problema del caso.

### Decisión 48: página `ReporteReservasAusentismoPage`, con «sin datos» y cinco tarjetas

**Elección:** archivo nuevo `frontend/src/modules/reservas/pages/ReporteReservasAusentismoPage.tsx`, con la estructura de `ReporteMasVendidosPage.tsx:10-58` y componentes ya existentes en `frontend/src/shared/components/` (AGENTS.md §5, buscar antes de crear):

- `Breadcrumbs` con `[{ etiqueta: 'Reportes', ruta: '/reportes' }, { etiqueta: 'Reservas y ausentismo' }]`.
- `PageHeader` con `titulo="Reservas y ausentismo"` y `descripcion="Cuántas reservas hubo en un período, cómo terminaron y qué porcentaje de clientes no se presentó."`.
- `DateRangePicker` (`ui/date-range-picker.tsx:7-14`) con `etiquetaDesde="Fecha desde"` y `etiquetaHasta="Fecha hasta"`, y el botón «Generar» / «Generando…», idénticos a M1 (`:26-38`).
- `Alert variant="warning"` con `error` y `Alert variant="danger"` con `errorDescarga` (`:39-40`).
- Con `resultado`:
  - Una línea con el período: `` `Del ${formatearFechaReserva(fecha_desde)} al ${formatearFechaReserva(fecha_hasta)}` ``, usando `formatearFechaReserva` del propio módulo (`reservas/fechas.ts:33-35`), que da `dd/mm/aaaa` sin pasar por `Date`.
  - Si `resultado.total_reservas === 0`: `EmptyState` (`shared/components/EmptyState.tsx:13-35`) con un ícono de `lucide-react` (`CalendarX`), `titulo="No hay datos para el período seleccionado"` y `descripcion` con el período. **No se renderiza ningún porcentaje** (ni `0 %`).
  - Si no: cinco `StatCard` (`ui/stat-card.tsx:5-25`) en una grilla (`grid gap-4 sm:grid-cols-2 lg:grid-cols-5`): «Total de reservas», «Atendidas», «Canceladas anticipadamente», «Canceladas por ausencia» y «Ausentismo», este último con `formatearPorcentaje(resultado.porcentaje_ausentismo)` y `descripcion="Canceladas por ausencia sobre el total del período"`.
  - El botón «Descargar PDF» (`variant="outline"`, deshabilitado mientras `descargando`) **en los dos casos**, con o sin datos.
- `formatearPorcentaje(valor: string): string` es una función privada del archivo: `` `${valor.replace('.', ',')} %` `` (`"33.33"` → `"33,33 %"`), el mismo formato que el PDF (Decisión 43). Solo se llama dentro de la rama `total_reservas > 0`, donde la invariante garantiza un texto no nulo; TypeScript lo exige con un guardia `porcentaje_ausentismo !== null` en la misma condición, sin `!`.

Notas:

- **Decisión «sin datos» por `total_reservas === 0`**, como dice la propuesta y la spec; es equivalente a `porcentaje_ausentismo === null` y evita mostrar contadores en cero que contradigan el mensaje.
- **«Descargar PDF» disponible siempre que el período sea válido:** se interpreta como «después de generar un período válido», que es cuando hay `resultado` (con o sin datos). Antes de generar no hay período confirmado; M1 hace lo mismo (`ReporteMasVendidosPage.tsx:41-55`).
- **Maqueta:** no tiene pantalla de reportes (proposal, «Frontend»); se sigue el estilo de M1 y se anota en el PR.
- **Sin gráfico:** la spec no lo pide (proposal, «Excluido»).
- **Tamaño:** el componente queda por debajo de 50 líneas si la grilla de tarjetas se extrae a una función privada `TarjetasDelResumen({ resumen })` en el mismo archivo (RNF-MAN-05).

**Alternativas descartadas:**

- *`DescriptionList` en lugar de tarjetas:* válido, pero `StatCard` es el componente de cifras sueltas del catálogo y da más peso visual al porcentaje.
- *`Alert` para «sin datos»:* `Alert` comunica un error o advertencia; «sin datos» es un resultado válido (200), que el catálogo representa con `EmptyState`.

### Decisión 49: registro en `reportes.ts` y `App.tsx`, y ajuste de `ReportesPage.test.tsx`

**Elección:**

1. **`frontend/src/shared/components/reportes.ts`:** una entrada nueva **después de la línea 14** (el `},` que cierra la entrada de M1) y antes de la línea 15 (`];`):

   ```ts
     {
       titulo: 'Reservas y ausentismo',
       descripcion:
         'Las reservas de un período según cómo terminaron y el porcentaje de clientes que no se presentaron.',
       ruta: '/reportes/reservas-ausentismo',
     },
   ```

   El catálogo no importa nada de los módulos (`reportes.ts:1`; la prueba `ReportesPage.test.tsx:57-63` lo controla) y la entrada solo agrega texto y una ruta. Si al integrar `develop` ya hay entradas de otros módulos, la de M5 se ubica en el orden de los módulos (después de M4, antes de M6) para que el orden de las tarjetas sea estable.

2. **`frontend/src/App.tsx`:**
   - Un `lazy` nuevo **después de la línea 55** (el cierre del `lazy` de `ReservasPage`, `:51-55`), con la forma de `:27-31`:

     ```tsx
     const ReporteReservasAusentismoPage = lazy(() =>
       import('./modules/reservas/pages/ReporteReservasAusentismoPage').then((modulo) => ({
         default: modulo.ReporteReservasAusentismoPage,
       })),
     );
     ```

   - Una `<Route>` **después de la línea 75** (`<Route path="reservas" element={<ReservasPage />} />`):

     ```tsx
     <Route path="reportes/reservas-ausentismo" element={<ReporteReservasAusentismoPage />} />
     ```

   Es una ruta hermana, con la ruta completa, dentro de `<Route path="/" element={<AppShell />}>` (`:67`), igual que la de M1 (`:71`). **No va «dentro de `<Route path="reportes">`»:** esa ruta (`:77`) es una hoja sin hijos (ver «Contradicciones», punto 2). Se ubica junto a las rutas de `reservas`, como M1 ubicó la suya junto a las de `productos` (`:69-71`): cada módulo inserta cerca de sus propias líneas y los conflictos de merge entre reportes de distintos módulos se reducen. El orden de las rutas no afecta la resolución en React Router v6 (elige la más específica).

3. **`frontend/src/shared/components/ReportesPage.test.tsx`:** las líneas 28 y 34 usan `screen.getByRole('link', { name: 'Generar' })`, que **falla con dos tarjetas** (`getByRole` exige un único elemento). Ajuste mínimo, sin cambiar lo que prueban: buscar el enlace dentro de la tarjeta de M1 (`within(screen.getByRole('listitem', ...))` o `getAllByRole(...)[0]`), y sumar una prueba de la tarjeta nueva («Generar» navega a `/reportes/reservas-ausentismo`, con una `<Route>` de prueba como la de `:16`). Es un archivo compartido: se avisa a Franco Martín Soler (M1) en el PR (AGENTS.md §9.3; ver «Contradicciones», punto 4).

**Alternativas descartadas:**

- *Rutas anidadas (`<Route path="reportes">` con `index` e hijos):* cambia la estructura de las rutas de M1 y de la página compartida; fuera de alcance.
- *Insertar la `<Route>` justo después de la de M1 (`:71`):* agrupa los reportes, pero todos los módulos insertarían en la misma línea y el conflicto sería seguro.
- *Generar las rutas desde `REPORTES`:* `reportes.ts` no puede importar los módulos (prueba `:57-63`).

## Flujo de datos

```text
JSON
GET /api/v1/reportes/reservas-ausentismo?fecha_desde&fecha_hasta
  │  (FastAPI convierte a date; formato inválido → 422 "Datos invalidos. fecha_desde: ...")
  ▼
router.reporte_reservas_ausentismo ──► service.generar_reporte_reservas_ausentismo
                                          │
                                          ├─► reporte.validar_periodo ──✗──► DatosInvalidosError → 422 {"detalle"}
                                          │                                  (sin consulta)
                                          ├─► repository.contar_reservas_por_estado
                                          │      SELECT estado, count(id) FROM reservas
                                          │      WHERE fecha BETWEEN :desde AND :hasta GROUP BY estado
                                          │      → {EstadoReserva: int}  (solo los estados presentes)
                                          └─► reporte.armar_resumen → ResumenReservas
                                                 (0 para estados ausentes; porcentaje o None)
  ◄── 200 {..., "porcentaje_ausentismo": "33.33" | null}

PDF
GET .../reservas-ausentismo/pdf ──► service.generar_pdf_reservas_ausentismo
                                      ├─► generar_reporte_reservas_ausentismo (mismo camino y mismo 422)
                                      ├─► reporte_pdf.componer(resumen, ahora()) → DocumentoPdf
                                      └─► shared.pdf.renderizar → bytes
  ◄── 200 application/pdf, Content-Disposition: attachment; filename="reservas-ausentismo_<d>_<h>.pdf"

Frontend
ReporteReservasAusentismoPage ─► useReporteReservasAusentismo.generar
                                   ├─ validarPeriodo ✗ → error local, sin API
                                   └─ api.obtenerReporteReservasAusentismo → clienteHttp.get
                                        ├─ exito → resultado → EmptyState (total 0) | 5 StatCard
                                        └─ error → Alert con `detalle` del 422
                                 ─► descargarPdf → api.descargar...Pdf → clienteHttp.obtenerArchivo → guardarArchivo
```

## Contratos e interfaces

| Ruta | Entrada | Éxito | Errores |
| --- | --- | --- | --- |
| `GET /api/v1/reportes/reservas-ausentismo` | query `fecha_desde`, `fecha_hasta` (`YYYY-MM-DD`) | 200 `ResumenReservas` | 422 `{"detalle"}` |
| `GET /api/v1/reportes/reservas-ausentismo/pdf` | mismo query | 200 `application/pdf`, `attachment; filename="reservas-ausentismo_<desde>_<hasta>.pdf"` | 422 `{"detalle"}` (JSON, no PDF) |

Ejemplo con datos (período con 6 reservas, 1 por ausencia):

```json
{
  "fecha_desde": "2026-10-01",
  "fecha_hasta": "2026-10-31",
  "total_reservas": 6,
  "atendidas": 1,
  "canceladas_anticipada": 2,
  "canceladas_por_ausencia": 1,
  "porcentaje_ausentismo": "16.67"
}
```

Sin datos: los cuatro contadores en `0` y `"porcentaje_ausentismo": null`.

| Caso | `detalle` | Código |
| --- | --- | --- |
| Faltan las dos fechas | `Faltan la fecha desde y la fecha hasta.` | 422 |
| Falta `fecha_desde` | `Falta la fecha desde.` | 422 |
| Falta `fecha_hasta` | `Falta la fecha hasta.` | 422 |
| `fecha_desde > fecha_hasta` | `El período es inválido: la fecha desde es posterior a la fecha hasta.` | 422 |
| Formato inválido | `Datos invalidos. fecha_desde: <mensaje de Pydantic>` (`main.py:85-91`) | 422 |

Firmas nuevas del backend:

```python
# repository.py
def contar_reservas_por_estado(db: Session, desde: date, hasta: date) -> dict[EstadoReserva, int]: ...
# reporte.py
def validar_periodo(desde: date | None, hasta: date | None) -> tuple[date, date]: ...
def calcular_porcentaje_ausentismo(canceladas_por_ausencia: int, total: int) -> Decimal | None: ...
def armar_resumen(desde: date, hasta: date, conteos: Mapping[EstadoReserva, int]) -> ResumenReservas: ...
# reporte_pdf.py
def formatear_porcentaje(porcentaje: Decimal) -> str: ...
def componer(resumen: ResumenReservas, generado: datetime) -> DocumentoPdf: ...
# service.py
def generar_reporte_reservas_ausentismo(db: Session, fecha_desde: date | None, fecha_hasta: date | None) -> ResumenReservas: ...
class ArchivoPdf: contenido: bytes; nombre: str   # dataclass(frozen=True)
def generar_pdf_reservas_ausentismo(db: Session, fecha_desde: date | None, fecha_hasta: date | None) -> ArchivoPdf: ...
```

Firmas nuevas del frontend:

```ts
// types.ts
export interface ResumenReservas { /* Decisión 45 */ }
// api.ts
export function obtenerReporteReservasAusentismo(fechaDesde: string, fechaHasta: string): Promise<RespuestaApi<ResumenReservas>>;
export function descargarReporteReservasAusentismoPdf(fechaDesde: string, fechaHasta: string): Promise<RespuestaApi<Blob>>;
// validarPeriodo.ts
export function validarPeriodo(desde: string, hasta: string): string | null;
// pages/useReporteReservasAusentismo.ts
export function useReporteReservasAusentismo(): { /* Decisión 47 */ };
// pages/ReporteReservasAusentismoPage.tsx
export function ReporteReservasAusentismoPage(): JSX.Element;
```

## Estrategia de pruebas (Strict TDD)

Primero la prueba en rojo, después el código (`openspec/config.yaml:13-16`). Backend con `pytest` desde `backend/`; frontend con `npm test` desde `frontend/`. Las pruebas del backend usan las fixtures existentes de `backend/tests/modules/reservas/conftest.py`: `fabrica_reserva(fecha=..., estado=...)` (`:176-198`) ya acepta cualquier estado, incluido `ATENDIDA` (sin HU-M5-06), y `reloj` (autouse, `:128-130`) fija `ahora()` en `AHORA`. **No hace falta ninguna fixture nueva.** El `cliente` de `TestClient` es el de `backend/tests/conftest.py`, el mismo que usa `test_router.py` del módulo.

| Archivo | Qué se prueba | Cómo |
| --- | --- | --- |
| `tests/modules/reservas/test_repository_reporte.py` (nuevo) | Cuenta por estado en el período; los estados sin reservas no aparecen; bordes `fecha_desde` y `fecha_hasta` incluidos, día anterior y posterior excluidos; la `hora` no influye (reserva a las 23:59 del último día); **una sola sentencia SQL** | `fabrica_reserva` + llamada directa; la sentencia única se cuenta con un `event.listen(engine, "before_cursor_execute", ...)` sobre la conexión de `db` |
| `tests/modules/reservas/test_reporte.py` (nuevo) | `validar_periodo`: los cuatro mensajes, el orden y `desde == hasta` válido; `calcular_porcentaje_ausentismo`: 2/10 → `20.00`, 1/3 → `33.33`, 2/3 → `66.67` (redondeo hacia arriba), 0/5 → `0.00`, 4/4 → `100.00`, total 0 → `None`; `armar_resumen`: completa con 0, `total` incluye `ACTIVA`, invariante en los dos sentidos (parametrizada) | Puro, sin base, como `productos/test_reporte.py` |
| `tests/modules/reservas/test_reporte_pdf.py` (nuevo) | Título, período `dd/mm/aaaa`, `generado`; con datos: una tabla con las cinco filas y `"16,67 %"`; sin datos: sin tablas, `SIN_DATOS` en los párrafos y ningún `%` en ningún texto; `formatear_porcentaje` | `componer(...)` con un `ResumenReservas` armado a mano y `GENERADO` fijo, como `productos/test_reporte_pdf.py:15-57` |
| `tests/modules/reservas/test_router_reporte.py` (nuevo) | Todos los escenarios HTTP de la spec: camino feliz con los cuatro estados (6 reservas), fuera del período, un solo día, sin reservas (dos variantes), los cuatro 422 con su `detalle`, formato inválido nombrando `fecha_desde`, `/pdf` con datos (`content-type`, `content-disposition` exacto con `2026-10-01` y `2026-10-31`, `startswith(b"%PDF")`), `/pdf` sin datos (200 PDF), `/pdf` con período inverso (422 JSON); JSON con `"porcentaje_ausentismo": "16.67"` (texto) y `null`; ninguna reserva cambia tras JSON y PDF; un período inválido no ejecuta la consulta | `TestClient`; «sin consulta» con `monkeypatch.setattr(repository, "contar_reservas_por_estado", <falla>)` y 422 esperado |
| `tests/modules/reservas/test_service.py` (modificar) | `generar_pdf_reservas_ausentismo` llama a `componer` con `AHORA` y arma el nombre con el período | `monkeypatch` de `reporte_pdf.componer` con un espía que delega en el original |
| `reservas/validarPeriodo.test.ts` (nuevo) | Los cuatro mensajes y el caso válido (incluido `desde == hasta`) | Igual que `productos/validarPeriodo.test.ts` |
| `reservas/api.test.ts` (modificar) | Las dos funciones llaman a `clienteHttp.get` / `obtenerArchivo` con la URL y el query correctos | Igual que las pruebas existentes del archivo |
| `reservas/pages/useReporteReservasAusentismo.test.tsx` (nuevo) | Validación local sin API; éxito → `resultado`; 422 → `error` igual al `detalle`; error sin texto → `ERROR_CARGA`; `descargarPdf` llama a `guardarArchivo` con `reservas-ausentismo_<d>_<h>.pdf`; error de descarga → `errorDescarga` | `renderHook`, `vi.mock('../api')` y `vi.mock('../../../shared/lib/guardarArchivo')` |
| `reservas/pages/ReporteReservasAusentismoPage.test.tsx` (nuevo) | Cinco datos y porcentaje `33,33 %` con datos; «No hay datos para el período seleccionado» y **ningún texto con `%`** sin datos; «Descargar PDF» presente en los dos casos; «Falta la fecha hasta.» sin llamar a la API; `detalle` del 422 visible | Igual que `ReporteMasVendidosPage.test.tsx:1-60` (`MemoryRouter`, `vi.mock`) |
| `shared/components/ReportesPage.test.tsx` (modificar) | Las pruebas de M1 siguen pasando con dos tarjetas; la tarjeta nueva navega a `/reportes/reservas-ausentismo` | Decisión 49, punto 3 |

Cobertura esperada por encima de los umbrales (70 % y 60 %): todas las ramas nuevas tienen prueba. Verificación adicional: `lint-imports` sin cambios en `pyproject.toml` y `alembic heads` igual que antes.

## Matriz de amenazas

N/A: el cambio agrega dos rutas HTTP de solo lectura dentro del proceso de la API, una consulta SQLAlchemy parametrizada (D-07, RNF-SEG-05) y una pantalla del frontend; no agrega enrutamiento de procesos, comandos de shell, subprocesos, automatización de VCS o PR, clasificación de archivos ejecutables ni integración de procesos. El nombre del archivo del `Content-Disposition` se arma solo con fechas ya convertidas a `date` (sin texto del usuario), y los errores no exponen trazas (D-26).

## Archivos a crear o modificar

| Archivo | Acción | Descripción |
| --- | --- | --- |
| `backend/app/modules/reservas/repository.py` | Modificar | `contar_reservas_por_estado` (Decisión 39) |
| `backend/app/modules/reservas/reporte.py` | Crear | `validar_periodo`, `calcular_porcentaje_ausentismo`, `armar_resumen` (Decisión 40) |
| `backend/app/modules/reservas/schemas.py` | Modificar | `ResumenReservas` con el serializador del porcentaje (Decisión 41) |
| `backend/app/modules/reservas/service.py` | Modificar | `generar_reporte_reservas_ausentismo`, `ArchivoPdf`, `generar_pdf_reservas_ausentismo` (Decisión 42) |
| `backend/app/modules/reservas/reporte_pdf.py` | Crear | `componer`, `formatear_porcentaje` (Decisión 43) |
| `backend/app/modules/reservas/router.py` | Modificar | Dos rutas `GET` (Decisión 44) |
| `backend/tests/modules/reservas/test_repository_reporte.py` | Crear | Consulta agregada, bordes y sentencia única |
| `backend/tests/modules/reservas/test_reporte.py` | Crear | Cálculo puro |
| `backend/tests/modules/reservas/test_reporte_pdf.py` | Crear | Composición del PDF |
| `backend/tests/modules/reservas/test_router_reporte.py` | Crear | Escenarios HTTP de la spec |
| `backend/tests/modules/reservas/test_service.py` | Modificar | Fecha de generación y nombre del PDF |
| `frontend/src/modules/reservas/types.ts` | Modificar | `ResumenReservas` (Decisión 45) |
| `frontend/src/modules/reservas/api.ts` | Modificar | `consultaPeriodo`, `obtenerReporteReservasAusentismo`, `descargarReporteReservasAusentismoPdf` (Decisión 45) |
| `frontend/src/modules/reservas/api.test.ts` | Modificar | Pruebas de las dos funciones |
| `frontend/src/modules/reservas/validarPeriodo.ts` (+ `.test.ts`) | Crear | Decisión 46 |
| `frontend/src/modules/reservas/pages/useReporteReservasAusentismo.ts` (+ `.test.tsx`) | Crear | Decisión 47 |
| `frontend/src/modules/reservas/pages/ReporteReservasAusentismoPage.tsx` (+ `.test.tsx`) | Crear | Decisión 48 |
| `frontend/src/shared/components/reportes.ts` | Modificar (1 entrada) | Decisión 49, punto 1 |
| `frontend/src/App.tsx` | Modificar (1 `lazy`, 1 `<Route>`) | Decisión 49, punto 2 |
| `frontend/src/shared/components/ReportesPage.test.tsx` | Modificar | Decisión 49, punto 3 (aviso a M1) |
| `models.py`, `puente.py`, `conftest.py`, `components/` de `reservas` | Sin cambios | — |
| `alembic/`, `backend/app/shared/`, `backend/pyproject.toml`, `backend/app/main.py`, otros módulos, `navegacion.ts` | Sin cambios | Requisito «Aislamiento del módulo y del esquema» |

## Estimación de líneas (punto de control, no bloqueo)

Líneas escritas (agregadas más quitadas), sin archivos generados:

| Lado | Código | Pruebas | Total estimado | Límite del proyecto |
| --- | --- | --- | --- | --- |
| `backend/` | `repository` 15 a 20, `reporte.py` 45 a 55, `schemas` 18 a 22, `service` 30 a 35, `reporte_pdf.py` 55 a 65, `router` 20 a 25 | `test_repository_reporte` 60 a 80, `test_reporte` 70 a 90, `test_reporte_pdf` 50 a 70, `test_router_reporte` 150 a 200, `test_service` 15 a 25 | **530 a 690** | 800 |
| `frontend/` | `types` 12, `api.ts` 25 a 30, `validarPeriodo` 10, hook 60 a 70, página 80 a 100, `reportes.ts` 6, `App.tsx` 7 | `validarPeriodo.test` 25 a 30, `api.test` 25 a 35, hook 100 a 140, página 110 a 150, `ReportesPage.test` 10 a 20 | **470 a 610** | 800 |

Los dos lados quedan por debajo del límite de 800 de AGENTS.md §4, aunque por encima de lo estimado en la propuesta (que no contaba el archivo de pruebas del `repository` ni el ajuste de `ReportesPage.test.tsx`), casi todo en pruebas. Con la estrategia `single-pr`, el cambio va en un solo PR como pide AGENTS.md §4; no se recortan pruebas para entrar en el número.

## Migración y puesta en marcha

Sin migración. Los cuatro valores de `EstadoReserva` (`models.py:12-16`) y el índice `ix_reservas_fecha_hora` (`models.py:33`) existen desde HU-M5-01-02-03; `alembic heads` no cambia. Sin dependencias nuevas (`fpdf2` ya está por HU-M1-15) ni variables de entorno.

## Riesgos y reversión

| Riesgo | Mitigación |
| --- | --- |
| Conflicto de merge en `reportes.ts`, `App.tsx` o `ReportesPage.test.tsx` con los reportes de otros módulos | Inserción junto a las líneas del propio módulo (Decisión 49); `git pull origin develop` antes del PR (AGENTS.md §8); si otro módulo ya ajustó `ReportesPage.test.tsx`, se conserva su versión y solo se suma la prueba de M5 |
| El equipo prefiere otro formato del porcentaje (número JSON, coma) | Un solo `field_serializer` (Decisión 41) y una sola función de presentación por lado |
| El recuadro de cifras del PDF de M1 se espera también en este PDF | Decisión 43 lo justifica; agregarlo es sumar `resumen=[...]` en `componer` |
| `atendidas` en 0 hasta HU-M5-06 | Pruebas con reservas `ATENDIDA` insertadas por la fábrica; nota en el PR |
| Duplicación de `validar_periodo`, `validarPeriodo.ts` y `ArchivoPdf` con M1 | Seguimiento del equipo (S116 de HU-M1-15); el cambio no toca `shared/` |
| El equipo descarta el PDF (S5) | Se quitan `reporte_pdf.py`, la ruta `/pdf`, `generar_pdf_reservas_ausentismo`, `ArchivoPdf`, la función de descarga y el botón; el JSON no cambia |

Probabilidades a estimar por el equipo (AGENTS.md §9.9).

**Reversión:** el cambio no toca el esquema ni escribe datos. Antes de integrar, descartar la rama; ya integrado, `git revert -m 1 <merge>`. No hace falta `alembic downgrade`. Verificación: `pytest`, `npm test`, `alembic heads` sin cambios y la tarjeta ausente de `/reportes`.

## Contradicciones con la exploración, la propuesta y la spec

Ninguna se resolvió en silencio. Las que cambian un artefacto anterior quedan para que la persona decida si se corrige la propuesta o la spec; el diseño ya aplica la resolución indicada.

1. **«Seguir los reportes ya integrados» para el `Decimal` (spec, tabla `ResumenReservas`; proposal S3).** El único reporte integrado, el de M1, no tiene ningún `Decimal` (`productos/schemas.py:269-288`), así que no hay una serialización de reporte que copiar. El diseño sigue la convención de `Decimal` de salida de todo el proyecto, incluido el módulo de M1: texto con 2 decimales y `null` cuando no hay valor (`productos/schemas.py:109-111`, `menus/schemas.py:291-293`, `pagos/schemas.py:78-79`). Decisión 41.
2. **`<Route>` «dentro de `<Route path="reportes">`» (proposal, «Alcance», y exploración, «Patrón de referencia»).** En `App.tsx:77`, `<Route path="reportes" element={<ReportesPage />} />` es una hoja sin hijos; la ruta de M1 es una hermana con la ruta completa (`App.tsx:71`). El diseño agrega una ruta hermana `reportes/reservas-ausentismo`. Decisión 49.
3. **Manejo del 422 en el hook de M1.** `useReporteMasVendidos.ts:46` descarta el `detalle` y muestra un texto genérico; la spec de este cambio exige mostrar el `detalle`. El diseño se aparta de M1 en ese punto (Decisión 47). No se modifica el hook de M1.
4. **«Dos líneas compartidas» (proposal, «Registro del reporte»).** Además de `reportes.ts` y `App.tsx`, hay que ajustar `frontend/src/shared/components/ReportesPage.test.tsx:28` y `:34`, que fallan en cuanto el catálogo tiene dos tarjetas con «Generar». Es un archivo compartido con M1: se avisa en el PR (AGENTS.md §9.3). Decisión 49, punto 3.
5. **Parámetro `sesion` (proposal, «Capas», punto 1).** El módulo usa `db` en todas sus funciones (`repository.py:12`, `:22`, `:40`, `:54`); el diseño usa `db`.
6. **Ubicación de `validarPeriodo.ts` (proposal, «Áreas afectadas»: `pages/`).** El diseño lo ubica en la raíz del módulo, como M1 (`productos/validarPeriodo.ts`) y como `reservas/fechas.ts`, porque es lógica sin componente. El hook y la página sí quedan en `pages/`, como dice la propuesta.
7. **Fecha de generación del PDF.** M1 usa `datetime.now(ZONA)` directamente (`productos/service.py:591`); este diseño usa `ahora()` del módulo (`reservas/service.py:26-32`), que da el mismo valor y ya está fijada en las pruebas. No contradice la spec; se señala porque se aparta del patrón de referencia.
8. **Texto de «sin datos» en el PDF.** M1 dice «No hay datos para el período elegido.» (`productos/reporte_pdf.py:15`); este PDF usa «No hay datos para el período seleccionado.», el texto que la spec fija para la pantalla, para que los dos digan lo mismo.

## Preguntas abiertas

- [ ] Validación del equipo de S1 a S7 (sin cambios en este diseño) y de los puntos 1, 4 y 6 de «Contradicciones»: formato JSON del porcentaje, ajuste de `ReportesPage.test.tsx` (aviso a M1) y ubicación de `validarPeriodo.ts`.
- [ ] Formato de presentación del porcentaje (`33,33 %`, coma decimal) en la pantalla y el PDF: `Supuesto:` del diseño, a validar en el PR.
