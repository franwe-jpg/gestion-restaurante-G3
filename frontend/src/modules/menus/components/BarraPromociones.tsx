import type { ReactNode } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { TableToolbar } from '../../../shared/components/ui/table-toolbar';

interface BarraPromocionesProps {
  /** Sin `onNueva` (rol sin permiso de gestion) no se muestra el boton de alta. */
  onNueva?: () => void;
  /** Acciones adicionales de la barra, como la exportación del listado. */
  acciones?: ReactNode;
}

export function BarraPromociones({ onNueva, acciones }: BarraPromocionesProps) {
  return (
    <TableToolbar
      acciones={
        <>
          {acciones}
          {onNueva && (
            <Button variant="brand-outline" onClick={onNueva}>
              Nueva promoción
            </Button>
          )}
        </>
      }
    >
      {null}
    </TableToolbar>
  );
}
