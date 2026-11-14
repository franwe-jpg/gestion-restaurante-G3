import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
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
import type { FacturaPrevia } from '../types';

import { useFacturarComanda } from './useFacturarComanda';

export interface FacturarComandaDialogProps {
  onGenerada: () => void;
  onOpenChange: (abierto: boolean) => void;
  /** Número de comanda recibido por el enlace desde Atención (S4-03). */
  comandaInicial?: string;
}

type Formulario = ReturnType<typeof useFacturarComanda>;

const LIMITE_MEDIOS = 50;

function DetalleDeLaFactura({ previa }: { previa: FacturaPrevia }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Comanda {previa.comanda_id} · Emisión {formatearFechaHora(previa.fecha_emision)}
      </p>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
        Paso 2 de 2 · Detalle de la factura
      </p>
      <div className="overflow-x-auto rounded-md border border-slate-100">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Detalle</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">Descuento</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previa.detalles.map((linea, indice) => (
              <TableRow key={indice}>
                <TableCell>{linea.descripcion}</TableCell>
                <TableCell className="text-right tabular-nums">{linea.cantidad}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearMoneda(Number(linea.precio_unitario))}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatearMoneda(Number(linea.descuento))}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatearMoneda(Number(linea.subtotal))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p
        aria-live="polite"
        className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-right text-base font-bold text-slate-900 tabular-nums sm:text-lg"
      >
        Total a pagar: {formatearMoneda(Number(previa.total))}
      </p>
    </div>
  );
}

function CamposDelCobro({ formulario }: { formulario: Formulario }) {
  const medios = useApi(() => listarMediosPago(LIMITE_MEDIOS, 0, false), 'medios-pago-facturar');
  const { errores } = formulario;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField id="factura-medio" label="Medio de pago" required error={errores.medioPago}>
        <Select
          id="factura-medio"
          value={formulario.medioPagoId}
          onChange={(evento) => formulario.setMedioPagoId(evento.target.value)}
        >
          <option value="">Elegí un medio de pago</option>
          {(medios.datos?.items ?? []).map((medio) => (
            <option key={medio.id} value={medio.id}>
              {medio.nombre}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField
        id="factura-importe"
        label="Importe"
        required
        hint="Primer cobro de la factura."
        error={errores.importe}
      >
        <Input
          id="factura-importe"
          inputMode="decimal"
          value={formulario.importe}
          onChange={(evento) => formulario.setImporte(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

function Contenido({ formulario }: { formulario: Formulario }) {
  return (
    <div className="space-y-4">
      {formulario.errores.general && <Alert variant="danger">{formulario.errores.general}</Alert>}
      {formulario.previa === null ? (
        <FormField
          id="factura-comanda"
          label="N° de comanda"
          required
          error={formulario.errores.comanda}
        >
          <Input
            id="factura-comanda"
            inputMode="numeric"
            value={formulario.comanda}
            onChange={(evento) => formulario.setComanda(evento.target.value)}
          />
        </FormField>
      ) : (
        <>
          <DetalleDeLaFactura previa={formulario.previa} />
          <CamposDelCobro formulario={formulario} />
        </>
      )}
    </div>
  );
}

/** Se monta solo mientras está abierto: cada apertura empieza pidiendo la comanda. */
export function FacturarComandaDialog({
  onGenerada,
  onOpenChange,
  comandaInicial,
}: FacturarComandaDialogProps) {
  const formulario = useFacturarComanda({ onGenerada, comandaInicial });
  const enVistaPrevia = formulario.previa === null;

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Facturar comanda"
      footer={
        <>
          <Button variant="brand-outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void (enVistaPrevia ? formulario.verFactura() : formulario.confirmar())}
            disabled={formulario.enviando}
          >
            {enVistaPrevia ? 'Ver factura' : 'Confirmar'}
          </Button>
        </>
      }
    >
      <Contenido formulario={formulario} />
    </Dialog>
  );
}
