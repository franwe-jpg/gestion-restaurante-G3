import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../shared/components/ui/button';
import { StatusBadge } from '../../../shared/components/ui/status-badge';
import type { Mesa } from '../types';

import { agruparMesasPorSector, hayAccionesDelPlano } from './gruposDelPlano';
import type { CriteriosAccionesPlano, GrupoMesasPorSector } from './gruposDelPlano';

export type AccionesPlanoProps = CriteriosAccionesPlano;

function clasesPorEstado(estado: Mesa['estado']): string {
  if (estado === 'LIBRE') return 'border-emerald-200 bg-emerald-50/60';
  if (estado === 'OCUPADA') return 'border-amber-200 bg-amber-50/60';
  return 'border-slate-200 bg-slate-50';
}

interface BotonDelPlanoProps {
  mesa: Mesa;
  visible: boolean;
  accion?: (mesa: Mesa) => void;
  etiqueta: string;
  children: React.ReactNode;
}

function BotonDelPlano({ mesa, visible, accion, etiqueta, children }: BotonDelPlanoProps) {
  if (!visible || accion === undefined) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={etiqueta}
      title={etiqueta.replace(' desde el plano', '')}
      onClick={() => accion(mesa)}
    >
      {children}
    </Button>
  );
}

function AccionesPlano(props: AccionesPlanoProps) {
  const { mesa, gestiona, puedeAbrirComanda } = props;
  if (!hayAccionesDelPlano(props)) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {puedeAbrirComanda && mesa.estado === 'LIBRE' && props.onAbrirComanda !== undefined && (
        <Button
          variant="brand-outline"
          size="sm"
          aria-label={`Abrir comanda en la mesa ${mesa.numero} desde el plano`}
          onClick={() => props.onAbrirComanda?.(mesa)}
        >
          Abrir comanda
        </Button>
      )}
      <BotonDelPlano
        mesa={mesa}
        visible={gestiona}
        accion={props.onEditar}
        etiqueta={`Editar la mesa ${mesa.numero} desde el plano`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Editar</span>
      </BotonDelPlano>
      <BotonDelPlano
        mesa={mesa}
        visible={gestiona && mesa.estado !== 'OCUPADA'}
        accion={props.onEliminar}
        etiqueta={`Eliminar la mesa ${mesa.numero} desde el plano`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Eliminar</span>
      </BotonDelPlano>
    </div>
  );
}

function TarjetaMesa(props: AccionesPlanoProps) {
  const { mesa } = props;

  return (
    <article
      aria-label={`Mesa ${mesa.numero} del sector ${mesa.sector.nombre}`}
      className={`rounded-lg border p-3 shadow-xs ${clasesPorEstado(mesa.estado)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-lg font-bold text-slate-900">Mesa {mesa.numero}</p>
        <StatusBadge estado={mesa.estado} />
      </div>
      <p className="mt-1 text-sm text-slate-600">Capacidad: {mesa.capacidad} personas</p>
      <AccionesPlano {...props} />
    </article>
  );
}

function GrupoDelPlano({
  grupo,
  ...acciones
}: { grupo: GrupoMesasPorSector } & Omit<AccionesPlanoProps, 'mesa'>) {
  const tituloId = `plano-sector-${grupo.sectorId}`;
  const cantidad = grupo.mesas.length === 1 ? '1 mesa' : `${grupo.mesas.length} mesas`;

  return (
    <section aria-labelledby={tituloId}>
      <h3 id={tituloId} className="mb-2 text-sm font-semibold text-slate-700">
        {grupo.sectorNombre} · {cantidad}
      </h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {grupo.mesas.map((mesa) => (
          <li key={mesa.id}>
            <TarjetaMesa mesa={mesa} {...acciones} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface PlanoDelSalonProps extends Omit<CriteriosAccionesPlano, 'mesa'> {
  mesas: Mesa[];
}

/**
 * Plano de mesas agrupadas por sector: grilla legible en el celular
 * (2 columnas) que se ensancha en desktop. Respeta los filtros elegidos.
 */
export function PlanoDelSalon({ mesas, ...acciones }: PlanoDelSalonProps) {
  if (mesas.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Sin mesas para los filtros elegidos. Probá con otro sector o estado.
      </p>
    );
  }

  return (
    <section aria-label="Plano de mesas por sector" className="space-y-5">
      {agruparMesasPorSector(mesas).map((grupo) => (
        <GrupoDelPlano key={grupo.sectorId} grupo={grupo} {...acciones} />
      ))}
    </section>
  );
}
