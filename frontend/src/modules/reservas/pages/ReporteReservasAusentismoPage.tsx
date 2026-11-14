import { CalendarX, ChartColumn } from 'lucide-react';

import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { StatCard } from '../../../shared/components/ui/stat-card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { PageHeader } from '../../../shared/components/PageHeader';
import { formatearFechaReserva } from '../fechas';
import type { ResumenReservas } from '../types';
import { useReporteReservasAusentismo } from './useReporteReservasAusentismo';

/** `"33.33"` → `"33,33 %"`, el mismo formato que el PDF. */
function formatearPorcentaje(valor: string): string {
  return `${valor.replace('.', ',')} %`;
}

function TarjetasDelResumen({ resumen }: { resumen: ResumenReservas }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard titulo="Total de reservas" valor={resumen.total_reservas} />
      <StatCard titulo="Atendidas" valor={resumen.atendidas} />
      <StatCard titulo="Canceladas anticipadamente" valor={resumen.canceladas_anticipada} />
      <StatCard titulo="Canceladas por ausencia" valor={resumen.canceladas_por_ausencia} />
      {resumen.porcentaje_ausentismo !== null && (
        <StatCard
          titulo="Ausentismo"
          valor={formatearPorcentaje(resumen.porcentaje_ausentismo)}
          descripcion="Canceladas por ausencia sobre el total del período"
        />
      )}
    </div>
  );
}

interface ResultadoReporteProps {
  resultado: ResumenReservas;
  descargando: boolean;
  onDescargarPdf: () => void;
}

/** Período, datos (o `EmptyState`) y el botón de descarga, siempre disponible. */
function ResultadoReporte({ resultado, descargando, onDescargarPdf }: ResultadoReporteProps) {
  const periodo = `Del ${formatearFechaReserva(resultado.fecha_desde)} al ${formatearFechaReserva(resultado.fecha_hasta)}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{periodo}</p>
      {resultado.total_reservas === 0 ? (
        <EmptyState
          icono={CalendarX}
          titulo="No hay datos para el período seleccionado"
          descripcion={periodo}
        />
      ) : (
        <TarjetasDelResumen resumen={resultado} />
      )}
      <Button variant="brand-outline" onClick={onDescargarPdf} disabled={descargando}>
        Descargar PDF
      </Button>
    </div>
  );
}

export function ReporteReservasAusentismoPage() {
  const reporte = useReporteReservasAusentismo();
  const { resultado } = reporte;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ etiqueta: 'Reportes', ruta: '/reportes' }, { etiqueta: 'Reservas y ausentismo' }]}
      />
      <PageHeader
        titulo="Reservas y ausentismo"
        descripcion="Cuántas reservas hubo en un período, cómo terminaron y qué porcentaje de clientes no se presentó."
      />
      <FilterBar>
        <DateRangePicker
          desde={reporte.desde}
          hasta={reporte.hasta}
          onCambiarDesde={reporte.setDesde}
          onCambiarHasta={reporte.setHasta}
          etiquetaDesde="Fecha desde"
          etiquetaHasta="Fecha hasta"
        />
        <Button
          variant="brand-outline"
          onClick={() => void reporte.generar()}
          disabled={reporte.cargando}
        >
          {reporte.cargando ? 'Generando…' : 'Generar'}
        </Button>
      </FilterBar>
      {reporte.error && <Alert variant="warning">{reporte.error}</Alert>}
      {reporte.errorDescarga && <Alert variant="danger">{reporte.errorDescarga}</Alert>}
      {!resultado && !reporte.cargando && !reporte.error && (
        <EmptyState
          icono={ChartColumn}
          titulo="Elegí el período y presioná Generar"
          descripcion="Las reservas del período y el ausentismo se muestran acá."
        />
      )}
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
