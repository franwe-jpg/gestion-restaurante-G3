import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../ui/button';

import { aplicarTema, temaActual } from './tema';

/** Alterna entre claro y oscuro; el ícono muestra el modo al que se va a cambiar. */
export function BotonTema() {
  const [oscuro, setOscuro] = useState(() => temaActual() === 'oscuro');

  const alternar = () => {
    const nuevo = oscuro ? 'claro' : 'oscuro';
    aplicarTema(nuevo);
    setOscuro(nuevo === 'oscuro');
  };

  const etiqueta = oscuro ? 'Activar modo claro' : 'Activar modo oscuro';
  return (
    <Button
      variant="brand-outline"
      size="sm"
      className="px-2"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={alternar}
    >
      {oscuro ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </Button>
  );
}
