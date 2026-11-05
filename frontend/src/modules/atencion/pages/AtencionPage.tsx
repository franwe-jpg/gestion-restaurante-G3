import { useState } from 'react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { AtencionDialogs } from '../components/AtencionDialogs';
import { ComandasPanel } from '../components/ComandasPanel';
import { PanelClientes } from '../components/PanelClientes';
import { useComandas } from '../components/useComandas';
import { useEntregasModal } from '../components/useEntregasModal';
import { useReabrirComanda } from '../components/useReabrirComanda';

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

export function AtencionPage() {
  const comandas = useComandas();
  const [alta, setAlta] = useState(false);
  const [cierreId, setCierreId] = useState<number | null>(null);
  const [modificarId, setModificarId] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const { entregas, irAEntregas, salirDeEntregas } = useEntregasModal(setCierreId);
  const reabrir = useReabrirComanda(comandas.recargar, setAviso);
  const acciones = accionesAtencion(comandas.recargar, setAlta, setCierreId, setAviso);
  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Atención al Público"
        descripcion="Toma de pedidos, seguimiento de comandas y estado de servicio en cocina."
        acciones={<Button onClick={() => setAlta(true)}>Nueva comanda</Button>}
      />
      <PanelClientes />
      <ComandasPanel
        comandas={comandas}
        aviso={aviso}
        onCerrar={setCierreId}
        onEntregas={(id) => irAEntregas(id, false)}
        onModificar={setModificarId}
        onReabrir={(id) => void reabrir(id)}
      />
      <AtencionDialogs
        alta={alta}
        cierreId={cierreId}
        modificarId={modificarId}
        entregas={entregas}
        onAlta={setAlta}
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
