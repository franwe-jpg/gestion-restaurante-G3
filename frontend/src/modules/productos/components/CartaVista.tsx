import { BookOpen } from 'lucide-react';

import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ui/error-state';
import { Spinner } from '../../../shared/components/ui/spinner';
import type { FiltroEstado, SeccionCarta } from '../types';

import { CartaNavegacion } from './CartaNavegacion';
import { CartaSeccion } from './CartaSeccion';

const CARTA_VACIA: Record<FiltroEstado, string> = {
  HABILITADO: 'No hay productos habilitados en la carta.',
  DESHABILITADO: 'No hay secciones ni productos dados de baja.',
  TODOS: 'No hay secciones cargadas.',
};

export interface CartaVistaProps {
  secciones: SeccionCarta[];
  filtro: FiltroEstado;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
}

export function CartaVista({ secciones, filtro, cargando, error, onReintentar }: CartaVistaProps) {
  if (cargando) return <Spinner etiqueta="Cargando carta..." />;
  if (error) {
    return (
      <ErrorState
        titulo="No se pudo cargar la carta."
        descripcion={error}
        onReintentar={onReintentar}
      />
    );
  }
  if (secciones.length === 0) {
    return (
      <EmptyState
        icono={BookOpen}
        titulo={CARTA_VACIA[filtro]}
        descripcion="Cambie el filtro para ver otros productos."
      />
    );
  }
  return (
    <div className="space-y-6">
      <CartaNavegacion secciones={secciones} />
      {secciones.map((seccion) => (
        <CartaSeccion key={seccion.id} seccion={seccion} filtro={filtro} />
      ))}
    </div>
  );
}
