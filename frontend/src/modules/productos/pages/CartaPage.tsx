import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Breadcrumbs } from '../../../shared/components/ui/breadcrumbs';
import { useApi } from '../../../shared/hooks/useApi';
import { obtenerCarta } from '../api';
import { CartaVista } from '../components/CartaVista';
import { SelectorEstado } from '../components/SelectorEstado';
import type { FiltroEstado } from '../types';

export function CartaPage() {
  // El filtro vive en el estado, no en la URL: al abrir la carta siempre arranca en Habilitados.
  const [estado, setEstado] = useState<FiltroEstado>('HABILITADO');
  const carta = useApi(() => obtenerCarta(estado), `carta-${estado}`);

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[{ etiqueta: 'Productos y Carta', ruta: '/productos' }, { etiqueta: 'Carta' }]}
      />
      <PageHeader
        titulo="Carta"
        descripcion="Secciones y productos tal como se muestran al cliente."
      />
      <SelectorEstado estado={estado} onCambiar={setEstado} />
      <CartaVista
        secciones={carta.datos ?? []}
        filtro={estado}
        cargando={carta.cargando}
        error={carta.error}
        onReintentar={carta.recargar}
      />
    </div>
  );
}
