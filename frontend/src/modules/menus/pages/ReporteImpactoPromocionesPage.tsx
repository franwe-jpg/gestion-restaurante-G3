import { PageHeader } from '../../../shared/components/PageHeader';
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
import { Label } from '../../../shared/components/ui/label';
import { Select } from '../../../shared/components/ui/select';
import { ReporteImpactoPromocionesTabla } from '../components/ReporteImpactoPromocionesTabla';
import { useReporteImpactoPromociones } from '../components/useReporteImpactoPromociones';
import type { ReporteImpactoPromociones } from '../types';

const SIN_DATOS = 'No hay datos para comparar en el período seleccionado.';

type EstadoReporte = ReturnType<typeof useReporteImpactoPromociones>;

function FiltrosReporte({ reporte }: { reporte: EstadoReporte }) {
  return (
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
      <Button onClick={() => void reporte.generar()} disabled={reporte.cargando}>
        {reporte.cargando ? 'Generando…' : 'Generar'}
      </Button>
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
    <Card>
      <CardHeader>
        <CardTitle>{resultado.promocion.nombre}</CardTitle>
        <CardDescription>
          Promoción del {resultado.promocion.fecha_desde} al {resultado.promocion.fecha_hasta}.
        </CardDescription>
        <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-sm text-slate-600">
          <span>
            <strong>{resultado.dias_promocion}</strong> días de promoción
          </span>
          <span>
            <strong>{resultado.dias_fuera}</strong> días fuera
          </span>
          {resultado.horas_promocion_por_dia !== null && (
            <span>
              <strong>{resultado.horas_promocion_por_dia}</strong> horas por día
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ReporteImpactoPromocionesTabla
          lineas={resultado.lineas}
          unidad={resultado.unidad_promedio}
          cargando={cargando}
        />
      </CardContent>
    </Card>
  );
}

export function ReporteImpactoPromocionesPage() {
  const reporte = useReporteImpactoPromociones();
  const { resultado } = reporte;

  return (
    <div className="space-y-4">
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
      {resultado && !resultado.hay_datos && <Alert variant="info">{SIN_DATOS}</Alert>}
      {resultado && resultado.hay_datos && (
        <ResultadoReporte resultado={resultado} cargando={reporte.cargando} />
      )}
    </div>
  );
}
