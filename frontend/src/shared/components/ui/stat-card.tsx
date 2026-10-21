import type { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './card';

export interface StatCardProps {
  titulo: string;
  valor: string | number;
  descripcion?: string;
  icono?: LucideIcon;
}

export function StatCard({ titulo, valor, descripcion, icono: Icono }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">{titulo}</CardTitle>
        {Icono && <Icono className="h-4 w-4 text-slate-400" aria-hidden="true" />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{valor}</p>
        {descripcion && <p className="mt-1 text-xs text-slate-500">{descripcion}</p>}
      </CardContent>
    </Card>
  );
}
