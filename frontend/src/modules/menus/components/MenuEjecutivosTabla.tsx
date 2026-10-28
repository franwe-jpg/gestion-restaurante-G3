import { BookOpen } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { formatearMoneda } from '../../../shared/lib/format';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import type { MenuEjecutivo } from '../types';

interface MenuEjecutivosTablaProps {
  menus: MenuEjecutivo[];
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

function incluidos(menu: MenuEjecutivo) {
  return (
    <div className="flex flex-wrap gap-1">
      {menu.productos.map((producto) => (
        <span key={producto.id} className="rounded-full bg-slate-100 px-2 py-1 text-xs">
          {producto.nombre}
        </span>
      ))}
    </div>
  );
}

function etiquetaEstado(estado: MenuEjecutivo['estado']) {
  return estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado';
}

const COLUMNAS: ColumnaTabla<MenuEjecutivo>[] = [
  { clave: 'nombre', encabezado: 'Nombre', render: (menu) => menu.nombre },
  { clave: 'seccion', encabezado: 'Sección', render: (menu) => menu.seccion.nombre },
  { clave: 'productos', encabezado: 'Incluye', render: incluidos },
  {
    clave: 'precio',
    encabezado: 'Precio fijo',
    render: (menu) => formatearMoneda(Number(menu.precio_fijo)),
  },
  { clave: 'estado', encabezado: 'Estado', render: (menu) => etiquetaEstado(menu.estado) },
];

export function MenuEjecutivosTabla({
  menus,
  cargando,
  error,
  onReintentar,
}: MenuEjecutivosTablaProps) {
  return (
    <DataTable
      columnas={COLUMNAS}
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
