import { useState } from 'react';

import { useToast } from '../../../shared/hooks/useToast';
import type { RespuestaApi } from '../../../shared/types';
import type { Persona, PersonaCrear, PersonaModificar } from '../types';

import type { TipoPersona } from './tipoPersona';
import { conInicial } from './tipoPersona';
import { errorDelServidor, validarPersona } from './validarPersona';
import type { DatosFormularioPersona, ErrorDelServidor } from './validarPersona';

export interface OpcionesFormularioPersona {
  persona: Persona | null;
  tipo: TipoPersona;
  crear: (datos: PersonaCrear) => Promise<RespuestaApi<Persona>>;
  modificar: (id: number, datos: PersonaModificar) => Promise<RespuestaApi<Persona>>;
  onGuardado: () => void;
}

const VACIA = { dni: '', nombre: '', apellido: '', telefono: '', correo: '' };

function useCamposPersona(persona: Persona | null) {
  const inicial = persona ?? VACIA;
  const [dni, setDni] = useState(inicial.dni);
  const [nombre, setNombre] = useState(inicial.nombre);
  const [apellido, setApellido] = useState(inicial.apellido);
  const [telefono, setTelefono] = useState(inicial.telefono ?? '');
  const [correo, setCorreo] = useState(inicial.correo ?? '');
  const [contrasena, setContrasena] = useState('');
  return {
    campos: { dni, nombre, apellido, telefono, correo, contrasena },
    setDni,
    setNombre,
    setApellido,
    setTelefono,
    setCorreo,
    setContrasena,
  };
}

/** La contraseña vacía conserva la actual: al modificar solo se envía si se escribió una. */
function armarDatos(campos: DatosFormularioPersona): PersonaModificar {
  const datos: PersonaModificar = {
    dni: campos.dni.trim(),
    nombre: campos.nombre.trim(),
    apellido: campos.apellido.trim(),
    telefono: campos.telefono.trim() || null,
    correo: campos.correo.trim(),
  };
  return campos.contrasena === '' ? datos : { ...datos, contrasena: campos.contrasena };
}

/**
 * Formulario de alta y modificación de una persona del salón (mozo o chef) con sus credenciales.
 * La contraseña es obligatoria al crear y al editar una persona que todavía no tiene usuario.
 */
export function useFormularioPersona({
  persona,
  tipo,
  crear,
  modificar,
  onGuardado,
}: OpcionesFormularioPersona) {
  const { mostrarToast } = useToast();
  const estado = useCamposPersona(persona);
  const [errores, setErrores] = useState<ErrorDelServidor>({});
  const [enviando, setEnviando] = useState(false);
  const contrasenaObligatoria = persona === null || persona.correo === null;

  const enviar = async () => {
    if (enviando) return;
    const locales = validarPersona(estado.campos, { contrasenaObligatoria });
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;

    setEnviando(true);
    const datos = armarDatos(estado.campos);
    const respuesta =
      persona === null
        ? await crear({ ...datos, contrasena: estado.campos.contrasena })
        : await modificar(persona.id, datos);
    setEnviando(false);

    if (respuesta.exito) {
      const accion = persona === null ? 'creado' : 'modificado';
      mostrarToast({ titulo: `${conInicial(tipo)} ${accion}`, variante: 'success' });
      onGuardado();
      return;
    }
    const verbo = persona === null ? 'crear' : 'modificar';
    setErrores(errorDelServidor(respuesta.error ?? `No se pudo ${verbo} el ${tipo}`));
  };

  return { ...estado.campos, ...estado, contrasenaObligatoria, errores, enviando, enviar };
}
