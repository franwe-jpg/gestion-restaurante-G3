import type {
  CantidadesPorEstado,
  FiltroDelMapa,
  FiltroEstado,
  FormaDeMesa,
  MesaApi,
  MesaDelMapa,
  ReservaActiva,
  SectorDelMapa,
} from './types';

function reservaMasTemprana(reservas: ReservaActiva[]): Map<number, ReservaActiva> {
  const porMesa = new Map<number, ReservaActiva>();
  for (const reserva of reservas) {
    const actual = porMesa.get(reserva.mesa_id);
    if (actual === undefined || reserva.hora < actual.hora) porMesa.set(reserva.mesa_id, reserva);
  }
  return porMesa;
}

/** Una mesa LIBRE con reserva activa hoy figura RESERVADA; las demás conservan su estado. */
export function clasificarMesas(mesas: MesaApi[], reservas: ReservaActiva[]): MesaDelMapa[] {
  const porMesa = reservaMasTemprana(reservas);
  return mesas.map((mesa) => {
    const reserva = mesa.estado === 'LIBRE' ? porMesa.get(mesa.id) : undefined;
    return reserva === undefined
      ? { ...mesa, estadoVisible: mesa.estado }
      : { ...mesa, estadoVisible: 'RESERVADA', horaReserva: reserva.hora, reserva };
  });
}

export function agruparPorSector(mesas: MesaDelMapa[]): SectorDelMapa[] {
  const sectores = new Map<number, SectorDelMapa>();
  for (const mesa of mesas) {
    const sector = sectores.get(mesa.sector.id) ?? { ...mesa.sector, mesas: [] };
    sector.mesas.push(mesa);
    sectores.set(mesa.sector.id, sector);
  }
  return [...sectores.values()]
    .map((sector) => ({ ...sector, mesas: [...sector.mesas].sort((a, b) => a.numero - b.numero) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function contarPorEstado(mesas: MesaDelMapa[]): CantidadesPorEstado {
  const cantidades: CantidadesPorEstado = {
    libres: 0,
    conReserva: 0,
    ocupadas: 0,
    fueraDeServicio: 0,
  };
  for (const { estadoVisible } of mesas) {
    if (estadoVisible === 'RESERVADA') cantidades.conReserva += 1;
    if (estadoVisible === 'LIBRE' || estadoVisible === 'RESERVADA') cantidades.libres += 1;
    if (estadoVisible === 'OCUPADA') cantidades.ocupadas += 1;
    if (estadoVisible === 'FUERA_DE_SERVICIO') cantidades.fueraDeServicio += 1;
  }
  return cantidades;
}

const ESTADOS_DEL_FILTRO: Record<FiltroEstado, MesaDelMapa['estadoVisible'][] | null> = {
  TODAS: null,
  LIBRES: ['LIBRE', 'RESERVADA'],
  CON_RESERVA: ['RESERVADA'],
  OCUPADAS: ['OCUPADA'],
  FUERA_DE_SERVICIO: ['FUERA_DE_SERVICIO'],
};

/** Si la mesa entra en el filtro de estado; en el plano, las que no entran se atenúan. */
export function cumpleEstado(mesa: MesaDelMapa, estado: FiltroEstado): boolean {
  const estados = ESTADOS_DEL_FILTRO[estado];
  return estados === null || estados.includes(mesa.estadoVisible);
}

export function filtrarMesas(mesas: MesaDelMapa[], filtro: FiltroDelMapa): MesaDelMapa[] {
  return mesas.filter(
    (mesa) =>
      (filtro.sectorId === null || mesa.sector.id === filtro.sectorId) &&
      cumpleEstado(mesa, filtro.estado),
  );
}

/** Forma y sillas por capacidad: hasta 2 redonda, hasta 4 cuadrada, hasta 6 rectangular, más larga. */
export function formaDeMesa(capacidad: number): FormaDeMesa {
  if (capacidad <= 2) return { forma: 'redonda', sillas: 2 };
  if (capacidad <= 4) return { forma: 'cuadrada', sillas: 4 };
  if (capacidad <= 6) return { forma: 'rectangular', sillas: 6 };
  return { forma: 'larga', sillas: 8 };
}

const TEXTO_DEL_ESTADO: Record<MesaDelMapa['estadoVisible'], string> = {
  LIBRE: 'libre',
  RESERVADA: 'libre con reserva',
  OCUPADA: 'ocupada',
  FUERA_DE_SERVICIO: 'fuera de servicio',
};

/** Texto accesible de la mesa: «Mesa 5, Terraza, libre con reserva a las 23:00». */
export function describirMesa(mesa: MesaDelMapa): string {
  const hora = mesa.horaReserva === undefined ? '' : ` a las ${mesa.horaReserva}`;
  return `Mesa ${mesa.numero}, ${mesa.sector.nombre}, ${TEXTO_DEL_ESTADO[mesa.estadoVisible]}${hora}`;
}
