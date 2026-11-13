import type { ComponentType } from 'react';

import type { Permiso } from '../../auth/permisos';

import {
  BookOpen,
  CalendarDays,
  BarChart3,
  ClipboardList,
  CreditCard,
  UtensilsCrossed,
  Users,
} from 'lucide-react';

export interface ElementoNavegacion {
  nombre: string;
  ruta: string;
  icono: ComponentType<{ className?: string }>;
  /** Permiso de VER la pantalla; sin el, la entrada no aparece en el menu. */
  permiso: Permiso;
}

export const ELEMENTOS_NAVEGACION: ElementoNavegacion[] = [
  { nombre: 'Productos y Carta', ruta: '/productos', icono: UtensilsCrossed, permiso: 'CARTA_VER' },
  { nombre: 'Menús y Promociones', ruta: '/menus', icono: BookOpen, permiso: 'MENUS_VER' },
  { nombre: 'Salón, Mozos y Chefs', ruta: '/salon', icono: Users, permiso: 'SALON_VER' },
  {
    nombre: 'Atención al Público',
    ruta: '/atencion',
    icono: ClipboardList,
    permiso: 'COMANDAS_VER',
  },
  { nombre: 'Reservas', ruta: '/reservas', icono: CalendarDays, permiso: 'RESERVAS_VER' },
  { nombre: 'Pagos', ruta: '/pagos', icono: CreditCard, permiso: 'PAGOS_OPERAR' },
  { nombre: 'Reportes', ruta: '/reportes', icono: BarChart3, permiso: 'REPORTES_VER' },
];
