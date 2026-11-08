"""pagos: arma el documento PDF del comprobante de pago (HU-M6-03) con datos puros."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.modules.pagos.schemas import ComprobanteSalida
from app.shared.pdf import DocumentoPdf

# S5: la fecha se escribe en la hora del restaurante, igual que el reporte de M1.
ZONA_DEL_RESTAURANTE = timezone(timedelta(hours=-3), "ART")
_LEYENDA = "Comprobante del pago registrado. Conservelo como constancia."


def _importe(valor: Decimal) -> str:
    return f"$ {valor:.2f}"


def componer(comprobante: ComprobanteSalida, generado: datetime) -> DocumentoPdf:
    """Documento con los datos del cobro; `generado` va en hora local."""
    fecha = comprobante.fecha_hora.astimezone(ZONA_DEL_RESTAURANTE)
    return DocumentoPdf(
        titulo=f"Comprobante de pago N° {comprobante.numero_comprobante}",
        periodo=f"Factura #{comprobante.factura_id} · Comanda #{comprobante.comanda_id}",
        generado=generado,
        parrafos=[_LEYENDA],
        resumen=[
            ("Fecha", f"{fecha:%d/%m/%Y %H:%M}"),
            ("Medio de pago", comprobante.medio_pago.nombre),
            ("Importe pagado", _importe(comprobante.monto)),
            ("Total de la factura", _importe(comprobante.total_factura)),
            ("Saldo pendiente", _importe(comprobante.saldo_pendiente)),
        ],
    )
