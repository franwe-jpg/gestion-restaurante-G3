import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';

import { MesaFormDialog } from '../components/MesaFormDialog';
import { SectorFormDialog } from '../components/SectorFormDialog';
import { SectoresTabla } from '../components/SectoresTabla';
import { useSectoresDelSalon } from '../components/useSectoresDelSalon';
import type { Sector } from '../types';

const TITULO = 'Salón y Mozos';
const DESCRIPCION = 'Mapa de mesas, distribución de sectores y asignación de mozos por turno.';

function AccionesDelSalon({
  onNuevoSector,
  onNuevaMesa,
}: {
  onNuevoSector: () => void;
  onNuevaMesa: () => void;
}) {
  return (
    <>
      <Button variant="outline" onClick={onNuevoSector}>
        Nuevo sector
      </Button>
      <Button onClick={onNuevaMesa}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nueva mesa
      </Button>
    </>
  );
}

interface SeccionSectoresProps {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  paginacion: EstadoPaginacion;
  onReintentar: () => void;
  onEditar: (sector: Sector) => void;
}

function SeccionSectores({
  sectores,
  cargando,
  error,
  paginacion,
  onReintentar,
  onEditar,
}: SeccionSectoresProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <SectoresTabla
          sectores={sectores}
          cargando={cargando}
          error={error}
          onReintentar={onReintentar}
          onEditar={onEditar}
        />
        {paginacion.totalPaginas > 1 && (
          <Pagination
            className="mt-4"
            pagina={paginacion.pagina}
            totalPaginas={paginacion.totalPaginas}
            onCambiarPagina={paginacion.irAPagina}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface DialogosSalonProps {
  sectorAbierto: boolean;
  sectorEnEdicion: Sector | null;
  mesaAbierta: boolean;
  onSectorOpenChange: (abierto: boolean) => void;
  onGuardadoSector: () => void;
  onMesaOpenChange: (abierto: boolean) => void;
  onCrearSectorDesdeMesa: () => void;
}

function DialogosSalon({
  sectorAbierto,
  sectorEnEdicion,
  mesaAbierta,
  onSectorOpenChange,
  onGuardadoSector,
  onMesaOpenChange,
  onCrearSectorDesdeMesa,
}: DialogosSalonProps) {
  return (
    <>
      {sectorAbierto && (
        <SectorFormDialog
          sector={sectorEnEdicion}
          onGuardado={onGuardadoSector}
          onOpenChange={onSectorOpenChange}
        />
      )}
      {mesaAbierta && (
        <MesaFormDialog
          onCreado={() => onMesaOpenChange(false)}
          onOpenChange={onMesaOpenChange}
          onCrearSector={onCrearSectorDesdeMesa}
        />
      )}
    </>
  );
}

export function SalonPage() {
  const [sectorAbierto, setSectorAbierto] = useState(false);
  const [sectorEnEdicion, setSectorEnEdicion] = useState<Sector | null>(null);
  const [mesaAbierta, setMesaAbierta] = useState(false);
  const { sectores, cargando, error, recargar, paginacion } = useSectoresDelSalon();

  const abrirSector = (sector: Sector | null = null) => {
    setSectorEnEdicion(sector);
    setSectorAbierto(true);
  };

  const abrirSectorDesdeMesa = () => {
    setMesaAbierta(false);
    abrirSector();
  };

  const alGuardarSector = () => {
    setSectorAbierto(false);
    recargar();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={TITULO}
        descripcion={DESCRIPCION}
        acciones={
          <AccionesDelSalon
            onNuevoSector={() => abrirSector()}
            onNuevaMesa={() => setMesaAbierta(true)}
          />
        }
      />
      <SeccionSectores
        sectores={sectores}
        cargando={cargando}
        error={error}
        paginacion={paginacion}
        onReintentar={recargar}
        onEditar={abrirSector}
      />
      <DialogosSalon
        sectorAbierto={sectorAbierto}
        sectorEnEdicion={sectorEnEdicion}
        mesaAbierta={mesaAbierta}
        onSectorOpenChange={setSectorAbierto}
        onGuardadoSector={alGuardarSector}
        onMesaOpenChange={setMesaAbierta}
        onCrearSectorDesdeMesa={abrirSectorDesdeMesa}
      />
    </div>
  );
}
