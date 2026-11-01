import { useState } from 'react';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { ComandasPanel } from '../components/ComandasPanel';
import { ComandaForm } from '../components/ComandaForm';
import { CierreComandaDialog } from '../components/CierreComandaDialog';
import { useComandas } from '../components/useComandas';

export function AtencionPage() {
  const comandas = useComandas();
  const [alta, setAlta] = useState(false);
  const [cierreId, setCierreId] = useState<number | null>(null);
  const [aviso, setAviso] = useState('');
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

      <ComandasPanel comandas={comandas} aviso={aviso} onCerrar={setCierreId} />
      {alta && (
        <Dialog open title="Nueva comanda" size="lg" onOpenChange={setAlta}>
          <ComandaForm onCreada={creada} />
        </Dialog>
      )}
      {cierreId !== null && (
        <CierreComandaDialog id={cierreId} onSalir={() => setCierreId(null)} onCerrada={cerrada} />
      )}
    </div>
  );
}
