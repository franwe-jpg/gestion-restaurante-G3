import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import { Tabs } from '../../../shared/components/ui/tabs';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';

import { MesaFormDialog } from '../components/MesaFormDialog';
import { MesasTabla } from '../components/MesasTabla';
import { MozoFormDialog } from '../components/MozoFormDialog';
import { MozosTabla } from '../components/MozosTabla';
import { SectorFormDialog } from '../components/SectorFormDialog';
import { SectoresTabla } from '../components/SectoresTabla';
import { useBajaMesa } from '../components/useBajaMesa';
import { useBajaMozo } from '../components/useBajaMozo';
import { useBajaSector } from '../components/useBajaSector';
import { useMesasDelSalon } from '../components/useMesasDelSalon';
import { useMozosDelSalon } from '../components/useMozosDelSalon';
import { useSectoresDelSalon } from '../components/useSectoresDelSalon';
import type { Mesa, Mozo, Sector } from '../types';

const TITULO = 'Salón y Mozos';
const DESCRIPCION = 'Mapa de mesas, distribución de sectores y asignación de mozos por turno.';

function AccionesDelSalon({
  onNuevoSector,
  onNuevaMesa,
  onNuevoMozo,
}: {
  onNuevoSector: () => void;
  onNuevaMesa: () => void;
  onNuevoMozo: () => void;
}) {
  return (
    <>
      <Button variant="outline" onClick={onNuevoSector}>
        Nuevo sector
      </Button>
      <Button variant="outline" onClick={onNuevaMesa}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nueva mesa
      </Button>
      <Button onClick={onNuevoMozo}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        Nuevo mozo
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
  const navegar = useNavigate();

  return (
    <SeccionListado paginacion={paginacion}>
      <MesasTabla
        mesas={mesas}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={onEditar}
        onEliminar={(mesa) => void eliminar(mesa)}
        onAbrirComanda={(mesa) => navegar(`/atencion?mesa=${mesa.id}`)}
      />
    </SeccionListado>
  );
}

function SeccionMozos({
  refresco,
  onEditar,
}: {
  refresco: number;
  onEditar: (mozo: Mozo) => void;
}) {
  const { mozos, cargando, error, recargar, paginacion } = useMozosDelSalon(refresco);
  const { eliminar } = useBajaMozo({ onEliminado: recargar });

  return (
    <SeccionListado paginacion={paginacion}>
      <MozosTabla
        mozos={mozos}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={onEditar}
        onEliminar={(mozo) => void eliminar(mozo)}
      />
    </SeccionListado>
  );
}

interface SeccionesDelSalonProps extends SeccionSectoresProps {
  pestania: string;
  refrescoMesas: number;
  refrescoMozos: number;
  onCambiarPestania: (id: string) => void;
  onEditarMesa: (mesa: Mesa) => void;
  onEditarMozo: (mozo: Mozo) => void;
}

function SeccionesDelSalon({
  pestania,
  onCambiarPestania,
  refrescoMesas,
  refrescoMozos,
  onEditarMesa,
  onEditarMozo,
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
        {
          id: 'mozos',
          etiqueta: 'Mozos',
          contenido: <SeccionMozos refresco={refrescoMozos} onEditar={onEditarMozo} />,
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
  mozoAbierto: boolean;
  mozoEnEdicion: Mozo | null;
  onSectorOpenChange: (abierto: boolean) => void;
  onGuardadoSector: () => void;
  onMesaOpenChange: (abierto: boolean) => void;
  onMesaGuardada: () => void;
  onMozoOpenChange: (abierto: boolean) => void;
  onMozoGuardado: () => void;
  onCrearSectorDesdeMesa: () => void;
}

function DialogosSalon({
  sectorAbierto,
  sectorEnEdicion,
  mesaAbierta,
  mesaEnEdicion,
  mozoAbierto,
  mozoEnEdicion,
  onSectorOpenChange,
  onGuardadoSector,
  onMesaOpenChange,
  onMesaGuardada,
  onMozoOpenChange,
  onMozoGuardado,
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
      {mozoAbierto && (
        <MozoFormDialog
          mozo={mozoEnEdicion}
          onGuardado={onMozoGuardado}
          onOpenChange={onMozoOpenChange}
        />
      )}
    </>
  );
}

function useDialogo<T>() {
  const [abierto, setAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<T | null>(null);
  const abrir = (item: T | null = null) => {
    setEnEdicion(item);
    setAbierto(true);
  };
  return { abierto, enEdicion, setAbierto, abrir };
}

function useDialogosDelSalon(recargar: () => void) {
  const sector = useDialogo<Sector>();
  const mesa = useDialogo<Mesa>();
  const mozo = useDialogo<Mozo>();
  const [pestania, setPestania] = useState('sectores');
  const [refrescoMesas, setRefrescoMesas] = useState(0);
  const [refrescoMozos, setRefrescoMozos] = useState(0);

  const alGuardarSector = () => {
    sector.setAbierto(false);
    recargar();
  };
  const alGuardarMesa = () => {
    mesa.setAbierto(false);
    setPestania('mesas');
    setRefrescoMesas((previa) => previa + 1);
  };
  const alGuardarMozo = () => {
    mozo.setAbierto(false);
    setPestania('mozos');
    setRefrescoMozos((previa) => previa + 1);
  };
  const abrirSectorDesdeMesa = () => {
    mesa.setAbierto(false);
    sector.abrir();
  };

  return {
    sectorAbierto: sector.abierto,
    sectorEnEdicion: sector.enEdicion,
    mesaAbierta: mesa.abierto,
    mesaEnEdicion: mesa.enEdicion,
    mozoAbierto: mozo.abierto,
    mozoEnEdicion: mozo.enEdicion,
    setSectorAbierto: sector.setAbierto,
    setMesaAbierta: mesa.setAbierto,
    setMozoAbierto: mozo.setAbierto,
    abrirSector: sector.abrir,
    abrirMesa: mesa.abrir,
    abrirMozo: mozo.abrir,
    alGuardarSector,
    alGuardarMesa,
    alGuardarMozo,
    abrirSectorDesdeMesa,
    pestania,
    setPestania,
    refrescoMesas,
    refrescoMozos,
  };
}

export function SalonPage() {
  const { sectores, cargando, error, recargar, paginacion } = useSectoresDelSalon();
  const { eliminar } = useBajaSector({ onEliminado: recargar });
  const dialogos = useDialogosDelSalon(recargar);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo={TITULO}
        descripcion={DESCRIPCION}
        acciones={
          <AccionesDelSalon
            onNuevoSector={() => dialogos.abrirSector()}
            onNuevaMesa={() => dialogos.abrirMesa()}
            onNuevoMozo={() => dialogos.abrirMozo()}
          />
        }
      />
      <SeccionesDelSalon
        pestania={dialogos.pestania}
        onCambiarPestania={dialogos.setPestania}
        refrescoMesas={dialogos.refrescoMesas}
        refrescoMozos={dialogos.refrescoMozos}
        sectores={sectores}
        cargando={cargando}
        error={error}
        paginacion={paginacion}
        onReintentar={recargar}
        onEditar={dialogos.abrirSector}
        onEliminar={(sector) => void eliminar(sector)}
        onEditarMesa={(mesa) => dialogos.abrirMesa(mesa)}
        onEditarMozo={(mozo) => dialogos.abrirMozo(mozo)}
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
        mozoAbierto={dialogos.mozoAbierto}
        mozoEnEdicion={dialogos.mozoEnEdicion}
        onMozoOpenChange={dialogos.setMozoAbierto}
        onMozoGuardado={dialogos.alGuardarMozo}
        onCrearSectorDesdeMesa={dialogos.abrirSectorDesdeMesa}
      />
    </div>
  );
}
