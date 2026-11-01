import { useState } from 'react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { ComandasPanel } from '../components/ComandasPanel';
import { PanelClientes } from '../components/PanelClientes';
import { ComandaForm } from '../components/ComandaForm';
import { CierreComandaDialog } from '../components/CierreComandaDialog';
import { EntregasComandaDialog } from '../components/EntregasComandaDialog';
import { useComandas } from '../components/useComandas';
import { useEntregasModal } from '../components/useEntregasModal';

export function AtencionPage() {
  const comandas = useComandas();
  const [alta, setAlta] = useState(false);
  const [cierreId, setCierreId] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
  const { entregas, irAEntregas, salirDeEntregas } = useEntregasModal(setCierreId);
  function creada() {
    setAlta(false);
    setAviso('Comanda creada');
    comandas.recargar();
  }
  function cerrada() {
    setCierreId(null);
    setAviso('Comanda cerrada');
    comandas.recargar();
  }
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
      />
      {alta && (
        <Dialog open title="Nueva comanda" size="lg" onOpenChange={setAlta}>
          <ComandaForm onCreada={creada} />
        </Dialog>
      )}
      {cierreId !== null && (
        <CierreComandaDialog
          id={cierreId}
          onSalir={() => setCierreId(null)}
          onCerrada={cerrada}
          onEntregas={() => irAEntregas(cierreId, true)}
        />
      )}
      {entregas && <EntregasComandaDialog id={entregas.id} onSalir={salirDeEntregas} />}
    </div>
  );
}
