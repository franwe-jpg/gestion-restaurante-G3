import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Tabs } from '../../../shared/components/ui/tabs';
import { ProductosTab } from '../components/ProductosTab';
import { SeccionesTab } from '../components/SeccionesTab';

export function ProductosPage() {
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [pestania, setPestania] = useState(
    parametros.get('pestania') === 'secciones' ? 'secciones' : 'productos',
  );

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Productos y Carta"
        descripcion="Administración de platos, bebidas, recetas y disponibilidad en carta."
        acciones={
          <Button variant="outline" onClick={() => navigate('/productos/carta')}>
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Ver carta
          </Button>
        }
      />

      <Tabs
        valor={pestania}
        onCambiar={setPestania}
        items={[
          { id: 'productos', etiqueta: 'Productos', contenido: <ProductosTab /> },
          { id: 'secciones', etiqueta: 'Secciones', contenido: <SeccionesTab /> },
        ]}
      />
    </div>
  );
}
