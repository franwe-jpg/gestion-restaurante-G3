import type { ReactNode } from 'react';
import { BarChart3 } from 'lucide-react';

import { EmptyState } from '../EmptyState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';

export interface ChartContainerProps {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
  children?: ReactNode;
  vacio?: boolean;
  mensajeVacio?: string;
}

export function ChartContainer({
  titulo,
  descripcion,
  acciones,
  children,
  vacio = false,
  mensajeVacio = 'Todavía no hay datos para el período seleccionado.',
}: ChartContainerProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{titulo}</CardTitle>
          {descripcion && <CardDescription className="mt-1">{descripcion}</CardDescription>}
        </div>
        {acciones}
      </CardHeader>
      <CardContent>
        {vacio ? (
          <EmptyState icono={BarChart3} titulo="Sin datos" descripcion={mensajeVacio} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
