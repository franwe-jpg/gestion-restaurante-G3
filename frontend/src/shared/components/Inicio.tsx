import { useSesion } from '../auth/useSesion';

import { AccesosRapidos } from './inicio/AccesosRapidos';
import { EstadoDeCaja } from './inicio/EstadoDeCaja';
import { MapaDelLocal } from './inicio/MapaDelLocal';
import { PageHeader } from './PageHeader';

/** Cada bloque se monta solo si el rol puede leer sus datos: no se solicita lo prohibido. */
export function Inicio() {
  const { puede } = useSesion();
  const verMapa = puede('SALON_VER') && puede('RESERVAS_VER');
  const verCaja = puede('REPORTES_VER');

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Panel de Administración"
        descripcion="Sistema de gestión gastronómica. Seleccioná un módulo para operar."
        acciones={<AccesosRapidos />}
      />
      {!verMapa && !verCaja && (
        <p className="text-sm text-slate-600">Elegí un módulo del menú lateral para continuar.</p>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {verMapa && (
          <div className={verCaja ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <MapaDelLocal />
          </div>
        )}
        {verCaja && <EstadoDeCaja />}
      </div>
    </div>
  );
}
