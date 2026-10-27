import { CalendarDays, Pencil, Trash2 } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { Badge } from '../../../shared/components/ui/badge';
import { Button } from '../../../shared/components/ui/button';
import { DataTable } from '../../../shared/components/ui/data-table';
import type { ColumnaTabla } from '../../../shared/components/ui/data-table';
import { formatearMoneda } from '../../../shared/lib/format';
import type { MenuDelDiaListado } from '../types';

export interface MenuDelDiaTablaProps {
  menus: MenuDelDiaListado[];
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onEditar: (menu: MenuDelDiaListado) => void;
  onDarDeBaja: (menu: MenuDelDiaListado) => void;
}

type Acciones = Pick<MenuDelDiaTablaProps, 'onEditar' | 'onDarDeBaja'>;

function columnasDeDatos(): ColumnaTabla<MenuDelDiaListado>[] {
  return [
    { clave: 'nombre', encabezado: 'Nombre', render: (menu) => menu.nombre },
    {
      clave: 'descripcion',
      encabezado: 'Descripción',
      render: (menu) => menu.descripcion ?? <span className="text-slate-400">—</span>,
    },
    { clave: 'seccion', encabezado: 'Sección', render: (menu) => menu.seccion.nombre },
    {
      clave: 'precio',
      encabezado: 'Precio',
      className: 'text-right',
      render: (menu) => formatearMoneda(Number(menu.precio)),
    },
    {
      clave: 'estado',
      encabezado: 'Estado',
      render: (menu) => (
        <Badge variant={menu.estado === 'HABILITADO' ? 'success' : 'neutral'}>
          {menu.estado === 'HABILITADO' ? 'Habilitado' : 'Deshabilitado'}
        </Badge>
      ),
    },
  ];
}

function columnaAcciones({ onEditar, onDarDeBaja }: Acciones): ColumnaTabla<MenuDelDiaListado> {
  return {
    clave: 'acciones',
    encabezado: <span className="sr-only">Acciones</span>,
    className: 'text-right',
    render: (menu) => (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Modificar ${menu.nombre}`}
          onClick={() => onEditar(menu)}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Dar de baja ${menu.nombre}`}
          disabled={menu.estado === 'DESHABILITADO'}
          onClick={() => onDarDeBaja(menu)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    ),
  };
}

export function MenuDelDiaTabla({
  menus,
  cargando = false,
  error = null,
  onReintentar,
  onEditar,
  onDarDeBaja,
}: MenuDelDiaTablaProps) {
  return (
    <DataTable
      columnas={[...columnasDeDatos(), columnaAcciones({ onEditar, onDarDeBaja })]}
      filas={menus}
      obtenerClave={(menu) => menu.id}
      cargando={cargando}
      error={error}
      onReintentar={onReintentar}
      vacio={
        <EmptyState
          icono={CalendarDays}
          titulo="Sin menús del día"
          descripcion="Todavía no hay menús del día cargados en esta lista."
        />
      }
    />
  );
}
