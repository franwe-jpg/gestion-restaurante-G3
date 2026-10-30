import { Link } from 'react-router-dom';
import {
  UtensilsCrossed,
  BookOpen,
  Users,
  ClipboardList,
  CalendarDays,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';

const modulosAccesoRapido = [
  {
    ruta: '/productos',
    titulo: 'Productos y Carta',
    descripcion: 'Gestión de platos, bebidas, alérgenos y precios.',
    icono: UtensilsCrossed,
  },
  {
    ruta: '/menus',
    titulo: 'Menús y Promociones',
    descripcion: 'Combos, menú ejecutivo y descuentos de turno.',
    icono: BookOpen,
  },
  {
    ruta: '/salon',
    titulo: 'Salón y Mozos',
    descripcion: 'Distribución de mesas, zonas y asignación de personal.',
    icono: Users,
  },
  {
    ruta: '/atencion',
    titulo: 'Atención al Público',
    descripcion: 'Comandas activas, comandas en cocina y servicio en curso.',
    icono: ClipboardList,
  },
  {
    ruta: '/reservas',
    titulo: 'Reservas',
    descripcion: 'Agenda de turnos, confirmaciones y clientes habituales.',
    icono: CalendarDays,
  },
  {
    ruta: '/pagos',
    titulo: 'Pagos',
    descripcion: 'Cierre de cuenta, arqueo de caja y facturación.',
    icono: CreditCard,
  },
];

export function Inicio() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Panel de Administración"
        descripcion="Sistema de gestión gastronómica. Seleccioná un módulo para operar."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modulosAccesoRapido.map((modulo) => {
          const Icono = modulo.icono;
          return (
            <Link
              key={modulo.ruta}
              to={modulo.ruta}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded-lg"
            >
              <Card className="h-full transition-all group-hover:border-slate-300 group-hover:shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800">
                      <Icono className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600" />
                  </div>
                  <CardTitle className="pt-2 text-base">{modulo.titulo}</CardTitle>
                  <CardDescription>{modulo.descripcion}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs font-medium text-amber-800 group-hover:underline">
                    Acceder al módulo
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
