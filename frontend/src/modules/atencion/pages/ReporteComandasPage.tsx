import { ChartColumn, Inbox, ReceiptText } from 'lucide-react';

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
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { DateRangePicker } from '../../../shared/components/ui/date-range-picker';
import { ExportButton } from '../../../shared/components/ui/export-button';
import { FilterBar } from '../../../shared/components/ui/filter-bar';
import { Label } from '../../../shared/components/ui/label';
import { Select } from '../../../shared/components/ui/select';
import { StatCard } from '../../../shared/components/ui/stat-card';
import { formatearMoneda } from '../../../shared/lib/format';
import type { GrupoReporteComandas } from '../types';
import { useReporteComandas } from './useReporteComandas';

const COLUMNAS: ColumnaTabla<GrupoReporteComandas>[] = [
  {
    clave: 'fecha',
    encabezado: 'Día',
    render: (grupo) => grupo.fecha.split('-').reverse().join('/'),
  },
  {
    clave: 'turno',
    encabezado: 'Turno',
    render: (grupo) => (grupo.turno === 'ALMUERZO' ? 'Almuerzo' : 'Noche'),
  },
  {
    clave: 'cantidad',
    encabezado: 'Comandas cerradas',
    render: (grupo) => grupo.cantidad_comandas,
    className: 'text-right',
  },
  {
    clave: 'importe',
    encabezado: 'Importe total',
    render: (grupo) => formatearMoneda(Number(grupo.importe_total)),
    className: 'text-right',
  },
  {
    clave: 'promedio',
    encabezado: 'Ticket promedio',
    render: (grupo) => formatearMoneda(Number(grupo.ticket_promedio)),
    className: 'text-right',
  },
];

function FiltrosReporte({ reporte }: { reporte: ReturnType<typeof useReporteComandas> }) {
  return (
    <>
      <DateRangePicker
        desde={reporte.desde}
        hasta={reporte.hasta}
        onCambiarDesde={reporte.setDesde}
        onCambiarHasta={reporte.setHasta}
        etiquetaDesde="Fecha desde"
        etiquetaHasta="Fecha hasta"
      />
      <div className="space-y-1.5">
        <Label htmlFor="reporte-comandas-turno">Turno</Label>
        <Select
          id="reporte-comandas-turno"
          value={reporte.turno}
          onChange={(event) => reporte.setTurno(event.target.value as '' | 'ALMUERZO' | 'NOCHE')}
        >
          <option value="">Todos los turnos</option>
          <option value="ALMUERZO">Almuerzo</option>
          <option value="NOCHE">Noche</option>
        </Select>
      </div>
      <Button
        variant="brand-outline"
        onClick={() => void reporte.generar()}
        disabled={reporte.cargando}
      >
        {reporte.cargando ? 'Generando…' : 'Generar'}
      </Button>
    </>
  );
}

function ResumenReporte({
  resultado,
}: {
  resultado: NonNullable<ReturnType<typeof useReporteComandas>['resultado']>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard titulo="Cantidad de comandas" valor={resultado.total_comandas} />
      <StatCard titulo="Importe total" valor={formatearMoneda(Number(resultado.importe_total))} />
      <StatCard
        titulo="Ticket promedio"
        valor={formatearMoneda(Number(resultado.ticket_promedio))}
      />
    </div>
  );
}

function ResultadoReporte({
  resultado,
}: {
  resultado: NonNullable<ReturnType<typeof useReporteComandas>['resultado']>;
}) {
  if (resultado.total_comandas === 0) {
    return (
      <EmptyState
        icono={ReceiptText}
        titulo="No hay datos para el período seleccionado"
        descripcion="No se encontraron comandas cerradas en los turnos seleccionados."
      />
    );
  }
  return (
    <>
      <ResumenReporte resultado={resultado} />
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Comandas cerradas por día y turno</CardTitle>
            <CardDescription>
              Detalle de comandas cerradas, importe total y ticket promedio por turno.
            </CardDescription>
          </div>
          <ExportButton filas={resultado.grupos} nombreArchivo="comandas-por-turno" />
        </CardHeader>
        <CardContent>
          <DataTable
            columnas={COLUMNAS}
            filas={resultado.grupos}
            obtenerClave={(grupo) => `${grupo.fecha}-${grupo.turno}`}
            vacio={
              <EmptyState icono={Inbox} titulo="Sin resultados" descripcion="No hay turnos." />
            }
          />
        </CardContent>
      </Card>
    </>
  );
}

export function ReporteComandasPage() {
  const reporte = useReporteComandas();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { etiqueta: 'Reportes', ruta: '/reportes' },
          { etiqueta: 'Comandas y ticket promedio' },
        ]}
      />
      <PageHeader
        titulo="Comandas y ticket promedio por día/turno"
        descripcion="Cantidad de comandas cerradas, importe total y ticket promedio por turno."
      />
      <FilterBar>
        <FiltrosReporte reporte={reporte} />
      </FilterBar>
      {reporte.error && <Alert variant="warning">{reporte.error}</Alert>}
      {!reporte.resultado && !reporte.cargando && !reporte.error && (
        <EmptyState
          icono={ChartColumn}
          titulo="Elegí el período y presioná Generar"
          descripcion="El resumen de comandas del período se muestra acá."
        />
      )}
      {reporte.resultado && <ResultadoReporte resultado={reporte.resultado} />}
    </div>
  );
}
