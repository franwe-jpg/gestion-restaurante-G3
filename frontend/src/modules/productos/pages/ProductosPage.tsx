import { UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';

export function ProductosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Productos y Carta"
        descripcion="Administración de platos, bebidas, recetas y disponibilidad en carta."
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={UtensilsCrossed}
            titulo="Módulo pendiente de implementación"
            descripcion="El catálogo de productos y gestión de carta se integrará en la siguiente fase de desarrollo."
          />
        </CardContent>
      </Card>
    </div>
  );
}
