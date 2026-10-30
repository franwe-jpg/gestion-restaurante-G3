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
import { useBajaMesa } from '../components/useBajaMesa';
import { useBajaSector } from '../components/useBajaSector';
import { useMesasDelSalon } from '../components/useMesasDelSalon';
import { useSectoresDelSalon } from '../components/useSectoresDelSalon';
import type { Mesa, Sector } from '../types';

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

function SeccionMesas({
  refresco,
  onEditar,
}: {
  refresco: number;
  onEditar: (mesa: Mesa) => void;
}) {
  const { mesas, cargando, error, recargar, paginacion } = useMesasDelSalon(refresco);
  const { eliminar } = useBajaMesa({ onEliminada: recargar });

  return (
    <SeccionListado paginacion={paginacion}>
      <MesasTabla
        mesas={mesas}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={onEditar}
        onEliminar={(mesa) => void eliminar(mesa)}
      />
    </SeccionListado>
  );
}

interface SeccionesDelSalonProps extends SeccionSectoresProps {
  pestania: string;
  refrescoMesas: number;
  onCambiarPestania: (id: string) => void;
  onEditarMesa: (mesa: Mesa) => void;
}

function SeccionesDelSalon({
  pestania,
  onCambiarPestania,
  refrescoMesas,
  onEditarMesa,
  ...sectores
}: SeccionesDelSalonProps) {
  return (
    <Tabs
      valor={pestania}
      onCambiar={onCambiarPestania}
      items={[
        { id: 'sectores', etiqueta: 'Sectores', contenido: <SeccionSectores {...sectores} /> },
        {
          id: 'mesas',
          etiqueta: 'Mesas',
          contenido: <SeccionMesas refresco={refrescoMesas} onEditar={onEditarMesa} />,
        },
      ]}
    />
  );
}

interface DialogosSalonProps {
  sectorAbierto: boolean;
  sectorEnEdicion: Sector | null;
  mesaAbierta: boolean;
  mesaEnEdicion: Mesa | null;
  onSectorOpenChange: (abierto: boolean) => void;
  onGuardadoSector: () => void;
  onMesaOpenChange: (abierto: boolean) => void;
  onMesaGuardada: () => void;
  onCrearSectorDesdeMesa: () => void;
}

function DialogosSalon({
  sectorAbierto,
  sectorEnEdicion,
  mesaAbierta,
  mesaEnEdicion,
  onSectorOpenChange,
  onGuardadoSector,
  onMesaOpenChange,
  onMesaGuardada,
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
          mesa={mesaEnEdicion}
          onGuardado={onMesaGuardada}
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
  const [mesaEnEdicion, setMesaEnEdicion] = useState<Mesa | null>(null);
  const [pestania, setPestania] = useState('sectores');
  const [refrescoMesas, setRefrescoMesas] = useState(0);

  const abrirSector = (sector: Sector | null = null) => {
    setSectorEnEdicion(sector);
    setSectorAbierto(true);
  };

  const abrirMesa = (mesa: Mesa | null = null) => {
    setMesaEnEdicion(mesa);
    setMesaAbierta(true);
  };

  const alGuardarSector = () => {
    setSectorAbierto(false);
    recargar();
  };

  const alGuardarMesa = () => {
    setMesaAbierta(false);
    setMesaEnEdicion(null);
    setPestania('mesas');
    setRefrescoMesas((previa) => previa + 1);
  };

  return {
    sectorAbierto,
    sectorEnEdicion,
    mesaAbierta,
    mesaEnEdicion,
    setSectorAbierto,
    setMesaAbierta,
    abrirSector,
    abrirMesa,
    alGuardarSector,
    alGuardarMesa,
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
            onNuevaMesa={() => dialogos.abrirMesa()}
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
        onEditarMesa={(mesa) => dialogos.abrirMesa(mesa)}
      />
      <DialogosSalon
        sectorAbierto={dialogos.sectorAbierto}
        sectorEnEdicion={dialogos.sectorEnEdicion}
        mesaAbierta={dialogos.mesaAbierta}
        mesaEnEdicion={dialogos.mesaEnEdicion}
        onSectorOpenChange={dialogos.setSectorAbierto}
        onGuardadoSector={dialogos.alGuardarSector}
        onMesaOpenChange={dialogos.setMesaAbierta}
        onMesaGuardada={dialogos.alGuardarMesa}
        onCrearSectorDesdeMesa={abrirSectorDesdeMesa}
      />
    </div>
  );
}
