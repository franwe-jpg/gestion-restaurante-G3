import { ClipboardList } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';

export function AtencionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atención al Público"
        descripcion="Toma de pedidos, seguimiento de comandas y estado de servicio en cocina."
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={ClipboardList}
            titulo="Módulo pendiente de implementación"
            descripcion="El flujo de comandas y órdenes de servicio se implementará en este panel."
          />
        </CardContent>
      </Card>
    </div>
  );
}
