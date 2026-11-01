import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { FormField } from '../../../shared/components/ui/form-field';

export interface LineaPedido {
  clave: number;
  tipo: 'producto' | 'menu';
  referencia: string;
  cantidad: string;
}
interface Props {
  linea: LineaPedido;
  numero: number;
  onChange: (linea: LineaPedido) => void;
  onQuitar: () => void;
  puedeQuitar: boolean;
}

export function DetallePedidoFila({ linea, numero, onChange, onQuitar, puedeQuitar }: Props) {
  return (
    <fieldset className="grid gap-3 rounded border p-3 sm:grid-cols-4">
      <legend>Línea {numero}</legend>
      <FormField id={`tipo-${linea.clave}`} label={`Tipo ${numero}`}>
        <Select
          id={`tipo-${linea.clave}`}
          value={linea.tipo}
          onChange={(e) => onChange({ ...linea, tipo: e.target.value as LineaPedido['tipo'] })}
        >
          <option value="producto">Producto</option>
          <option value="menu">Menú ejecutivo</option>
        </Select>
      </FormField>
      <FormField id={`ref-${linea.clave}`} label={`Referencia ${numero} (ID)`}>
        <Input
          id={`ref-${linea.clave}`}
          required
          type="number"
          min="1"
          step="1"
          value={linea.referencia}
          onChange={(e) => onChange({ ...linea, referencia: e.target.value })}
        />
      </FormField>
      <FormField id={`cantidad-${linea.clave}`} label={`Cantidad ${numero}`}>
        <Input
          id={`cantidad-${linea.clave}`}
          required
          type="number"
          min="1"
          step="1"
          value={linea.cantidad}
          onChange={(e) => onChange({ ...linea, cantidad: e.target.value })}
        />
      </FormField>
      <Button type="button" variant="outline" disabled={!puedeQuitar} onClick={onQuitar}>
        Quitar línea {numero}
      </Button>
    </fieldset>
  );
}
