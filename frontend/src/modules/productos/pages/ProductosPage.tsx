import { useState } from 'react';
import { Plus, UtensilsCrossed } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Tabs } from '../../../shared/components/ui/tabs';
import { EmptyState } from '../../../shared/components/EmptyState';
import { SeccionesTab } from '../components/SeccionesTab';

function ProductosPendientes() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button onClick={() => navigate('/productos/platos/nuevo')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo plato
        </Button>
        <Button onClick={() => navigate('/productos/postres/nuevo')}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo postre
        </Button>
      </div>
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

export function ProductosPage() {
  const [parametros] = useSearchParams();
  const [pestania, setPestania] = useState(
    parametros.get('pestania') === 'secciones' ? 'secciones' : 'productos',
  );

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
