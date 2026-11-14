import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Tabs } from '../../../shared/components/ui/tabs';
import { MenuDelDiaTab, MenusEjecutivosTab, PromocionesTab } from '../components';

const PESTANAS = [
  { id: 'ejecutivos', etiqueta: 'Menús ejecutivos' },
  { id: 'dia', etiqueta: 'Menú del día' },
  { id: 'promociones', etiqueta: 'Promociones' },
];

export function MenusPage() {
  const [pestana, setPestana] = useState('ejecutivos');

  const contenido = {
    ejecutivos: <MenusEjecutivosTab />,
    dia: <MenuDelDiaTab />,
    promociones: <PromocionesTab />,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Menús y Promociones"
        descripcion="Menús del día, menús ejecutivos y promociones de la carta."
      />

      <Tabs
        items={PESTANAS.map((pestanaActual) => ({
          ...pestanaActual,
          contenido: contenido[pestanaActual.id as keyof typeof contenido],
        }))}
        valor={pestana}
        onCambiar={setPestana}
      />
    </div>
  );
}
