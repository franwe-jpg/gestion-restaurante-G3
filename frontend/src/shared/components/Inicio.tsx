import { AccesosRapidos } from './inicio/AccesosRapidos';
import { EstadoDeCaja } from './inicio/EstadoDeCaja';
import { MapaDelLocal } from './inicio/MapaDelLocal';
import { PageHeader } from './PageHeader';

export function Inicio() {
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Panel de Administración"
        descripcion="Sistema de gestión gastronómica. Seleccioná un módulo para operar."
        acciones={<AccesosRapidos />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MapaDelLocal />
        </div>
        <EstadoDeCaja />
      </div>
    </div>
  );
}
