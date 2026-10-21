import { BookOpen } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';

export function MenusPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Menús y Promociones"
        descripcion="Configuración de menús del día, combos promocionales y tarifas por turno."
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={BookOpen}
            titulo="Módulo pendiente de implementación"
            descripcion="El gestor de menús degustación y promociones estará disponible próximamente."
          />
        </CardContent>
      </Card>
    </div>
  );
}
