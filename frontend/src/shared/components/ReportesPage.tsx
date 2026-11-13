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
                  className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
