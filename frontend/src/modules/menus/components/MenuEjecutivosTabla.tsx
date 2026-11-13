import { BookOpen } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { formatearMoneda } from '../../../shared/lib/format';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import type { MenuEjecutivo } from '../types';

import { AccionesMenuEjecutivo } from './AccionesMenuEjecutivo';

interface MenuEjecutivosTablaProps {
  menus: MenuEjecutivo[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  /** Sin `onEditar` y `onDadoDeBaja` (rol sin permiso de gestion) no hay columna de acciones. */
  onEditar?: (menu: MenuEjecutivo) => void;
  onDadoDeBaja?: () => void;
}

function incluidos(menu: MenuEjecutivo) {
  return (
    <div className="flex max-w-64 flex-wrap gap-1">
      {menu.productos.map((producto) => (
        <Badge key={producto.id} variant="neutral">
          {producto.nombre}
        </Badge>
      ))}
    </div>
  );
}

function columnas(
  onEditar?: (menu: MenuEjecutivo) => void,
  onDadoDeBaja?: () => void,
): ColumnaTabla<MenuEjecutivo>[] {
  const base: ColumnaTabla<MenuEjecutivo>[] = [
    { clave: 'nombre', encabezado: 'Nombre', render: (menu) => menu.nombre },
    { clave: 'seccion', encabezado: 'Sección', render: (menu) => menu.seccion.nombre },
    { clave: 'productos', encabezado: 'Incluye', render: incluidos },
    {
      clave: 'precio',
      encabezado: 'Precio fijo',
      render: (menu) => formatearMoneda(Number(menu.precio_fijo)),
      className: 'text-right whitespace-nowrap',
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (menu) => <StatusBadge estado={menu.estado} />,
    },
  ];
  if (!onEditar || !onDadoDeBaja) return base;
  return [
    ...base,
    {
      clave: 'acciones',
      encabezado: <span className="sr-only">Acciones</span>,
      render: (menu) => (
        <AccionesMenuEjecutivo menu={menu} onEditar={onEditar} onDadoDeBaja={onDadoDeBaja} />
      ),
      className: 'w-24',
    },
  ];
}

export function MenuEjecutivosTabla({
  menus,
  cargando,
  error,
  onReintentar,
  onEditar,
  onDadoDeBaja,
}: MenuEjecutivosTablaProps) {
  return (
    <DataTable
      columnas={columnas(onEditar, onDadoDeBaja)}
      filas={menus}
      obtenerClave={(menu) => menu.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={BookOpen}
          titulo="Todavía no hay menús ejecutivos"
          descripcion="Creá un menú con precio fijo y productos habilitados."
        />
      }
    />
  );
}
