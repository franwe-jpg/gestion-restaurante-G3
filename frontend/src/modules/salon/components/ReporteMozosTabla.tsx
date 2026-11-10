import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { formatearMoneda } from '../../../shared/lib/format';
import type { LineaReporteMozo } from '../types';

const COLUMNAS: ColumnaTabla<LineaReporteMozo>[] = [
  {
    clave: 'mozo',
    encabezado: 'Mozo',
    render: (linea) => `${linea.apellido}, ${linea.nombre}`,
  },
  {
    clave: 'mesas_atendidas',
    encabezado: 'Mesas atendidas',
    render: (linea) => linea.mesas_atendidas,
    className: 'text-right',
  },
  {
    clave: 'total_ventas',
    encabezado: 'Total ventas',
    render: (linea) => formatearMoneda(Number(linea.total_ventas)),
    className: 'text-right',
  },
  {
    clave: 'promedio_por_mesa',
    encabezado: 'Promedio por mesa',
    render: (linea) => formatearMoneda(Number(linea.promedio_por_mesa)),
    className: 'text-right',
  },
];

export interface ReporteMozosTablaProps {
  lineas: LineaReporteMozo[];
  cargando?: boolean;
}

export function ReporteMozosTabla({ lineas, cargando = false }: ReporteMozosTablaProps) {
  return (
    <DataTable
      columnas={COLUMNAS}
      filas={lineas}
      obtenerClave={(linea) => linea.mozo_id}
      cargando={cargando}
    />
  );
}
