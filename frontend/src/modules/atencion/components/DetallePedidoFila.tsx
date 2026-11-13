import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { FormField } from '../../../shared/components/ui/form-field';
import { formatearMoneda } from '../../../shared/lib/format';
import type { MenuEjecutivoSeleccionable, ProductoSeleccionable } from '../types';

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
    ? productos.map((p) => ({
        id: p.id,
        texto: `${p.nombre} · ${formatearMoneda(Number(p.precio))}`,
      }))
    : menus.map((m) => ({
        id: m.id,
        texto: `${m.nombre} · ${formatearMoneda(Number(m.precio_fijo))}`,
      }));
  const vacio = esProducto ? 'No hay productos habilitados' : 'No hay menús habilitados';
  const id = `ref-${linea.clave}`;
  return (
    <FormField id={id} label={`${esProducto ? 'Producto' : 'Menú'} ${numero}`} className="min-w-0">
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

function BotonQuitar({
  numero,
  disabled,
  onQuitar,
}: {
  numero: number;
  disabled: boolean;
  onQuitar: () => void;
}) {
  return (
    <Button
      type="button"
      variant="brand-outline"
      disabled={disabled}
      onClick={onQuitar}
      title="Quitar línea"
    >
      Quitar línea {numero}
    </Button>
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
    <fieldset className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
      <legend className="px-1 text-sm font-medium">Línea {numero}</legend>
      <FormField id={`tipo-${linea.clave}`} label={`Tipo ${numero}`} className="min-w-0">
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
      <FormField id={`cantidad-${linea.clave}`} label={`Cantidad ${numero}`} className="min-w-0">
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
      <BotonQuitar numero={numero} disabled={!puedeQuitar} onQuitar={onQuitar} />
    </fieldset>
  );
}
