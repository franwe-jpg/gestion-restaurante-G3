import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { EmptyState } from '../../../shared/components/EmptyState';
import { PageHeader } from '../../../shared/components/PageHeader';

import { MesaFormDialog } from '../components/MesaFormDialog';
import { SectorFormDialog } from '../components/SectorFormDialog';

export function SalonPage() {
  const [dialogoSectorAbierto, setDialogoSectorAbierto] = useState(false);
  const [dialogoMesaAbierto, setDialogoMesaAbierto] = useState(false);

  const abrirSectorDesdeMesa = () => {
    setDialogoMesaAbierto(false);
    setDialogoSectorAbierto(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Salón y Mozos"
        descripcion="Mapa de mesas, distribución de sectores y asignación de mozos por turno."
        acciones={
          <>
            <Button variant="outline" onClick={() => setDialogoSectorAbierto(true)}>
              Nuevo sector
            </Button>
            <Button onClick={() => setDialogoMesaAbierto(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva mesa
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icono={Users}
            titulo="El listado de sectores llega con HU-M3-04"
            descripcion="La tabla de sectores se incorporará con esa historia; mesas y mozos se suman en las siguientes. Por ahora podés crear un sector desde «Nuevo sector» o una mesa desde «Nueva mesa»."
          />
        </CardContent>
      </Card>

      {dialogoSectorAbierto && (
        <SectorFormDialog
          onCreado={() => setDialogoSectorAbierto(false)}
          onOpenChange={setDialogoSectorAbierto}
        />
      )}

      {dialogoMesaAbierto && (
        <MesaFormDialog
          onCreado={() => setDialogoMesaAbierto(false)}
          onOpenChange={setDialogoMesaAbierto}
          onCrearSector={abrirSectorDesdeMesa}
        />
      )}
    </div>
  );
}
