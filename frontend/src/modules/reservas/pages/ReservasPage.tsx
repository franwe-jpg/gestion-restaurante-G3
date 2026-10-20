import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';

export function ReservasPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reservas"
        descripcion="Libro de reservas, turnos de almuerzo/cena y confirmación de comensales."
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={CalendarDays}
            titulo="Módulo pendiente de implementación"
            descripcion="La planilla y calendario de reservas se integrarán en esta sección."
          />
        </CardContent>
      </Card>
    </div>
  );
}
