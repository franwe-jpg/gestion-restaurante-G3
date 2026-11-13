import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Permiso } from '../../../shared/auth/permisos';
import { useSesion } from '../../../shared/auth/useSesion';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { useAbrirDesdeUrl } from '../../../shared/hooks/useAbrirDesdeUrl';
import { AtencionDialogs } from '../components/AtencionDialogs';
import { ComandasPanel } from '../components/ComandasPanel';
import { PanelClientes } from '../components/PanelClientes';
import { useComandas } from '../components/useComandas';
import { useEntregasModal } from '../components/useEntregasModal';
import { useReabrirComanda } from '../components/useReabrirComanda';
import { useAnularComanda } from '../components/useAnularComanda';

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
      acciones={onNueva ? <Button onClick={onNueva}>Nueva comanda</Button> : undefined}
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

export function AtencionPage() {
  const { puede } = useSesion();
  const opera = puede('COMANDAS_OPERAR');
  const comandas = useComandas();
  const enlaces = useEnlacesAtencion();
  useAbrirDesdeUrl('nueva', () => enlaces.setAlta(true));
  const [cierreId, setCierreId] = useState<number | null>(null);
  const [modificarId, setModificarId] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const { entregas, irAEntregas, salirDeEntregas } = useEntregasModal(setCierreId);
  const reabrir = useReabrirComanda(comandas.recargar, setAviso);
  const anular = useAnularComanda(comandas.recargar, setAviso);
  const acciones = accionesAtencion(comandas.recargar, enlaces.setAlta, setCierreId, setAviso);
  return (
    <div className="space-y-6">
      <EncabezadoAtencion onNueva={opera ? enlaces.abrirAlta : undefined} />
      {puede('CLIENTES_GESTIONAR') && <PanelClientes />}
      <ComandasPanel
        comandas={comandas}
        aviso={aviso}
        puedeOperar={opera}
        puedeFacturar={puede('PAGOS_OPERAR')}
        onCerrar={setCierreId}
        onEntregas={(id) => irAEntregas(id, false)}
        onModificar={setModificarId}
        onReabrir={(id) => void reabrir(id)}
        onAnular={(id) => void anular(id)}
        onFacturar={enlaces.irAFacturar}
      />
      <AtencionDialogs
        alta={opera && enlaces.alta}
        mesaInicial={enlaces.mesaInicial}
        cierreId={cierreId}
        modificarId={modificarId}
        entregas={entregas}
        {...permisosDeEntregas(puede)}
        onAlta={enlaces.setAlta}
        onCreada={acciones.creada}
        onSalirCierre={() => setCierreId(null)}
        onCerrada={acciones.cerrada}
        onEntregasDesdeCierre={() => {
          if (cierreId !== null) irAEntregas(cierreId, true);
        }}
        onSalirEntregas={salirDeEntregas}
        onSalirModificar={() => setModificarId(null)}
        onModificada={acciones.modificada}
      />
    </div>
  );
}
