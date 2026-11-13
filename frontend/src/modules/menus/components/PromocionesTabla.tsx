import { Sparkles } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { DiaSemana, Promocion, TipoPromocion } from '../types';

import { AccionesPromocion } from './AccionesPromocion';

interface PromocionesTablaProps {
  promociones: Promocion[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  /** Sin `onEditar` y `onFinalizada` (rol sin permiso de gestion) no hay columna de acciones. */
  onEditar?: (promocion: Promocion) => void;
  onFinalizada?: () => void;
}

const TIPO: Record<TipoPromocion, string> = {
  PORCENTAJE: 'Porcentaje',
  PRECIO_FIJO: 'Precio fijo',
  NXM: 'Cantidad NxM',
};

const DIA: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

function fechaCorta(fecha: string): string {
  return fecha.split('-').reverse().join('/');
}

function vigencia(promocion: Promocion): string {
  return `${fechaCorta(promocion.fecha_desde)} – ${fechaCorta(promocion.fecha_hasta)}`;
}

function dias(promocion: Promocion): string {
  return promocion.dias_semana.map((dia) => DIA[dia]).join(', ');
}

function horario(promocion: Promocion): string {
  if (promocion.hora_desde === null || promocion.hora_hasta === null) return 'Todo el día';
  return `${promocion.hora_desde} – ${promocion.hora_hasta}`;
}

function finalizacion(promocion: Promocion): string {
  if (promocion.fecha_hora_finalizacion === null) return '—';
  const [fecha = '', hora = ''] = promocion.fecha_hora_finalizacion.split('T');
  return `${fechaCorta(fecha)} ${hora.slice(0, 5)}`;
}

function estado(promocion: Promocion) {
  const habilitada = promocion.estado === 'HABILITADO';
  return (
    <Badge variant={habilitada ? 'success' : 'neutral'}>
      {habilitada ? 'Habilitada' : 'Deshabilitada'}
    </Badge>
  );
}

function columnas(
  onEditar?: (promocion: Promocion) => void,
  onFinalizada?: () => void,
): ColumnaTabla<Promocion>[] {
  const base: ColumnaTabla<Promocion>[] = [
    { clave: 'nombre', encabezado: 'Nombre', render: (promocion) => promocion.nombre },
    { clave: 'tipo', encabezado: 'Tipo', render: (promocion) => TIPO[promocion.tipo] },
    { clave: 'vigencia', encabezado: 'Vigencia', render: vigencia },
    { clave: 'dias', encabezado: 'Días', render: dias },
    { clave: 'horario', encabezado: 'Horario', render: horario },
    { clave: 'estado', encabezado: 'Estado', render: estado },
    { clave: 'finalizacion', encabezado: 'Finalización', render: finalizacion },
  ];
  if (!onEditar || !onFinalizada) return base;
  return [
    ...base,
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (promocion) => (
        <AccionesPromocion promocion={promocion} onEditar={onEditar} onFinalizada={onFinalizada} />
      ),
      className: 'w-24',
    },
  ];
}

export function PromocionesTabla({
  promociones,
  cargando,
  error,
  onReintentar,
  onEditar,
  onFinalizada,
}: PromocionesTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar, onFinalizada)}
      filas={promociones}
      obtenerClave={(promocion) => promocion.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={Sparkles}
          titulo="Todavía no hay promociones"
          descripcion="Creá una promoción con su vigencia, días y productos."
        />
      }
    />
  );
}
