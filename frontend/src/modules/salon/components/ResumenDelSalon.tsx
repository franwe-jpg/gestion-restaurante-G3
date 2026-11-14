import { Armchair, CircleOff, Hourglass, LayoutGrid } from 'lucide-react';

import { StatCard } from '../../../shared/components/ui/stat-card';
import type { Mesa, Sector } from '../types';

import { contarMesasPorEstado, contarSectoresHabilitados } from './conteosDelSalon';

export interface ResumenDelSalonProps {
  sectores: Sector[];
  mesas: Mesa[];
  cargando?: boolean;
}

/**
 * Estado del salón a golpe de vista: cuántos sectores están habilitados y cómo
 * están las mesas cargadas (libres, ocupadas o fuera de servicio).
 */
export function ResumenDelSalon({ sectores, mesas, cargando = false }: ResumenDelSalonProps) {
  const mostrar = (valor: number): number | string => (cargando ? '…' : valor);

  return (
    <section aria-label="Estado del salón">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          titulo="Sectores habilitados"
          valor={mostrar(contarSectoresHabilitados(sectores))}
          descripcion={`De ${sectores.length} sectores en total`}
          icono={LayoutGrid}
        />
        <StatCard
          titulo="Mesas libres"
          valor={mostrar(contarMesasPorEstado(mesas, 'LIBRE'))}
          descripcion={`De ${mesas.length} mesas cargadas`}
          icono={Armchair}
        />
        <StatCard
          titulo="Mesas ocupadas"
          valor={mostrar(contarMesasPorEstado(mesas, 'OCUPADA'))}
          descripcion="Con comanda en curso"
          icono={Hourglass}
        />
        <StatCard
          titulo="Mesas fuera de servicio"
          valor={mostrar(contarMesasPorEstado(mesas, 'FUERA_DE_SERVICIO'))}
          descripcion="No reciben comandas"
          icono={CircleOff}
        />
      </div>
    </section>
  );
}
