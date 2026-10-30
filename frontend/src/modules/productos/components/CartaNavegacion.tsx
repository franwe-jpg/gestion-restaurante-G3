import type { SeccionCarta } from '../types';

export function CartaNavegacion({ secciones }: { secciones: SeccionCarta[] }) {
  return (
    <nav aria-label="Secciones de la carta" className="flex flex-wrap gap-2">
      {secciones.map((seccion) => (
        <a
          key={seccion.id}
          href={`#seccion-${seccion.id}`}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
        >
          {seccion.nombre}
        </a>
      ))}
    </nav>
  );
}
