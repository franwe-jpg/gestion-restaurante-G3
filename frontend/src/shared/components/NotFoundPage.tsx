import { Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from './ui/button';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-800">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Página no encontrada</h1>
      <p className="max-w-md text-sm text-slate-500">
        La ruta que buscás no existe o el módulo todavía no está disponible.
      </p>
      <Button className="mt-2" onClick={() => navigate('/')}>
        Volver al inicio
      </Button>
    </section>
  );
}
