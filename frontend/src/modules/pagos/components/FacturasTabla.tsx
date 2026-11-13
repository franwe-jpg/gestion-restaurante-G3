import { ReceiptText } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import { formatearFechaHora, formatearMoneda } from '../../../shared/lib/format';
import type { FacturaResumen } from '../types';

export interface FacturasTablaProps {
  facturas: FacturaResumen[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onCobrar: (factura: FacturaResumen) => void;
  onVerComprobantes: (factura: FacturaResumen) => void;
}

const MENSAJE_VACIO = 'No hay facturas emitidas.';

type AccionFactura = (factura: FacturaResumen) => void;

function Acciones({
  factura,
  onCobrar,
  onVerComprobantes,
}: {
  factura: FacturaResumen;
  onCobrar: AccionFactura;
  onVerComprobantes: AccionFactura;
}) {
  return (
    <div className="flex flex-col justify-end gap-2 sm:flex-row sm:items-center">
      <Button
        size="sm"
        variant="brand-outline"
        className="w-full sm:w-auto"
        aria-label={`Ver los comprobantes de la factura ${factura.id}`}
        onClick={() => onVerComprobantes(factura)}
      >
        Comprobantes
      </Button>
      {factura.estado === 'ADEUDADA' && (
        <Button
          size="sm"
          className="w-full sm:w-auto"
          aria-label={`Cobrar la factura ${factura.id}`}
          onClick={() => onCobrar(factura)}
        >
          Cobrar
        </Button>
      )}
    </div>
  );
}

function columnas(
  onCobrar: AccionFactura,
  onVerComprobantes: AccionFactura,
): ColumnaTabla<FacturaResumen>[] {
  return [
    { clave: 'id', encabezado: 'N°', render: (f) => <span className="font-medium">#{f.id}</span> },
    { clave: 'comanda', encabezado: 'Comanda', render: (f) => `#${f.comanda_id}` },
    { clave: 'emision', encabezado: 'Emisión', render: (f) => formatearFechaHora(f.fecha_emision) },
    {
      clave: 'total',
      encabezado: 'Total',
      className: 'text-right tabular-nums',
      render: (f) => formatearMoneda(Number(f.total)),
    },
    {
      clave: 'saldo',
      encabezado: 'Saldo pendiente',
      className: 'text-right tabular-nums',
      render: (f) => (
        <span className="font-semibold text-slate-900">
          {formatearMoneda(Number(f.saldo_pendiente))}
        </span>
      ),
    },
    { clave: 'estado', encabezado: 'Estado', render: (f) => <StatusBadge estado={f.estado} /> },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      className: 'w-56',
      render: (f) => (
        <Acciones factura={f} onCobrar={onCobrar} onVerComprobantes={onVerComprobantes} />
      ),
    },
  ];
}

/** HU-M6-02: tabla de facturas; solo las adeudadas se pueden cobrar. HU-M6-03: comprobantes. */
export function FacturasTabla({
  facturas,
  cargando = false,
  error = null,
  onReintentar,
  onCobrar,
  onVerComprobantes,
}: FacturasTablaProps) {
  return (
    <DataTable
      columnas={columnas(onCobrar, onVerComprobantes)}
      filas={facturas}
      obtenerClave={(factura) => factura.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={ReceiptText}
          titulo={MENSAJE_VACIO}
          descripcion="Generá una factura desde «Facturar comanda»."
        />
      }
    />
  );
}
