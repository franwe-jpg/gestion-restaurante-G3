import { Alert } from '../ui/alert';
import { Button } from '../ui/button';

export interface ErrorDelBloqueProps {
  mensaje: string;
  onReintentar: () => void;
}

/** Error de un bloque de `/`: no oculta a los demás y se reintenta por separado. */
export function ErrorDelBloque({ mensaje, onReintentar }: ErrorDelBloqueProps) {
  return (
    <Alert variant="danger" titulo="No se pudieron cargar los datos">
      <p>{mensaje}</p>
      <Button variant="brand-outline" size="sm" className="mt-2" onClick={onReintentar}>
        Reintentar
      </Button>
    </Alert>
  );
}
