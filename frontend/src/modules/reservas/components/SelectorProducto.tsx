import { FormField } from '../../../shared/components/ui/form-field';
import { Select } from '../../../shared/components/ui/select';
import { formatearMoneda } from '../../../shared/lib/format';
import type { ProductoHabilitado } from '../types';

import { puedeElegirProducto } from './useProductosHabilitados';
import type { EstadoProductosHabilitados } from './useProductosHabilitados';

export interface SelectorProductoProps {
  /** `id` del `<select>`: cada línea del pedido lleva el suyo. */
  id: string;
  /** Posición de la línea, desde 1: arma la etiqueta «Producto {n}». */
  numero: number;
  estado: EstadoProductosHabilitados;
  /** `id` del producto elegido como texto, o `''` si no hay ninguno. */
  valor: string;
  /** Error de la validación local, bajo el campo. El de la carga lo muestra el modal, una vez. */
  error?: string;
  onCambiar: (valor: string) => void;
}

const TEXTO_SIN_ELEGIR = 'Seleccione un producto';
const TEXTO_CARGANDO = 'Cargando productos…';
const TEXTO_SIN_PRODUCTOS = 'No hay productos habilitados';

function textoDeProducto({ nombre, precio }: ProductoHabilitado): string {
  return `${nombre} · ${formatearMoneda(Number(precio))}`;
}

function Opciones({ estado }: { estado: EstadoProductosHabilitados }) {
  if (estado.tipo === 'cargando') return <option value="">{TEXTO_CARGANDO}</option>;
  if (estado.tipo !== 'listo') return null;
  if (estado.productos.length === 0) return <option value="">{TEXTO_SIN_PRODUCTOS}</option>;
  return (
    <>
      <option value="">{TEXTO_SIN_ELEGIR}</option>
      {estado.productos.map((producto) => (
        <option key={producto.id} value={String(producto.id)}>
          {textoDeProducto(producto)}
        </option>
      ))}
    </>
  );
}

/**
 * Campo «Producto {n}» de una línea de la comanda: se elige por su nombre entre los productos
 * habilitados, con su precio. El valor de cada opción es el `id` del producto, que se envía como
 * `producto_id`.
 */
export function SelectorProducto({
  id,
  numero,
  estado,
  valor,
  error,
  onCambiar,
}: SelectorProductoProps) {
  return (
    <FormField id={id} label={`Producto ${numero}`} error={error}>
      <Select
        id={id}
        value={valor}
        disabled={!puedeElegirProducto(estado)}
        onChange={(evento) => onCambiar(evento.target.value)}
      >
        <Opciones estado={estado} />
      </Select>
    </FormField>
  );
}
