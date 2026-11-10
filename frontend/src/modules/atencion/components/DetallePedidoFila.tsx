import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { FormField } from '../../../shared/components/ui/form-field';
import type { MenuEjecutivoSeleccionable, ProductoSeleccionable } from '../types';
import { etiquetaMenu, etiquetaProducto } from './catalogoComanda';

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
  productos: ProductoSeleccionable[];
  menus: MenuEjecutivoSeleccionable[];
}

function SelectorReferencia({
  linea,
  numero,
  productos,
  menus,
  onChange,
}: Pick<Props, 'linea' | 'numero' | 'productos' | 'menus' | 'onChange'>) {
  const esProducto = linea.tipo === 'producto';
  const opciones = esProducto
    ? productos.map((p) => ({ id: p.id, texto: etiquetaProducto(p) }))
    : menus.map((m) => ({ id: m.id, texto: etiquetaMenu(m) }));
  const vacio = esProducto ? 'No hay productos habilitados' : 'No hay menús habilitados';
  const id = `ref-${linea.clave}`;
  return (
    <FormField id={id} label={`${esProducto ? 'Producto' : 'Menú'} ${numero}`}>
      <Select
        id={id}
        value={linea.referencia}
        onChange={(e) => onChange({ ...linea, referencia: e.target.value })}
      >
        {opciones.length === 0 ? (
          <option value="">{vacio}</option>
        ) : (
          <>
            <option value="">{esProducto ? 'Elegí un producto' : 'Elegí un menú'}</option>
            {opciones.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.texto}
              </option>
            ))}
          </>
        )}
      </Select>
    </FormField>
  );
}

export function DetallePedidoFila({
  linea,
  numero,
  onChange,
  onQuitar,
  puedeQuitar,
  productos,
  menus,
}: Props) {
  return (
    <fieldset className="grid gap-3 rounded border p-3 sm:grid-cols-4">
      <legend>Línea {numero}</legend>
      <FormField id={`tipo-${linea.clave}`} label={`Tipo ${numero}`}>
        <Select
          id={`tipo-${linea.clave}`}
          value={linea.tipo}
          onChange={(e) =>
            onChange({ ...linea, tipo: e.target.value as LineaPedido['tipo'], referencia: '' })
          }
        >
          <option value="producto">Producto</option>
          <option value="menu">Menú ejecutivo</option>
        </Select>
      </FormField>
      <SelectorReferencia
        linea={linea}
        numero={numero}
        productos={productos}
        menus={menus}
        onChange={onChange}
      />
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
