import { Inbox, ReceiptText } from 'lucide-react';

import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { DataTable, type ColumnaTabla } from '../../../shared/components/ui/data-table';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { StatCard } from '../../../shared/components/ui/stat-card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { PageHeader } from '../../../shared/components/PageHeader';
import { formatearMoneda } from '../../../shared/lib/format';
import { etiquetaDelTipo } from '../components/validarMedioPago';
import type { CobradoPorMedio, ResumenRecaudacion } from '../types';
import { useReporteRecaudacion } from './useReporteRecaudacion';

const NOTA_DEUDA =
  'Lo adeudado es el saldo pendiente actual de las facturas emitidas en el período: si una factura se cobra después, deja de figurar como adeudada.';

const COLUMNAS: ColumnaTabla<CobradoPorMedio>[] = [
  { clave: 'nombre', encabezado: 'Medio de pago', render: (medio) => medio.nombre },
  { clave: 'tipo', encabezado: 'Tipo', render: (medio) => etiquetaDelTipo(medio.tipo) },
  {
    clave: 'cobros',
    encabezado: 'Cobros',
    render: (medio) => medio.cantidad_cobros,
    className: 'text-right',
  },
  {
    clave: 'monto',
    encabezado: 'Monto',
    render: (medio) => formatearMoneda(Number(medio.monto)),
    className: 'text-right',
  },
];

/** `"2026-10-01"` → `"01/10/2026"`, sin pasar por `Date`. */
function formatearFecha(fecha: string): string {
  return fecha.split('-').reverse().join('/');
}

function plural(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

function TarjetasDelResumen({ resumen }: { resumen: ResumenRecaudacion }) {
  const cobros = resumen.por_medio_pago.reduce((suma, medio) => suma + medio.cantidad_cobros, 0);
  const { cantidad_facturas: facturas } = resumen.adeudado;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StatCard
        titulo="Total cobrado"
        valor={formatearMoneda(Number(resumen.total_cobrado))}
        descripcion={plural(cobros, 'cobro', 'cobros')}
      />
      <StatCard
        titulo="Total adeudado"
        valor={formatearMoneda(Number(resumen.adeudado.monto))}
        descripcion={`${plural(facturas, 'factura emitida', 'facturas emitidas')} en el período`}
      />
    </div>
  );
}

function TablaPorMedio({ resumen }: { resumen: ResumenRecaudacion }) {
  return (
    <DataTable
      columnas={COLUMNAS}
      filas={resumen.por_medio_pago}
      obtenerClave={(medio) => medio.medio_pago_id}
      vacio={
        <EmptyState
          icono={Inbox}
          titulo="Sin cobros en el período"
          descripcion="Solo hay facturas adeudadas emitidas en el período."
        />
      }
    />
  );
}

interface ResultadoReporteProps {
  resultado: ResumenRecaudacion;
  descargando: boolean;
  onDescargarPdf: () => void;
}

/** Período, datos (o `EmptyState`) y el botón de descarga, siempre disponible. */
function ResultadoReporte({ resultado, descargando, onDescargarPdf }: ResultadoReporteProps) {
  const periodo = `Del ${formatearFecha(resultado.fecha_desde)} al ${formatearFecha(resultado.fecha_hasta)}`;
  const sinDatos =
    resultado.por_medio_pago.length === 0 && resultado.adeudado.cantidad_facturas === 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{periodo}</p>
      {sinDatos ? (
        <EmptyState
          icono={ReceiptText}
          titulo="No hay datos para el período seleccionado"
          descripcion={periodo}
        />
      ) : (
        <>
          <TarjetasDelResumen resumen={resultado} />
          <TablaPorMedio resumen={resultado} />
          <p className="text-xs text-slate-500">{NOTA_DEUDA}</p>
        </>
      )}
      <Button variant="outline" onClick={onDescargarPdf} disabled={descargando}>
        Descargar PDF
      </Button>
    </div>
  );
}

export function ReporteRecaudacionPage() {
  const reporte = useReporteRecaudacion();
  const { resultado } = reporte;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { etiqueta: 'Reportes', ruta: '/reportes' },
          { etiqueta: 'Recaudación por medio de pago' },
        ]}
      />
      <PageHeader
        titulo="Recaudación por medio de pago"
        descripcion="Lo cobrado en un período con cada medio de pago y lo que quedó adeudado."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <DateRangePicker
          desde={reporte.desde}
          hasta={reporte.hasta}
          onCambiarDesde={reporte.setDesde}
          onCambiarHasta={reporte.setHasta}
          etiquetaDesde="Fecha desde"
          etiquetaHasta="Fecha hasta"
        />
        <Button onClick={() => void reporte.generar()} disabled={reporte.cargando}>
          {reporte.cargando ? 'Generando…' : 'Generar'}
        </Button>
      </div>
      {reporte.error && <Alert variant="warning">{reporte.error}</Alert>}
      {reporte.errorDescarga && <Alert variant="danger">{reporte.errorDescarga}</Alert>}
      {resultado && (
        <ResultadoReporte
          resultado={resultado}
          descargando={reporte.descargando}
          onDescargarPdf={() => void reporte.descargarPdf()}
        />
      )}
    </div>
  );
}
