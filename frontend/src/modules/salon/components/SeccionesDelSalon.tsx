import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent } from '../../../shared/components/ui/card';
import { Pagination } from '../../../shared/components/ui/pagination';
import { Tabs } from '../../../shared/components/ui/tabs';
import type { EstadoPaginacion } from '../../../shared/hooks/usePaginacion';
import type { Chef, Mesa, Mozo, Sector } from '../types';

import { ChefsTabla } from './ChefsTabla';
import { MesasTabla } from './MesasTabla';
import { MozosTabla } from './MozosTabla';
import { SectoresTabla } from './SectoresTabla';
import { useBajaChef } from './useBajaChef';
import { useBajaMesa } from './useBajaMesa';
import { useBajaMozo } from './useBajaMozo';
import { useChefsDelSalon } from './useChefsDelSalon';
import { useMesasDelSalon } from './useMesasDelSalon';
import { useMozosDelSalon } from './useMozosDelSalon';

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

export interface SeccionSectoresProps {
  sectores: Sector[];
  cargando: boolean;
  error: string | null;
  paginacion: EstadoPaginacion;
  onReintentar: () => void;
  /** Sin `SALON_GESTIONAR` no se pasan `onEditar` ni `onEliminar`: la tabla es de solo lectura. */
  onEditar?: (sector: Sector) => void;
  onEliminar?: (sector: Sector) => void;
}

function SeccionSectores({ paginacion, ...tabla }: SeccionSectoresProps) {
  return (
    <SeccionListado paginacion={paginacion}>
      <SectoresTabla {...tabla} />
    </SeccionListado>
  );
}

interface SeccionMesasProps {
  refresco: number;
  gestiona: boolean;
  puedeAbrirComanda: boolean;
  onEditar: (mesa: Mesa) => void;
}

function SeccionMesas({ refresco, gestiona, puedeAbrirComanda, onEditar }: SeccionMesasProps) {
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
        onEditar={gestiona ? onEditar : undefined}
        onEliminar={gestiona ? (mesa) => void eliminar(mesa) : undefined}
        onAbrirComanda={
          puedeAbrirComanda ? (mesa) => navegar(`/atencion?mesa=${mesa.id}`) : undefined
        }
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

function SeccionChefs({
  refresco,
  onEditar,
}: {
  refresco: number;
  onEditar: (chef: Chef) => void;
}) {
  const { chefs, cargando, error, recargar, paginacion } = useChefsDelSalon(refresco);
  const { eliminar } = useBajaChef({ onEliminado: recargar });

  return (
    <SeccionListado paginacion={paginacion}>
      <ChefsTabla
        chefs={chefs}
        cargando={cargando}
        error={error}
        onReintentar={recargar}
        onEditar={onEditar}
        onEliminar={(chef) => void eliminar(chef)}
      />
    </SeccionListado>
  );
}

export interface SeccionesDelSalonProps extends Omit<SeccionSectoresProps, 'onEditar'> {
  /** Permiso `SALON_GESTIONAR`: habilita las pestañas «Mozos» y «Chefs» y todas las acciones. */
  gestiona: boolean;
  /** Permiso `COMANDAS_OPERAR`: ofrece «Abrir comanda» en las mesas libres. */
  puedeAbrirComanda: boolean;
  pestania: string;
  refrescoMesas: number;
  refrescoMozos: number;
  refrescoChefs: number;
  onCambiarPestania: (id: string) => void;
  onEditarSector: (sector: Sector) => void;
  onEditarMesa: (mesa: Mesa) => void;
  onEditarMozo: (mozo: Mozo) => void;
  onEditarChef: (chef: Chef) => void;
}

function pestaniasDeGestion({
  refrescoMozos,
  refrescoChefs,
  onEditarMozo,
  onEditarChef,
}: Pick<
  SeccionesDelSalonProps,
  'refrescoMozos' | 'refrescoChefs' | 'onEditarMozo' | 'onEditarChef'
>) {
  return [
    {
      id: 'mozos',
      etiqueta: 'Mozos',
      contenido: <SeccionMozos refresco={refrescoMozos} onEditar={onEditarMozo} />,
    },
    {
      id: 'chefs',
      etiqueta: 'Chefs',
      contenido: <SeccionChefs refresco={refrescoChefs} onEditar={onEditarChef} />,
    },
  ];
}

/** Pestañas del módulo: sectores y mesas para quien consulta; mozos y chefs solo para quien gestiona. */
export function SeccionesDelSalon({
  gestiona,
  puedeAbrirComanda,
  pestania,
  onCambiarPestania,
  refrescoMesas,
  refrescoMozos,
  refrescoChefs,
  onEditarSector,
  onEditarMesa,
  onEditarMozo,
  onEditarChef,
  onEliminar,
  ...sectores
}: SeccionesDelSalonProps) {
  return (
    <Tabs
      valor={pestania}
      onCambiar={onCambiarPestania}
      items={[
        {
          id: 'sectores',
          etiqueta: 'Sectores',
          contenido: (
            <SeccionSectores
              {...sectores}
              onEditar={gestiona ? onEditarSector : undefined}
              onEliminar={gestiona ? onEliminar : undefined}
            />
          ),
        },
        {
          id: 'mesas',
          etiqueta: 'Mesas',
          contenido: (
            <SeccionMesas
              refresco={refrescoMesas}
              gestiona={gestiona}
              puedeAbrirComanda={puedeAbrirComanda}
              onEditar={onEditarMesa}
            />
          ),
        },
        ...(gestiona
          ? pestaniasDeGestion({ refrescoMozos, refrescoChefs, onEditarMozo, onEditarChef })
          : []),
      ]}
    />
  );
}
