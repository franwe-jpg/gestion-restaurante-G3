import { ChefFormDialog } from './ChefFormDialog';
import { MesaFormDialog } from './MesaFormDialog';
import { MozoFormDialog } from './MozoFormDialog';
import { SectorFormDialog } from './SectorFormDialog';
import type { useDialogosDelSalon } from './useDialogosDelSalon';

export type DialogosDelSalon = ReturnType<typeof useDialogosDelSalon>;

/** Los cuatro diálogos de alta y edición; se montan solo mientras están abiertos. */
export function DialogosSalon({ dialogos }: { dialogos: DialogosDelSalon }) {
  const { sector, mesa, mozo, chef } = dialogos;

  return (
    <>
      {sector.abierto && (
        <SectorFormDialog
          sector={sector.enEdicion}
          onGuardado={dialogos.alGuardarSector}
          onOpenChange={sector.setAbierto}
        />
      )}
      {mesa.abierto && (
        <MesaFormDialog
          mesa={mesa.enEdicion}
          onGuardado={dialogos.alGuardarMesa}
          onOpenChange={mesa.setAbierto}
          onCrearSector={dialogos.abrirSectorDesdeMesa}
        />
      )}
      {mozo.abierto && (
        <MozoFormDialog
          mozo={mozo.enEdicion}
          onGuardado={dialogos.alGuardarMozo}
          onOpenChange={mozo.setAbierto}
        />
      )}
      {chef.abierto && (
        <ChefFormDialog
          chef={chef.enEdicion}
          onGuardado={dialogos.alGuardarChef}
          onOpenChange={chef.setAbierto}
        />
      )}
    </>
  );
}
