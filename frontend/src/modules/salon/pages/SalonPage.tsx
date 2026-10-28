import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import { Tabs } from '../../../shared/components/ui/tabs';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';

import { MesaFormDialog } from '../components/MesaFormDialog';
import { MesasTabla } from '../components/MesasTabla';
import { SectorFormDialog } from '../components/SectorFormDialog';
import { SectoresTabla } from '../components/SectoresTabla';
import { useBajaSector } from '../components/useBajaSector';
import { useMesasDelSalon } from '../components/useMesasDelSalon';
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

interface SeccionListadoProps {
  paginacion: EstadoPaginacion;
  children: ReactNode;
}

function SeccionListado({ paginacion, children }: SeccionListadoProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        {children}
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

interface SeccionSectoresProps {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  paginacion: EstadoPaginacion;
  onReintentar: () => void;
  onEditar: (sector: Sector) => void;
  onEliminar: (sector: Sector) => void;
}

function SeccionSectores({ paginacion, ...tabla }: SeccionSectoresProps) {
  return (
    <SeccionListado paginacion={paginacion}>
      <SectoresTabla {...tabla} />
    </SeccionListado>
  );
}

function SeccionMesas({ refresco }: { refresco: number }) {
  const { mesas, cargando, error, recargar, paginacion } = useMesasDelSalon(refresco);

  return (
    <SeccionListado paginacion={paginacion}>
      <MesasTabla mesas={mesas} cargando={cargando} error={error} onReintentar={recargar} />
    </SeccionListado>
  );
}

interface SeccionesDelSalonProps extends SeccionSectoresProps {
  pestania: string;
  refrescoMesas: number;
  onCambiarPestania: (id: string) => void;
}

function SeccionesDelSalon({
  pestania,
  onCambiarPestania,
  refrescoMesas,
  ...sectores
}: SeccionesDelSalonProps) {
  return (
    <Tabs
      valor={pestania}
      onCambiar={onCambiarPestania}
      items={[
        { id: 'sectores', etiqueta: 'Sectores', contenido: <SeccionSectores {...sectores} /> },
        { id: 'mesas', etiqueta: 'Mesas', contenido: <SeccionMesas refresco={refrescoMesas} /> },
      ]}
    />
  );
}

interface DialogosSalonProps {
  sectorAbierto: boolean;
  sectorEnEdicion: Sector | null;
  mesaAbierta: boolean;
  onSectorOpenChange: (abierto: boolean) => void;
  onGuardadoSector: () => void;
  onMesaOpenChange: (abierto: boolean) => void;
  onMesaCreada: () => void;
  onCrearSectorDesdeMesa: () => void;
}

function DialogosSalon({
  sectorAbierto,
  sectorEnEdicion,
  mesaAbierta,
  onSectorOpenChange,
  onGuardadoSector,
  onMesaOpenChange,
  onMesaCreada,
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
          onCreado={onMesaCreada}
          onOpenChange={onMesaOpenChange}
          onCrearSector={onCrearSectorDesdeMesa}
        />
      )}
    </>
  );
}

function useDialogosDelSalon(recargar: () => void) {
  const [sectorAbierto, setSectorAbierto] = useState(false);
  const [sectorEnEdicion, setSectorEnEdicion] = useState<Sector | null>(null);
  const [mesaAbierta, setMesaAbierta] = useState(false);
  const [pestania, setPestania] = useState('sectores');
  const [refrescoMesas, setRefrescoMesas] = useState(0);

  const abrirSector = (sector: Sector | null = null) => {
    setSectorEnEdicion(sector);
    setSectorAbierto(true);
  };

  const alGuardarSector = () => {
    setSectorAbierto(false);
    recargar();
  };

  const alCrearMesa = () => {
    setMesaAbierta(false);
    setPestania('mesas');
    setRefrescoMesas((previa) => previa + 1);
  };

  return {
    sectorAbierto,
    sectorEnEdicion,
    mesaAbierta,
    setSectorAbierto,
    setMesaAbierta,
    abrirSector,
    alGuardarSector,
    alCrearMesa,
    pestania,
    setPestania,
    refrescoMesas,
  };
}

export function SalonPage() {
  const { sectores, cargando, error, recargar, paginacion } = useSectoresDelSalon();
  const { eliminar } = useBajaSector({ onEliminado: recargar });
  const dialogos = useDialogosDelSalon(recargar);

  const abrirSectorDesdeMesa = () => {
    dialogos.setMesaAbierta(false);
    dialogos.abrirSector();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={TITULO}
        descripcion={DESCRIPCION}
        acciones={
          <AccionesDelSalon
            onNuevoSector={() => dialogos.abrirSector()}
            onNuevaMesa={() => dialogos.setMesaAbierta(true)}
          />
        }
      />
      <SeccionesDelSalon
        pestania={dialogos.pestania}
        onCambiarPestania={dialogos.setPestania}
        refrescoMesas={dialogos.refrescoMesas}
        sectores={sectores}
        cargando={cargando}
        error={error}
        paginacion={paginacion}
        onReintentar={recargar}
        onEditar={dialogos.abrirSector}
        onEliminar={(sector) => void eliminar(sector)}
      />
      <DialogosSalon
        sectorAbierto={dialogos.sectorAbierto}
        sectorEnEdicion={dialogos.sectorEnEdicion}
        mesaAbierta={dialogos.mesaAbierta}
        onSectorOpenChange={dialogos.setSectorAbierto}
        onGuardadoSector={dialogos.alGuardarSector}
        onMesaOpenChange={dialogos.setMesaAbierta}
        onMesaCreada={dialogos.alCrearMesa}
        onCrearSectorDesdeMesa={abrirSectorDesdeMesa}
      />
    </div>
  );
}
