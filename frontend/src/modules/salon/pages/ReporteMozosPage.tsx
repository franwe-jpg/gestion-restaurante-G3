import { Armchair, DollarSign, TrendingUp } from 'lucide-react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Alert } from '../../../shared/components/ui/alert';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { Label } from '../../../shared/components/ui/label';
import { Select } from '../../../shared/components/ui/select';
import { StatCard } from '../../../shared/components/ui/stat-card';
import { formatearMoneda } from '../../../shared/lib/format';
import { ReporteMozosTabla } from '../components/ReporteMozosTabla';
import { useReporteMozos } from '../components/useReporteMozos';

const SIN_DATOS = 'No hay datos disponibles para el período seleccionado.';

export function ReporteMozosPage() {
  const reporte = useReporteMozos();
  const { resultado } = reporte;
  const sinDatos = resultado !== null && Number(resultado.total_ventas) === 0;

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { etiqueta: 'Reportes', ruta: '/reportes' },
          { etiqueta: 'Mesas y ventas por mozo' },
        ]}
      />
      <PageHeader
        titulo="Mesas atendidas y ventas por mozo"
        descripcion="Desempeño del personal de salón en un período."
      />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <DateRangePicker
          desde={reporte.desde}
          hasta={reporte.hasta}
          onCambiarDesde={reporte.setDesde}
          onCambiarHasta={reporte.setHasta}
          etiquetaDesde="Fecha desde"
          etiquetaHasta="Fecha hasta"
        />
        <div className="space-y-1.5">
          <Label htmlFor="reporte-mozo">Mozo</Label>
          <Select
            id="reporte-mozo"
            value={reporte.mozoId}
            onChange={(event) => reporte.setMozoId(event.target.value)}
          >
            <option value="">Todos los mozos</option>
            {reporte.mozos.map((mozo) => (
              <option key={mozo.id} value={mozo.id}>
                {mozo.apellido}, {mozo.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reporte-sector">Sector</Label>
          <Select
            id="reporte-sector"
            value={reporte.sectorId}
            onChange={(event) => reporte.setSectorId(event.target.value)}
          >
            <option value="">Todos los sectores</option>
            {reporte.sectores.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.nombre}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={() => void reporte.generar()} disabled={reporte.cargando}>
          {reporte.cargando ? 'Generando…' : 'Generar'}
        </Button>
      </div>
      {reporte.error && <Alert variant="warning">{reporte.error}</Alert>}
      {sinDatos && <Alert variant="info">{SIN_DATOS}</Alert>}
      {resultado && !sinDatos && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              titulo="Mesas atendidas"
              valor={resultado.total_mesas_atendidas}
              icono={Armchair}
            />
            <StatCard
              titulo="Total vendido"
              valor={formatearMoneda(Number(resultado.total_ventas))}
              icono={DollarSign}
            />
            <StatCard
              titulo="Promedio general por mesa"
              valor={formatearMoneda(Number(resultado.promedio_general))}
              icono={TrendingUp}
            />
          </div>
          <Card>
            <CardContent className="pt-6">
              <ReporteMozosTabla lineas={resultado.lineas} cargando={reporte.cargando} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
