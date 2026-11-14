import { CalendarDays, CalendarOff, ChartColumn, Clock } from 'lucide-react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { Alert } from '../../../shared/components/ui/alert';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { Button } from '../../../shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/card';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Label } from '../../../shared/components/ui/label';
import { Select } from '../../../shared/components/ui/select';
import { StatCard } from '../../../shared/components/ui/stat-card';
import { ReporteImpactoPromocionesTabla } from '../components/ReporteImpactoPromocionesTabla';
import { useReporteImpactoPromociones } from '../components/useReporteImpactoPromociones';
import type { ReporteImpactoPromociones } from '../types';

const SIN_DATOS = 'No hay datos para comparar en el período seleccionado.';
const NOMBRE_ARCHIVO = 'impacto-promociones';

type EstadoReporte = ReturnType<typeof useReporteImpactoPromociones>;

function FiltrosReporte({ reporte }: { reporte: EstadoReporte }) {
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
      <div className="space-y-1.5">
        <Label htmlFor="reporte-promocion">Promoción</Label>
        <Select
          id="reporte-promocion"
          value={reporte.promocionId}
          onChange={(event) => reporte.setPromocionId(event.target.value)}
        >
          <option value="">Seleccioná una promoción</option>
          {reporte.promociones.map((promocion) => (
            <option key={promocion.id} value={promocion.id}>
              {promocion.nombre}
            </option>
          ))}
        </Select>
      </div>
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

function ResumenReporte({ resultado }: { resultado: ReporteImpactoPromociones }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard titulo="Días de promoción" valor={resultado.dias_promocion} icono={CalendarDays} />
      <StatCard titulo="Días fuera" valor={resultado.dias_fuera} icono={CalendarOff} />
      {resultado.horas_promocion_por_dia !== null && (
        <StatCard titulo="Horas por día" valor={resultado.horas_promocion_por_dia} icono={Clock} />
      )}
    </div>
  );
}

function ResultadoReporte({
  resultado,
  cargando,
}: {
  resultado: ReporteImpactoPromociones;
  cargando: boolean;
}) {
  return (
    <>
      <ResumenReporte resultado={resultado} />

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>{resultado.promocion.nombre}</CardTitle>
            <CardDescription>
              Promoción del {resultado.promocion.fecha_desde} al {resultado.promocion.fecha_hasta}.
            </CardDescription>
          </div>
          <ExportButton filas={resultado.lineas} nombreArchivo={NOMBRE_ARCHIVO} />
        </CardHeader>
        <CardContent>
          <ReporteImpactoPromocionesTabla
            lineas={resultado.lineas}
            unidad={resultado.unidad_promedio}
            cargando={cargando}
          />
        </CardContent>
      </Card>
    </>
  );
}

export function ReporteImpactoPromocionesPage() {
  const reporte = useReporteImpactoPromociones();
  const { resultado } = reporte;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { etiqueta: 'Reportes', ruta: '/reportes' },
          { etiqueta: 'Impacto de promociones' },
        ]}
      />
      <PageHeader
        titulo="Impacto de promociones"
        descripcion="Compará las ventas de cada producto durante la promoción contra el resto del período."
      />
      <FiltrosReporte reporte={reporte} />
      {reporte.error && <Alert variant="warning">{reporte.error}</Alert>}
      {!resultado && !reporte.cargando && !reporte.error && (
        <EmptyState
          icono={ChartColumn}
          titulo="Elegí el período y la promoción, y presioná Generar"
          descripcion="El impacto de la promoción sobre las ventas se muestra acá."
        />
      )}
      {resultado && !resultado.hay_datos && <Alert variant="info">{SIN_DATOS}</Alert>}
      {resultado && resultado.hay_datos && (
        <ResultadoReporte resultado={resultado} cargando={reporte.cargando} />
      )}
    </div>
  );
}
