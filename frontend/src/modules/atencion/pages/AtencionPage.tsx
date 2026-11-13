import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Permiso } from '../../../shared/auth/permisos';
import { useSesion } from '../../../shared/auth/useSesion';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Tabs } from '../../../shared/components/ui/tabs';
import type { TabItem } from '../../../shared/components/ui/tabs';
import { useAbrirDesdeUrl } from '../../../shared/hooks/useAbrirDesdeUrl';
import { AtencionDialogs } from '../components/AtencionDialogs';
import { ComandasPanel } from '../components/ComandasPanel';
import { PanelClientes } from '../components/PanelClientes';
import { useComandas } from '../components/useComandas';
import { useEntregasModal } from '../components/useEntregasModal';
import { useReabrirComanda } from '../components/useReabrirComanda';
import { useAnularComanda } from '../components/useAnularComanda';
import { useCambioDeMozo } from '../components/useCambioDeMozo';

function accionesAtencion(
  recargar: () => void,
  setAlta: (abierto: boolean) => void,
  setCierreId: (id: number | null) => void,
  setAviso: (mensaje: string) => void,
) {
  return {
    creada() {
      setAlta(false);
      setAviso('Comanda creada');
      recargar();
    },
    cerrada() {
      setCierreId(null);
      setAviso('Comanda cerrada');
      recargar();
    },
    modificada() {
      setAviso('Comanda modificada');
      recargar();
    },
  };
}

/** S4-03: `/atencion?mesa=<id>` abre «Nueva comanda»; se lee una vez y se quita de la URL. */
function useEnlacesAtencion() {
  const [parametros, setParametros] = useSearchParams();
  const navegar = useNavigate();
  const [mesaInicial, setMesaInicial] = useState(() => {
    const id = Number(parametros.get('mesa'));
    return Number.isInteger(id) && id > 0 ? String(id) : undefined;
  });
  useEffect(() => {
    if (!parametros.has('mesa')) return;
    setParametros(
      (anteriores) => {
        anteriores.delete('mesa');
        return anteriores;
      },
      { replace: true },
    );
  }, [parametros, setParametros]);
  const [alta, setAlta] = useState(mesaInicial !== undefined);
  useAbrirDesdeUrl('nueva', () => setAlta(true));
  return {
    alta,
    setAlta,
    mesaInicial,
    abrirAlta: () => {
      setMesaInicial(undefined);
      setAlta(true);
    },
    irAFacturar: (id: number) => navegar(`/pagos?comanda=${id}`),
  };
}

/** Sin `COMANDAS_OPERAR` no hay `onNueva` y el encabezado no ofrece el alta. */
function EncabezadoAtencion({ onNueva }: { onNueva?: () => void }) {
  return (
    <PageHeader
      titulo="Atención al Público"
      descripcion="Toma de pedidos, seguimiento de comandas y estado de servicio en cocina."
      acciones={
        onNueva ? (
          <Button variant="brand-outline" onClick={onNueva}>
            Nueva comanda
          </Button>
        ) : undefined
      }
    />
  );
}

/** Permisos que gobiernan los botones del diálogo de entregas. */
function permisosDeEntregas(puede: (permiso: Permiso) => boolean) {
  return {
    puedeEntregar: puede('COMANDAS_OPERAR'),
    puedeMarcarListo: puede('COMANDAS_MARCAR_LISTO'),
  };
}

/** La pestaña de clientes solo existe con `CLIENTES_GESTIONAR`; si no, ni se consulta. */
function seccionesDeAtencion(comandas: ReactNode, clientes: ReactNode | null): TabItem[] {
  const secciones: TabItem[] = [{ id: 'comandas', etiqueta: 'Comandas', contenido: comandas }];
  if (clientes) secciones.push({ id: 'clientes', etiqueta: 'Clientes', contenido: clientes });
  return secciones;
}

/** La primera pestaña («Comandas») es la activa por defecto. */
function PestanasDeAtencion({ secciones }: { secciones: TabItem[] }) {
  const [pestana, setPestana] = useState(secciones[0]?.id ?? 'comandas');
  return <Tabs items={secciones} valor={pestana} onCambiar={setPestana} />;
}

function PanelComandasDeLaPagina({
  comandas,
  aviso,
  opera,
  puede,
  irAEntregas,
  setCierreId,
  setModificarId,
  reabrir,
  anular,
  cambioMozo,
  irAFacturar,
}: {
  comandas: ReturnType<typeof useComandas>;
  aviso: string;
  opera: boolean;
  puede: (permiso: Permiso) => boolean;
  irAEntregas: (id: number, volverACierre: boolean) => void;
  setCierreId: (id: number | null) => void;
  setModificarId: (id: number | null) => void;
  reabrir: (id: number) => void;
  anular: (id: number) => void;
  cambioMozo: ReturnType<typeof useCambioDeMozo>;
  irAFacturar: (id: number) => void;
}) {
  return (
    <ComandasPanel
      comandas={comandas}
      aviso={aviso}
      puedeOperar={opera}
      puedeFacturar={puede('PAGOS_OPERAR')}
      onCerrar={setCierreId}
      onEntregas={(id) => irAEntregas(id, false)}
      onModificar={setModificarId}
      onReabrir={reabrir}
      onAnular={anular}
      onFacturar={irAFacturar}
      onCambiarMozo={cambioMozo.abrir}
    />
  );
}

function DialogosDeAtencion({
  enlaces,
  opera,
  cierreId,
  modificarId,
  setCierreId,
  setModificarId,
  entregas,
  cambioMozo,
  puede,
  acciones,
  irAEntregas,
  salirDeEntregas,
}: {
  enlaces: ReturnType<typeof useEnlacesAtencion>;
  opera: boolean;
  cierreId: number | null;
  modificarId: number | null;
  setCierreId: (id: number | null) => void;
  setModificarId: (id: number | null) => void;
  entregas: ReturnType<typeof useEntregasModal>['entregas'];
  cambioMozo: ReturnType<typeof useCambioDeMozo>;
  puede: (permiso: Permiso) => boolean;
  acciones: ReturnType<typeof accionesAtencion>;
  irAEntregas: (id: number, volverACierre: boolean) => void;
  salirDeEntregas: () => void;
}) {
  return (
    <AtencionDialogs
      alta={opera && enlaces.alta}
      mesaInicial={enlaces.mesaInicial}
      cierreId={cierreId}
      modificarId={modificarId}
      entregas={entregas}
      cambioMozo={cambioMozo}
      {...permisosDeEntregas(puede)}
      onAlta={enlaces.setAlta}
      onCreada={acciones.creada}
      onSalirCierre={() => setCierreId(null)}
      onCerrada={acciones.cerrada}
      onEntregasDesdeCierre={(id) => irAEntregas(id, true)}
      onSalirEntregas={salirDeEntregas}
      onSalirModificar={() => setModificarId(null)}
      onModificada={acciones.modificada}
    />
  );
}

export function AtencionPage() {
  const { puede } = useSesion();
  const opera = puede('COMANDAS_OPERAR');
  const comandas = useComandas();
  const enlaces = useEnlacesAtencion();
  const [cierreId, setCierreId] = useState<number | null>(null);
  const [modificarId, setModificarId] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const { entregas, irAEntregas, salirDeEntregas } = useEntregasModal(setCierreId);
  const reabrir = useReabrirComanda(comandas.recargar, setAviso);
  const anular = useAnularComanda(comandas.recargar, setAviso);
  const cambioMozo = useCambioDeMozo(comandas.recargar, setAviso);
  const acciones = accionesAtencion(comandas.recargar, enlaces.setAlta, setCierreId, setAviso);
  const secciones = seccionesDeAtencion(
    <PanelComandasDeLaPagina
      comandas={comandas}
      aviso={aviso}
      opera={opera}
      puede={puede}
      irAEntregas={irAEntregas}
      setCierreId={setCierreId}
      setModificarId={setModificarId}
      reabrir={(id) => void reabrir(id)}
      anular={(id) => void anular(id)}
      cambioMozo={cambioMozo}
      irAFacturar={enlaces.irAFacturar}
    />,
    puede('CLIENTES_GESTIONAR') ? <PanelClientes /> : null,
  );
  return (
    <div className="space-y-6">
      <EncabezadoAtencion onNueva={opera ? enlaces.abrirAlta : undefined} />
      <PestanasDeAtencion secciones={secciones} />
      <DialogosDeAtencion
        enlaces={enlaces}
        opera={opera}
        cierreId={cierreId}
        modificarId={modificarId}
        setCierreId={setCierreId}
        setModificarId={setModificarId}
        entregas={entregas}
        cambioMozo={cambioMozo}
        puede={puede}
        acciones={acciones}
        irAEntregas={irAEntregas}
        salirDeEntregas={salirDeEntregas}
      />
    </div>
  );
}
