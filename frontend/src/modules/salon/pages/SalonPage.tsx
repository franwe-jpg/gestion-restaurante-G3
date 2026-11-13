import { Plus } from 'lucide-react';

import { useSesion } from '../../../shared/auth/useSesion';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { DialogosSalon } from '../components/DialogosSalon';
import { SeccionesDelSalon } from '../components/SeccionesDelSalon';
import { useBajaSector } from '../components/useBajaSector';
import { useDialogosDelSalon } from '../components/useDialogosDelSalon';
import { useSectoresDelSalon } from '../components/useSectoresDelSalon';
import type { Mesa, Mozo, Chef } from '../types';

const TITULO = 'Salón, Mozos y Chefs';
const DESCRIPCION = 'Mapa de mesas, distribución de sectores y gestión de mozos y chefs.';

type Dialogos = ReturnType<typeof useDialogosDelSalon>;

/** Solo las ve quien tiene `SALON_GESTIONAR`. */
function AccionesDelSalon({ dialogos }: { dialogos: Dialogos }) {
  return (
    <>
      <Button variant="outline" onClick={() => dialogos.sector.abrir()}>
        Nuevo sector
      </Button>
      <Button variant="outline" onClick={() => dialogos.mesa.abrir()}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nueva mesa
      </Button>
      <Button onClick={() => dialogos.mozo.abrir()}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo mozo
      </Button>
      <Button onClick={() => dialogos.chef.abrir()}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo chef
      </Button>
    </>
  );
}

export function SalonPage() {
  const { puede } = useSesion();
  const gestiona = puede('SALON_GESTIONAR');
  const { sectores, cargando, error, recargar, paginacion } = useSectoresDelSalon();
  const { eliminar } = useBajaSector({ onEliminado: recargar });
  const dialogos = useDialogosDelSalon(recargar);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={TITULO}
        descripcion={DESCRIPCION}
        acciones={gestiona ? <AccionesDelSalon dialogos={dialogos} /> : undefined}
      />
      <SeccionesDelSalon
        gestiona={gestiona}
        puedeAbrirComanda={puede('COMANDAS_OPERAR')}
        pestania={dialogos.pestania}
        onCambiarPestania={dialogos.setPestania}
        refrescoMesas={dialogos.refrescos.mesas}
        refrescoMozos={dialogos.refrescos.mozos}
        refrescoChefs={dialogos.refrescos.chefs}
        sectores={sectores}
        cargando={cargando}
        error={error}
        paginacion={paginacion}
        onReintentar={recargar}
        onEditarSector={dialogos.sector.abrir}
        onEliminar={(sector) => void eliminar(sector)}
        onEditarMesa={(mesa: Mesa) => dialogos.mesa.abrir(mesa)}
        onEditarMozo={(mozo: Mozo) => dialogos.mozo.abrir(mozo)}
        onEditarChef={(chef: Chef) => dialogos.chef.abrir(chef)}
      />
      {gestiona && <DialogosSalon dialogos={dialogos} />}
    </div>
  );
}
