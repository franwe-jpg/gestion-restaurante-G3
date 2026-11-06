import { Link } from 'react-router-dom';

import { PageHeader } from './PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { REPORTES } from './reportes';

export function ReportesPage() {
  return (
    <div>
      <PageHeader titulo="Reportes" descripcion="Reportes de todos los módulos del sistema." />
      <ul aria-label="Reportes disponibles" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTES.map((reporte) => (
          <li key={reporte.ruta}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{reporte.titulo}</CardTitle>
                <CardDescription>{reporte.descripcion}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link
                  to={reporte.ruta}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
                >
                  Generar
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
