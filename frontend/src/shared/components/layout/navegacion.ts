import type { ComponentType } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  UtensilsCrossed,
  Users,
} from 'lucide-react';

export interface ElementoNavegacion {
  nombre: string;
  ruta: string;
  icono: ComponentType<{ className?: string }>;
}

export const ELEMENTOS_NAVEGACION: ElementoNavegacion[] = [
  { nombre: 'Productos y Carta', ruta: '/productos', icono: UtensilsCrossed },
  { nombre: 'Menús y Promociones', ruta: '/menus', icono: BookOpen },
  { nombre: 'Salón y Mozos', ruta: '/salon', icono: Users },
  { nombre: 'Atención al Público', ruta: '/atencion', icono: ClipboardList },
  { nombre: 'Reservas', ruta: '/reservas', icono: CalendarDays },
  { nombre: 'Pagos', ruta: '/pagos', icono: CreditCard },
];
