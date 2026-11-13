import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
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
import { formatearMoneda } from '../../../shared/lib/format';
import { listarMediosPago } from '../api';
import type { Cobro, Factura, FacturaResumen, MedioPago } from '../types';

import { useCobrarFactura } from './useCobrarFactura';

export interface CobrarFacturaDialogProps {
  factura: FacturaResumen;
  onCobrada: () => void;
  onOpenChange: (abierto: boolean) => void;
}

type Formulario = ReturnType<typeof useCobrarFactura>;

const LIMITE_MEDIOS = 100;

function nombreDelMedio(medios: MedioPago[], medioPagoId: number): string {
  return medios.find((medio) => medio.id === medioPagoId)?.nombre ?? `Medio #${medioPagoId}`;
}

function ResumenDeLaFactura({ factura }: { factura: Factura }) {
  return (
    <section
      aria-live="polite"
      aria-label={`Total ${formatearMoneda(Number(factura.total))}, saldo pendiente ${formatearMoneda(Number(factura.saldo_pendiente))}`}
      className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Total</p>
        <p className="truncate text-base font-semibold text-slate-700 tabular-nums">
          {formatearMoneda(Number(factura.total))}
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          Saldo pendiente
        </p>
        <p className="text-lg font-bold text-slate-900 tabular-nums sm:text-xl">
          {formatearMoneda(Number(factura.saldo_pendiente))}
        </p>
      </div>
    </section>
  );
}

function CobrosRegistrados({ factura, medios }: { factura: Factura; medios: MedioPago[] }) {
  if (factura.cobros.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">Cobros registrados</h3>
      <div className="overflow-x-auto rounded-md border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Medio de pago</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Comprobante</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {factura.cobros.map((cobro: Cobro) => (
              <TableRow key={cobro.id}>
                <TableCell>{nombreDelMedio(medios, cobro.medio_pago_id)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearMoneda(Number(cobro.monto))}
                </TableCell>
                <TableCell className="tabular-nums">
                  #{cobro.numero_comprobante ?? cobro.id}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface CamposDelCobroProps {
  formulario: Formulario;
  factura: Factura;
  medios: MedioPago[];
}

function CamposDelCobro({ formulario, factura, medios }: CamposDelCobroProps) {
  const usados = new Set(factura.cobros.map((cobro) => cobro.medio_pago_id));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        id="cobro-medio"
        label="Medio de pago"
        required
        error={formulario.errores.medioPago}
      >
        <Select
          id="cobro-medio"
          value={formulario.medioPagoId}
          onChange={(evento) => formulario.setMedioPagoId(evento.target.value)}
        >
          <option value="">Elegí un medio de pago</option>
          {medios.map((medio) => (
            <option key={medio.id} value={medio.id} disabled={usados.has(medio.id)}>
              {medio.nombre}
              {usados.has(medio.id) ? ' (ya usado)' : ''}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id="cobro-importe"
        label="Importe"
        required
        hint={`Saldo pendiente: ${formatearMoneda(Number(factura.saldo_pendiente))}`}
        error={formulario.errores.importe}
      >
        <Input
          id="cobro-importe"
          inputMode="decimal"
          value={formulario.importe}
          onChange={(evento) => formulario.setImporte(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

interface ContenidoProps {
  formulario: Formulario;
  medios: MedioPago[];
}

function Contenido({ formulario, medios }: ContenidoProps) {
  if (formulario.errorCarga) {
    return <Alert variant="danger">{formulario.errorCarga}</Alert>;
  }
  if (formulario.cargando || formulario.completa === null) {
    return <Spinner etiqueta="Cargando factura…" />;
  }

  return (
    <div className="space-y-4">
      {formulario.errores.general && <Alert variant="danger">{formulario.errores.general}</Alert>}
      <ResumenDeLaFactura factura={formulario.completa} />
      <CobrosRegistrados factura={formulario.completa} medios={medios} />
      <CamposDelCobro formulario={formulario} factura={formulario.completa} medios={medios} />
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura pide la factura completa. */
export function CobrarFacturaDialog({
  factura,
  onCobrada,
  onOpenChange,
}: CobrarFacturaDialogProps) {
  const formulario = useCobrarFactura({ factura, onCobrada });
  const medios = useApi(() => listarMediosPago(LIMITE_MEDIOS, 0, false), 'medios-pago-cobrar');

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={`Cobrar factura #${factura.id}`}
      footer={
        <>
          <Button variant="brand-outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void formulario.confirmar()}
            disabled={formulario.enviando || formulario.completa === null}
          >
            Confirmar cobro
          </Button>
        </>
      }
    >
      <Contenido formulario={formulario} medios={medios.datos?.items ?? []} />
    </Dialog>
  );
}
