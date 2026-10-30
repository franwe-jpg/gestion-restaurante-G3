import { Alert } from '../../../shared/components/ui/alert';
import type { MenuDelDia, SeccionResumen } from '../types';

import { AccionesMenu } from './AccionesMenu';
import { CampoImagenMenu } from './CampoImagenMenu';
import { CamposBasicosMenu } from './CamposBasicosMenu';
import { CamposTextosMenu } from './CamposTextosMenu';
import { useFormularioMenuDelDia } from './useFormularioMenuDelDia';

export interface FormularioMenuDelDiaProps {
  secciones: SeccionResumen[];
  menu?: MenuDelDia;
  onGuardado: (menu: MenuDelDia) => void;
  onCancelar?: () => void;
}

/** Alta y modificación del menú del día, con las mismas reglas que la API (HU-M2-04 y 05). */
export function FormularioMenuDelDia({
  secciones,
  menu,
  onGuardado,
  onCancelar,
}: FormularioMenuDelDiaProps) {
  const formulario = useFormularioMenuDelDia({ menu, onGuardado });
  const esAlta = menu === undefined;
  const titulo = esAlta ? 'Nuevo menú del día' : 'Modificar menú del día';

  if (secciones.length === 0) {
    return (
      <Alert variant="warning">
        No hay secciones habilitadas. Creá una sección en Productos antes de cargar un menú del día.
      </Alert>
    );
  }

  return (
    <form onSubmit={formulario.enviar} className="space-y-4" aria-label={titulo}>
      <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
      <CamposBasicosMenu formulario={formulario} secciones={secciones} />
      <CamposTextosMenu formulario={formulario} />
      <CampoImagenMenu formulario={formulario} menu={menu} />
      <AccionesMenu formulario={formulario} esAlta={esAlta} onCancelar={onCancelar} />
    </form>
  );
}
