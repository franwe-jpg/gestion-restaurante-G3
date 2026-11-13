import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { Textarea } from '../../../shared/components/ui/textarea';
import type { ProductoMenu, TipoPromocion } from '../types';

import { SelectorDiasSemana } from './SelectorDiasSemana';
import { SelectorProductosMenu } from './SelectorProductosMenu';
import type { DatosFormularioPromocion, ErroresPromocion } from './validarPromocion';

const TIPOS: { valor: TipoPromocion; etiqueta: string }[] = [
  { valor: 'PORCENTAJE', etiqueta: 'Porcentaje' },
  { valor: 'PRECIO_FIJO', etiqueta: 'Precio fijo' },
  { valor: 'NXM', etiqueta: 'Cantidad NxM' },
];

interface CamposPromocionProps {
  datos: DatosFormularioPromocion;
  errores: ErroresPromocion;
  productos: ProductoMenu[];
  onCambiar: <K extends keyof DatosFormularioPromocion>(
    campo: K,
    valor: DatosFormularioPromocion[K],
  ) => void;
  onCambiarTipo: (tipo: TipoPromocion) => void;
}

function CampoNombre({ datos, errores, onCambiar }: CamposPromocionProps) {
  return (
    <FormField id="promocion-nombre" label="Nombre" required error={errores.nombre}>
      <Input
        id="promocion-nombre"
        autoFocus
        maxLength={100}
        value={datos.nombre}
        aria-invalid={Boolean(errores.nombre)}
        onChange={(evento) => onCambiar('nombre', evento.currentTarget.value)}
      />
    </FormField>
  );
}

function CampoTipo({ datos, onCambiarTipo }: CamposPromocionProps) {
  return (
    <FormField id="promocion-tipo" label="Tipo de promoción" required>
      <Select
        id="promocion-tipo"
        value={datos.tipo}
        onChange={(evento) => onCambiarTipo(evento.currentTarget.value as TipoPromocion)}
      >
        {TIPOS.map((tipo) => (
          <option key={tipo.valor} value={tipo.valor}>
            {tipo.etiqueta}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

function CampoDescripcion({ datos, errores, onCambiar }: CamposPromocionProps) {
  return (
    <FormField
      id="promocion-descripcion"
      label="Descripción"
      error={errores.descripcion}
      className="sm:col-span-2"
    >
      <Textarea
        id="promocion-descripcion"
        maxLength={500}
        value={datos.descripcion}
        onChange={(evento) => onCambiar('descripcion', evento.currentTarget.value)}
      />
    </FormField>
  );
}

function CampoProductos({ datos, errores, productos, onCambiar }: CamposPromocionProps) {
  return (
    <FormField
      id="promocion-productos"
      label="Productos a los que aplica"
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

function CampoFechas({ datos, errores, onCambiar }: CamposPromocionProps) {
  return (
    <>
      <FormField
        id="promocion-fecha-desde"
        label="Vigente desde"
        required
        error={errores.fecha_desde}
      >
        <Input
          id="promocion-fecha-desde"
          type="date"
          value={datos.fecha_desde}
          onChange={(evento) => onCambiar('fecha_desde', evento.currentTarget.value)}
        />
      </FormField>
      <FormField
        id="promocion-fecha-hasta"
        label="Vigente hasta"
        required
        error={errores.fecha_hasta}
      >
        <Input
          id="promocion-fecha-hasta"
          type="date"
          value={datos.fecha_hasta}
          onChange={(evento) => onCambiar('fecha_hasta', evento.currentTarget.value)}
        />
      </FormField>
    </>
  );
}

function CampoHorario({ datos, errores, onCambiar }: CamposPromocionProps) {
  return (
    <>
      <FormField
        id="promocion-hora-desde"
        label="Hora desde"
        hint="Opcional: si queda vacía, aplica todo el día."
        error={errores.hora_desde}
      >
        <Input
          id="promocion-hora-desde"
          type="time"
          value={datos.hora_desde}
          onChange={(evento) => onCambiar('hora_desde', evento.currentTarget.value)}
        />
      </FormField>
      <FormField id="promocion-hora-hasta" label="Hora hasta" error={errores.hora_hasta}>
        <Input
          id="promocion-hora-hasta"
          type="time"
          value={datos.hora_hasta}
          onChange={(evento) => onCambiar('hora_hasta', evento.currentTarget.value)}
        />
      </FormField>
    </>
  );
}

function CampoDias({ datos, errores, onCambiar }: CamposPromocionProps) {
  return (
    <FormField
      id="promocion-dias"
      label="Días de la semana"
      required
      error={errores.dias_semana}
      className="sm:col-span-2"
    >
      <SelectorDiasSemana
        seleccionados={datos.dias_semana}
        error={errores.dias_semana}
        onCambiar={(dias) => onCambiar('dias_semana', dias)}
      />
    </FormField>
  );
}

function CampoPorcentaje({ datos, errores, onCambiar }: CamposPromocionProps) {
  if (datos.tipo !== 'PORCENTAJE') return null;
  return (
    <FormField
      id="promocion-porcentaje"
      label="Descuento (%)"
      required
      error={errores.descuento_porcentaje}
    >
      <Input
        id="promocion-porcentaje"
        inputMode="numeric"
        value={datos.descuento_porcentaje}
        onChange={(evento) => onCambiar('descuento_porcentaje', evento.currentTarget.value)}
      />
    </FormField>
  );
}

function CampoPrecioFijo({ datos, errores, onCambiar }: CamposPromocionProps) {
  if (datos.tipo !== 'PRECIO_FIJO') return null;
  return (
    <FormField id="promocion-precio-fijo" label="Precio fijo" required error={errores.precio_fijo}>
      <Input
        id="promocion-precio-fijo"
        inputMode="decimal"
        value={datos.precio_fijo}
        onChange={(evento) => onCambiar('precio_fijo', evento.currentTarget.value)}
      />
    </FormField>
  );
}

function CampoNxm({ datos, errores, onCambiar }: CamposPromocionProps) {
  if (datos.tipo !== 'NXM') return null;
  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      <FormField id="promocion-cant-lleva" label="Lleva" required>
        <Input
          id="promocion-cant-lleva"
          inputMode="numeric"
          value={datos.cant_lleva}
          onChange={(evento) => onCambiar('cant_lleva', evento.currentTarget.value)}
        />
      </FormField>
      <FormField id="promocion-cant-paga" label="Paga" required error={errores.cant_paga}>
        <Input
          id="promocion-cant-paga"
          inputMode="numeric"
          value={datos.cant_paga}
          onChange={(evento) => onCambiar('cant_paga', evento.currentTarget.value)}
        />
      </FormField>
    </div>
  );
}

export function CamposPromocion(props: CamposPromocionProps) {
  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-slate-700">Datos básicos</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNombre {...props} />
          <CampoTipo {...props} />
          <CampoDescripcion {...props} />
          <CampoProductos {...props} />
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-slate-700">Vigencia</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFechas {...props} />
          <CampoDias {...props} />
          <CampoHorario {...props} />
        </div>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-slate-700">Beneficio</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoPorcentaje {...props} />
          <CampoPrecioFijo {...props} />
          <CampoNxm {...props} />
        </div>
      </fieldset>
    </div>
  );
}
