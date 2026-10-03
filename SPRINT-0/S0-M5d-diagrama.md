# S0-M5d · Diagrama de clases — Módulo M5 Reservas

**Responsable:** Federico Cabaña
**Alcance:** Reservas, cancelaciones y comanda con reserva (HU-M5-01 a HU-M5-07).

## Diagrama

```mermaid
classDiagram
    class Reserva {
        -id: int
        -fecha: date
        -hora: time {HH:MM}
        -cantidadPersonas: int {>0}
        -estado: Estado = ACTIVA
        +cancelarAnticipada()
        +cancelarPorAusencia()
        +crearComanda() Comanda
    }

    class Estado {
        <<enumeration>>
        ACTIVA
        CANCELADA_ANTICIPADA
        CANCELADA_POR_AUSENCIA
    }

    class Cliente {
        <<M4 · Atención al Público>>
    }

    class Mesa {
        <<M3 · Salón y Mozos>>
    }

    class Comanda {
        <<M4 · Atención al Público>>
    }

    class ReporteReservasAusentismo {
        <<servicio>>
        -fechaDesde: date
        -fechaHasta: date
        +generar() ResumenReservas
    }

    class ResumenReservas {
        <<DTO>>
        -totalReservas: int
        -canceladasAnticipada: int
        -canceladasPorAusencia: int
        -porcentajeAusentismo: Decimal
    }

    Cliente "1" -- "0..*" Reserva : realiza
    Mesa "1" -- "0..*" Reserva : ocupa
    Reserva "1" -- "0..1" Comanda : genera
    Reserva --> Estado
    ReporteReservasAusentismo ..> Reserva : lee
    ReporteReservasAusentismo --> ResumenReservas : devuelve
```

## Clases propias del módulo

- **Reserva**: entidad central del módulo. Guarda fecha, hora, cantidad de personas y su estado; expone los métodos de cancelación (HU-M5-04, HU-M5-05) y la creación de comanda (HU-M5-06). No tiene datos de contacto propios: referencia a un `Cliente` ya registrado (ver supuesto más abajo).
- **Estado**: enumeración con los tres estados posibles de una reserva.
- **ReporteReservasAusentismo** / **ResumenReservas**: servicio y DTO para HU-M5-07, mismo patrón que usó Franco en M1 (`ReporteProductosMasVendidos` / `LineaReporte`) para que los reportes de todos los módulos queden consistentes en la integración.

## Clases de otros módulos (placeholders)

`Cliente` (M4) y `Mesa` (M3) todavía no tienen su diagrama propio cerrado por sus responsables. Se dejan como clases sin atributos hasta la integración en S0-09, donde se completan con lo que definan Juan y Giuliano. `Comanda` (M4) se deja igual, como destino de la relación de HU-M5-06.

## Supuestos a confirmar en S0-09

- **Cliente ya registrado:** `Reserva` referencia a `Cliente` en vez de tener nombre y teléfono propios. Se confirmó en base al texto de HU-M4-01 (*"crear un cliente para asociarlo a comandas y reservas"*), pero los atributos finales de `Cliente` los define Juan en S0-M4a.
- **Asignación manual de mesa:** la `Mesa` se asigna en el momento de crear la reserva, elegida por el encargado entre las disponibles (no hay asignación automática ni reserva sin mesa).
- **Reserva → Comanda (0..1):** una reserva no siempre deriva en comanda (puede cancelarse antes), por eso la relación es opcional.
