import { ReceiptText } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
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

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function EstadoFactura({ estado }: { estado: FacturaResumen['estado'] }) {
  return (
    <Badge variant={estado === 'PAGADA' ? 'success' : 'danger'}>
      {estado === 'PAGADA' ? 'Pagada' : 'Adeudada'}
    </Badge>
  );
}

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
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        aria-label={`Ver los comprobantes de la factura ${factura.id}`}
        onClick={() => onVerComprobantes(factura)}
      >
        Comprobantes
      </Button>
      {factura.estado === 'ADEUDADA' && (
        <Button
          size="sm"
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
    {
      clave: 'id',
      encabezado: 'N°',
      render: (factura) => <span className="font-medium">#{factura.id}</span>,
    },
    {
      clave: 'comanda',
      encabezado: 'Comanda',
      render: (factura) => `#${factura.comanda_id}`,
    },
    {
      clave: 'emision',
      encabezado: 'Emisión',
      render: (factura) => formatearFecha(factura.fecha_emision),
    },
    { clave: 'total', encabezado: 'Total', render: (factura) => `$ ${factura.total}` },
    {
      clave: 'saldo',
      encabezado: 'Saldo pendiente',
      render: (factura) => (
        <span className="font-semibold text-slate-900">$ {factura.saldo_pendiente}</span>
      ),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (factura) => <EstadoFactura estado={factura.estado} />,
    },
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      className: 'w-56',
      render: (factura) => (
        <Acciones factura={factura} onCobrar={onCobrar} onVerComprobantes={onVerComprobantes} />
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
