import { CreditCard } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';

export function PagosPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Pagos"
        descripcion="Facturación, arqueo de caja diaria, medios de cobro y propinas."
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={CreditCard}
            titulo="Módulo pendiente de implementación"
            descripcion="Las funciones de cobro, conciliación y pasarela de pagos se añadirán aquí."
          />
        </CardContent>
      </Card>
    </div>
  );
}
