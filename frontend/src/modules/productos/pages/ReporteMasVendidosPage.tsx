import { ChartColumn } from 'lucide-react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Alert } from '../../../shared/components/ui/alert';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Button } from '../../../shared/components/ui/button';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { GraficoMasVendidos } from '../components/GraficoMasVendidos';
import { useReporteMasVendidos } from '../components/useReporteMasVendidos';
import { formatearPeriodo } from '../formatoPeriodo';

function EstadoInicial() {
  return (
    <EmptyState
      icono={ChartColumn}
      titulo="Elegí el período y presioná Generar"
      descripcion="Los productos más pedidos del período se muestran acá."
    />
  );
}

function FiltrosReporte({ reporte }: { reporte: ReturnType<typeof useReporteMasVendidos> }) {
  return (
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
  );
}

export function ReporteMasVendidosPage() {
  const reporte = useReporteMasVendidos();
  const { resultado } = reporte;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { etiqueta: 'Reportes', ruta: '/reportes' },
          { etiqueta: 'Productos más vendidos' },
        ]}
      />
      <PageHeader
        titulo="Productos más vendidos"
        descripcion="Los productos más pedidos de un período."
      />
      <FiltrosReporte reporte={reporte} />
      {reporte.error && <Alert variant="warning">{reporte.error}</Alert>}
      {reporte.errorDescarga && <Alert variant="danger">{reporte.errorDescarga}</Alert>}
      {!resultado && !reporte.cargando && !reporte.error && <EstadoInicial />}
      {resultado && (
        <GraficoMasVendidos
          productos={resultado.productos}
          descripcion={formatearPeriodo(resultado.periodo.desde, resultado.periodo.hasta)}
          acciones={
            <Button
              variant="brand-outline"
              onClick={() => void reporte.descargarPdf()}
              disabled={reporte.descargando}
            >
              Descargar PDF
            </Button>
          }
        />
      )}
    </div>
  );
}
