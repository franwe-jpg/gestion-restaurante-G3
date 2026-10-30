import { Badge } from '../../../shared/components/ui/badge';
import { formatearMoneda } from '../../../shared/lib/format';
import { urlDeImagen } from '../api';
import type { ProductoCarta } from '../types';

export interface ProductoCartaTarjetaProps {
  producto: ProductoCarta;
  mostrarEstado?: boolean;
}

function Imagen({ producto }: { producto: ProductoCarta }) {
  const url = urlDeImagen(producto.imagen_url);
  if (url === null) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-400">
        Sin imagen
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={producto.nombre}
      loading="lazy"
      className="h-32 w-full rounded-md object-cover"
    />
  );
}

export function ProductoCartaTarjeta({
  producto,
  mostrarEstado = false,
}: ProductoCartaTarjetaProps) {
  const habilitado = producto.estado === 'HABILITADO';
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Imagen producto={producto} />
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{producto.nombre}</h3>
        <span className="font-semibold text-slate-900">
          {formatearMoneda(Number(producto.precio))}
        </span>
      </div>
      {producto.descripcion && <p className="text-sm text-slate-600">{producto.descripcion}</p>}
      <div className="flex flex-wrap gap-1">
        {producto.etiquetas.map((etiqueta) => (
          <Badge key={etiqueta}>{etiqueta}</Badge>
        ))}
        {mostrarEstado && (
          <Badge variant={habilitado ? 'success' : 'neutral'}>
            {habilitado ? 'Habilitado' : 'Deshabilitado'}
          </Badge>
        )}
      </div>
    </article>
  );
}
