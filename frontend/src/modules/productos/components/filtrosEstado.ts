import type { FiltroEstado } from '../types';

export interface FiltroEstadoOpcion {
  valor: FiltroEstado;
  etiqueta: string;
  vacioTitulo: string;
  vacioDescripcion: string;
}

export const FILTROS_ESTADO: FiltroEstadoOpcion[] = [
  {
    valor: 'HABILITADO',
    etiqueta: 'Habilitados',
    vacioTitulo: 'No hay productos habilitados',
    vacioDescripcion:
      'Cree un plato o un postre, o vuelva a habilitar uno desde su pantalla de edición.',
  },
  {
    valor: 'DESHABILITADO',
    etiqueta: 'Deshabilitados',
    vacioTitulo: 'No hay productos deshabilitados',
    vacioDescripcion: 'Los productos dados de baja aparecerán aquí.',
  },
  {
    valor: 'TODOS',
    etiqueta: 'Todos',
    vacioTitulo: 'Todavía no hay productos',
    vacioDescripcion: 'Cree el primer plato o postre para empezar a armar la carta.',
  },
];
