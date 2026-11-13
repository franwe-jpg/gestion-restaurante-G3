import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { DescriptionList } from '../../../shared/components/ui/description-list';
import { Dialog } from '../../../shared/components/ui/dialog';
import { Spinner } from '../../../shared/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/ui/table';
import { useApi } from '../../../shared/hooks/useApi';
import { formatearFechaHora, formatearMoneda } from '../../../shared/lib/format';
import { listarMediosPago } from '../api';
import type { Cobro, Comprobante, Factura, FacturaResumen, MedioPago } from '../types';

import { useComprobantesDeFactura } from './useComprobantesDeFactura';

export interface ComprobantesDialogProps {
  factura: FacturaResumen;
  onOpenChange: (abierto: boolean) => void;
}

type Estado = ReturnType<typeof useComprobantesDeFactura>;

const LIMITE_MEDIOS = 100;

function nombreDelMedio(medios: MedioPago[], medioPagoId: number): string {
  return medios.find((medio) => medio.id === medioPagoId)?.nombre ?? `Medio #${medioPagoId}`;
}

function numeroDe(cobro: Cobro): number {
  return cobro.numero_comprobante ?? cobro.id;
}

interface ListaProps {
  factura: Factura;
  medios: MedioPago[];
  onVer: (numero: number) => void;
}

function ListaDeCobros({ factura, medios, onVer }: ListaProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Factura #{factura.id} · Saldo pendiente{' '}
        <strong className="text-slate-900 tabular-nums">
          {formatearMoneda(Number(factura.saldo_pendiente))}
        </strong>
      </p>
      <div className="overflow-x-auto rounded-md border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprobante</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Medio de pago</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {factura.cobros.map((cobro) => (
              <TableRow key={cobro.id}>
                <TableCell className="font-medium tabular-nums">#{numeroDe(cobro)}</TableCell>
                <TableCell>{formatearFechaHora(cobro.fecha_hora)}</TableCell>
                <TableCell>{nombreDelMedio(medios, cobro.medio_pago_id)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearMoneda(Number(cobro.monto))}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="brand-outline"
                    aria-label={`Ver el comprobante ${numeroDe(cobro)}`}
                    onClick={() => onVer(numeroDe(cobro))}
                  >
                    Ver comprobante
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DetalleDelComprobante({ comprobante }: { comprobante: Comprobante }) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-900">
        Comprobante N° {comprobante.numero_comprobante}
      </h3>
      <DescriptionList
        items={[
          { termino: 'Fecha', detalle: formatearFechaHora(comprobante.fecha_hora) },
          {
            termino: 'Importe pagado',
            detalle: formatearMoneda(Number(comprobante.monto)),
          },
          { termino: 'Medio de pago', detalle: comprobante.medio_pago.nombre },
          { termino: 'Factura', detalle: `#${comprobante.factura_id}` },
          { termino: 'Comanda', detalle: `#${comprobante.comanda_id}` },
          {
            termino: 'Total de la factura',
            detalle: formatearMoneda(Number(comprobante.total_factura)),
          },
          {
            termino: 'Saldo pendiente',
            detalle: formatearMoneda(Number(comprobante.saldo_pendiente)),
          },
        ]}
      />
    </div>
  );
}

function Contenido({ estado, medios }: { estado: Estado; medios: MedioPago[] }) {
  if (estado.errorFactura) return <Alert variant="danger">{estado.errorFactura}</Alert>;
  if (estado.error) return <Alert variant="danger">{estado.error}</Alert>;
  if (estado.comprobante) return <DetalleDelComprobante comprobante={estado.comprobante} />;
  if (estado.cargandoFactura || estado.cargando || estado.factura === null) {
    return <Spinner etiqueta="Cargando comprobantes…" />;
  }
  return <ListaDeCobros factura={estado.factura} medios={medios} onVer={estado.ver} />;
}

function Pie({ estado, onCerrar }: { estado: Estado; onCerrar: () => void }) {
  const enDetalle = estado.comprobante !== null || estado.error !== null;
  return (
    <>
      {enDetalle && (
        <Button variant="brand-outline" onClick={estado.volver}>
          Volver
        </Button>
      )}
      {estado.comprobante && (
        <Button onClick={() => void estado.descargar()} disabled={estado.descargando}>
          Descargar PDF
        </Button>
      )}
      {!enDetalle && (
        <Button variant="brand-outline" onClick={onCerrar}>
          Cerrar
        </Button>
      )}
    </>
  );
}

/** HU-M6-03: comprobantes de los cobros de una factura; se monta solo mientras está abierto. */
export function ComprobantesDialog({ factura, onOpenChange }: ComprobantesDialogProps) {
  const estado = useComprobantesDeFactura(factura);
  const medios = useApi(() => listarMediosPago(LIMITE_MEDIOS, 0, true), 'medios-pago-comprobantes');

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={`Comprobantes de la factura #${factura.id}`}
      footer={<Pie estado={estado} onCerrar={() => onOpenChange(false)} />}
    >
      <Contenido estado={estado} medios={medios.datos?.items ?? []} />
    </Dialog>
  );
}
