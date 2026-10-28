import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Textarea } from '../../../shared/components/ui/textarea';
import type { ProductoSeleccionable, SeccionMenu } from '../types';

import { SelectorProductosMenu } from './SelectorProductosMenu';
import type { DatosFormularioMenuEjecutivo, ErroresMenuEjecutivo } from './validarMenuEjecutivo';

interface CamposMenuEjecutivoProps {
  datos: DatosFormularioMenuEjecutivo;
  errores: ErroresMenuEjecutivo;
  productos: ProductoSeleccionable[];
  secciones: SeccionMenu[];
  onCambiar: <K extends keyof DatosFormularioMenuEjecutivo>(
    campo: K,
    valor: DatosFormularioMenuEjecutivo[K],
  ) => void;
}

function CampoNombre({ datos, errores, onCambiar }: CamposMenuEjecutivoProps) {
  return (
    <FormField id="nombre" label="Nombre" required error={errores.nombre}>
      <Input
        id="nombre"
        autoFocus
        maxLength={100}
        value={datos.nombre}
        aria-invalid={Boolean(errores.nombre)}
        onChange={(evento) => onCambiar('nombre', evento.currentTarget.value)}
      />
    </FormField>
  );
}

function CampoPrecio({ datos, errores, onCambiar }: CamposMenuEjecutivoProps) {
  return (
    <FormField id="precio-fijo" label="Precio fijo" required error={errores.precio_fijo}>
      <Input
        id="precio-fijo"
        inputMode="decimal"
        value={datos.precio_fijo}
        aria-invalid={Boolean(errores.precio_fijo)}
        onChange={(evento) => onCambiar('precio_fijo', evento.currentTarget.value)}
      />
    </FormField>
  );
}

function CampoSeccion({ secciones, datos, errores, onCambiar }: CamposMenuEjecutivoProps) {
  return (
    <FormField id="seccion" label="Sección" required error={errores.seccion_id}>
      <Select
        id="seccion"
        value={datos.seccion_id}
        aria-invalid={Boolean(errores.seccion_id)}
        onChange={(evento) => onCambiar('seccion_id', evento.currentTarget.value)}
      >
        <option value="">Elegí una sección</option>
        {secciones.map((seccion) => (
          <option key={seccion.id} value={seccion.id}>
            {seccion.nombre}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

function CampoProductos({ productos, datos, errores, onCambiar }: CamposMenuEjecutivoProps) {
  return (
    <FormField
      id="producto-ids"
      label="Productos incluidos"
      required
      error={errores.producto_ids}
      className="sm:col-span-2"
    >
      <SelectorProductosMenu
        productos={productos}
        seleccionados={datos.producto_ids}
        error={errores.producto_ids}
        onCambiar={(ids) => onCambiar('producto_ids', ids)}
      />
    </FormField>
  );
}

function CampoDescripcion({ datos, errores, onCambiar }: CamposMenuEjecutivoProps) {
  return (
    <FormField
      id="descripcion"
      label="Descripción"
      error={errores.descripcion}
      className="sm:col-span-2"
    >
      <Textarea
        id="descripcion"
        maxLength={500}
        value={datos.descripcion}
        aria-invalid={Boolean(errores.descripcion)}
        onChange={(evento) => onCambiar('descripcion', evento.currentTarget.value)}
      />
    </FormField>
  );
}

export function CamposMenuEjecutivo(props: CamposMenuEjecutivoProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CampoNombre {...props} />
      <CampoPrecio {...props} />
      <CampoSeccion {...props} />
      <CampoProductos {...props} />
      <CampoDescripcion {...props} />
    </div>
  );
}
