import { PageHeader } from '../../../shared/components/PageHeader';
import { Alert } from '../../../shared/components/ui/alert';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Button } from '../../../shared/components/ui/button';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { GraficoMasVendidos } from '../components/GraficoMasVendidos';
import { useReporteMasVendidos } from '../components/useReporteMasVendidos';
import { formatearPeriodo } from '../formatoPeriodo';

export function ReporteMasVendidosPage() {
  const reporte = useReporteMasVendidos();
  const { resultado } = reporte;

  return (
    <div className="space-y-4">
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
        <GraficoMasVendidos
          productos={resultado.productos}
          descripcion={formatearPeriodo(resultado.periodo.desde, resultado.periodo.hasta)}
          acciones={
            <Button
              variant="outline"
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
