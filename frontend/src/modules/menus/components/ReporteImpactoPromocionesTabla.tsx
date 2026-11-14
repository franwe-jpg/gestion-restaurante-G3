import { Badge } from '../../../shared/components/ui/badge';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { LineaImpactoPromocion, UnidadPromedio } from '../types';

const NOTA_PROMOCIONAL = '100 % de las ventas fueron promocionales';

function formatearNumero(valor: string | null): string {
  if (valor === null) return '—';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(valor));
}

function formatearConSigno(valor: string | null): string {
  if (valor === null) return '—';
  const numero = Number(valor);
  const signo = numero > 0 ? '+' : '';
  return `${signo}${formatearNumero(valor)}`;
}

function formatearVariacion(valor: string | null): string {
  if (valor === null) return '—';
  return `${formatearConSigno(valor)} %`;
}

function sinVentasFuera(linea: LineaImpactoPromocion): boolean {
  return linea.promedio_fuera === '0.00' && Number(linea.promedio_durante ?? 0) > 0;
}

const COLUMNAS_BASE: ColumnaTabla<LineaImpactoPromocion>[] = [
  {
    clave: 'producto',
    encabezado: 'Producto',
    render: (linea) => (
      <span className="inline-flex items-center gap-2">
        {linea.nombre}
        {linea.estado === 'DESHABILITADO' && <Badge variant="danger">Deshabilitado</Badge>}
      </span>
    ),
  },
  {
    clave: 'dias_con_ventas_promocion',
    encabezado: 'Días con ventas promo',
    render: (linea) => linea.dias_con_ventas_promocion,
    className: 'text-right',
  },
  {
    clave: 'cantidad_durante',
    encabezado: 'Unid. con promo',
    render: (linea) => linea.cantidad_durante,
    className: 'text-right',
  },
  {
    clave: 'cantidad_fuera',
    encabezado: 'Unid. fuera',
    render: (linea) => linea.cantidad_fuera,
    className: 'text-right',
  },
];

function columnasComparacion(sufijo: string): ColumnaTabla<LineaImpactoPromocion>[] {
  return [
    {
      clave: 'promedio_durante',
      encabezado: `Prom. con promo (u/${sufijo})`,
      render: (linea) => formatearNumero(linea.promedio_durante),
      className: 'text-right',
    },
    {
      clave: 'promedio_fuera',
      encabezado: `Prom. fuera (u/${sufijo})`,
      render: (linea) => (
        <div className="text-right">
          <div>{formatearNumero(linea.promedio_fuera)}</div>
          {sinVentasFuera(linea) && (
            <div className="text-xs font-normal text-amber-700 dark:text-amber-300">
              {NOTA_PROMOCIONAL}
            </div>
          )}
        </div>
      ),
      className: 'text-right',
    },
    {
      clave: 'diferencia_promedio',
      encabezado: `Diferencia (u/${sufijo})`,
      render: (linea) => formatearConSigno(linea.diferencia_promedio),
      className: 'text-right',
    },
    {
      clave: 'impacto_estimado',
      encabezado: 'Impacto estimado (u.)',
      render: (linea) => formatearConSigno(linea.impacto_estimado),
      className: 'text-right',
    },
    {
      clave: 'variacion_porcentual',
      encabezado: 'Variación',
      render: (linea) => formatearVariacion(linea.variacion_porcentual),
      className: 'text-right',
    },
  ];
}

export interface ReporteImpactoPromocionesTablaProps {
  lineas: LineaImpactoPromocion[];
  unidad: UnidadPromedio;
  cargando?: boolean;
}

export function ReporteImpactoPromocionesTabla({
  lineas,
  unidad,
  cargando = false,
}: ReporteImpactoPromocionesTablaProps) {
  const sufijo = unidad === 'HORA' ? 'hora' : 'día';
  return (
    <DataTable
      columnas={[...COLUMNAS_BASE, ...columnasComparacion(sufijo)]}
      filas={lineas}
      obtenerClave={(linea) => linea.producto_id}
      cargando={cargando}
    />
  );
}
