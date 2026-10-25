import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Tabs } from '../../../shared/components/ui/tabs';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SeccionesTab } from '../components/SeccionesTab';

function ProductosPendientes() {
  return (
    <Card>
      <CardContent className="pt-6">
        <EmptyState
          icono={UtensilsCrossed}
          titulo="Módulo pendiente de implementación"
          descripcion="El catálogo de productos y gestión de carta se integrará en la siguiente fase de desarrollo."
        />
      </CardContent>
    </Card>
  );
}

export function ProductosPage() {
  const [pestania, setPestania] = useState('productos');

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Productos y Carta"
        descripcion="Administración de platos, bebidas, recetas y disponibilidad en carta."
      />

      <Tabs
        valor={pestania}
        onCambiar={setPestania}
        items={[
          { id: 'productos', etiqueta: 'Productos', contenido: <ProductosPendientes /> },
          { id: 'secciones', etiqueta: 'Secciones', contenido: <SeccionesTab /> },
        ]}
      />
    </div>
  );
}
