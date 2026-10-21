export interface MenuPromocion {
  id: string;
  nombre: string;
  tipo: 'ejecutivo' | 'degustacion' | 'promocion';
  precio: number;
  activo: boolean;
}
