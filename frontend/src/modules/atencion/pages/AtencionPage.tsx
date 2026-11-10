import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
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

export function AtencionPage() {
  const comandas = useComandas();
  const enlaces = useEnlacesAtencion();
  const [cierreId, setCierreId] = useState<number | null>(null);
  const [modificarId, setModificarId] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const { entregas, irAEntregas, salirDeEntregas } = useEntregasModal(setCierreId);
  const reabrir = useReabrirComanda(comandas.recargar, setAviso);
  const anular = useAnularComanda(comandas.recargar, setAviso);
  const acciones = accionesAtencion(comandas.recargar, enlaces.setAlta, setCierreId, setAviso);
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atención al Público"
        descripcion="Toma de pedidos, seguimiento de comandas y estado de servicio en cocina."
        acciones={<Button onClick={enlaces.abrirAlta}>Nueva comanda</Button>}
      />
      <PanelClientes />
      <ComandasPanel
        comandas={comandas}
        aviso={aviso}
        onCerrar={setCierreId}
        onEntregas={(id) => irAEntregas(id, false)}
        onModificar={setModificarId}
        onReabrir={(id) => void reabrir(id)}
        onAnular={(id) => void anular(id)}
        onFacturar={enlaces.irAFacturar}
      />
      <AtencionDialogs
        alta={enlaces.alta}
        mesaInicial={enlaces.mesaInicial}
        cierreId={cierreId}
        modificarId={modificarId}
        entregas={entregas}
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
