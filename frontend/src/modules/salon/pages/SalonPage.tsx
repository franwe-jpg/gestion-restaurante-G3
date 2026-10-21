import { Users } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';

export function SalonPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Salón y Mozos"
        descripcion="Mapa de mesas, distribución de sectores y asignación de mozos por turno."
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={Users}
            titulo="Módulo pendiente de implementación"
            descripcion="El plano interactivo del salón y la asignación de personal se desarrollarán aquí."
          />
        </CardContent>
      </Card>
    </div>
  );
}
