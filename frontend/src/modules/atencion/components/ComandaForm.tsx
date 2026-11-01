import { Button } from '../../../shared/components/ui/button';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Textarea } from '../../../shared/components/ui/textarea';
import { DetallePedidoFila } from './DetallePedidoFila';
import { usePedido } from './usePedido';

type Pedido = ReturnType<typeof usePedido>;

function LineasPedido({ pedido }: { pedido: Pedido }) {
  return (
    <>
      {pedido.lineas.map((linea, i) => (
        <DetallePedidoFila
          key={linea.clave}
          linea={linea}
          numero={i + 1}
          puedeQuitar={pedido.lineas.length > 1}
          onChange={pedido.cambiar}
          onQuitar={() => pedido.quitar(linea.clave)}
        />
      ))}
      <Button type="button" variant="outline" onClick={pedido.agregar}>
        Agregar línea
      </Button>
    </>
  );
}

function CamposPedido({ pedido }: { pedido: Pedido }) {
  return (
    <fieldset disabled={pedido.guardando} className="space-y-3">
      <FormField id="comanda-mesa" label="Mesa (ID)">
        <Input
          id="comanda-mesa"
          required
          type="number"
          min="1"
          step="1"
          value={pedido.mesa}
          onChange={(e) => pedido.setMesa(e.target.value)}
        />
      </FormField>
      <LineasPedido pedido={pedido} />
      <FormField id="comanda-observaciones" label="Observaciones">
        <Textarea
          id="comanda-observaciones"
          maxLength={500}
          value={pedido.observaciones}
          onChange={(e) => pedido.setObservaciones(e.target.value)}
        />
      </FormField>
    </fieldset>
  );
}

export function ComandaForm({ onCreada }: { onCreada: () => void }) {
  const pedido = usePedido(onCreada);
  return (
    <form onSubmit={(e) => void pedido.enviar(e)} className="space-y-4">
      <p>
        Las referencias se ingresan por ID hasta integrar los selectores de Mesa y catálogo. El
        precio se calcula en el servidor.
      </p>
      <CamposPedido pedido={pedido} />
      {pedido.error && <p role="alert">{pedido.error}</p>}
      <Button type="submit" disabled={pedido.guardando}>
        Guardar comanda
      </Button>
    </form>
  );
}
