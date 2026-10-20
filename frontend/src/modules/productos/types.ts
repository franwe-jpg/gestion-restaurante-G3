export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  disponible: boolean;
  alergenos?: string[];
}

export interface FiltrosProductos {
  categoria?: string;
  disponible?: boolean;
}
