import { useState } from 'react';

import { Alert } from '../../../shared/components/ui/alert';
import { Button } from '../../../shared/components/ui/button';
import { Dialog } from '../../../shared/components/ui/dialog';
import { FormField } from '../../../shared/components/ui/form-field';
import { Input } from '../../../shared/components/ui/input';
import { modificarCliente } from '../api';
import type { Cliente } from '../types';

interface ClienteFormDialogProps {
  cliente: Cliente;
  onGuardado: (actualizado: Cliente) => void;
  onOpenChange: (abierto: boolean) => void;
}

interface CamposClienteProps {
  nombre: string;
  telefono: string;
  errores: { nombre?: string; telefono?: string; general?: string };
  setNombre: (valor: string) => void;
  setTelefono: (valor: string) => void;
}

function CamposCliente({ nombre, telefono, errores, setNombre, setTelefono }: CamposClienteProps) {
  return (
    <div className="space-y-4">
      {errores.general && <Alert variant="danger">{errores.general}</Alert>}
      <FormField id="cliente-nombre" label="Nombre" required error={errores.nombre}>
        <Input
          id="cliente-nombre"
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
        />
      </FormField>
      <FormField id="cliente-telefono" label="Teléfono" required error={errores.telefono}>
        <Input
          id="cliente-telefono"
          value={telefono}
          onChange={(evento) => setTelefono(evento.target.value)}
        />
      </FormField>
    </div>
  );
}

function validarCliente(nombre: string, telefono: string) {
  return {
    nombre: !nombre.trim()
      ? 'El nombre es obligatorio'
      : !/^[\p{L}]+(?: [\p{L}]+)*$/u.test(nombre.trim())
        ? 'El nombre debe contener solo letras'
        : undefined,
    telefono: !telefono.trim()
      ? 'El teléfono es obligatorio'
      : !/^\+?[0-9 -]+$/.test(telefono.trim())
        ? 'El teléfono solo admite dígitos, espacios, guiones y + al inicio'
        : undefined,
  };
}

export function ClienteFormDialog({ cliente, onGuardado, onOpenChange }: ClienteFormDialogProps) {
  const [nombre, setNombre] = useState(cliente.nombre);
  const [telefono, setTelefono] = useState(cliente.telefono);
  const [errores, setErrores] = useState<{ nombre?: string; telefono?: string; general?: string }>(
    {},
  );
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    const nuevosErrores = validarCliente(nombre, telefono);
    setErrores(nuevosErrores);
    if (nuevosErrores.nombre || nuevosErrores.telefono) return;
    setEnviando(true);
    const respuesta = await modificarCliente(cliente.id, {
      nombre: nombre.trim(),
      telefono: telefono.trim(),
    });
    setEnviando(false);
    if (respuesta.exito && respuesta.datos) onGuardado(respuesta.datos);
    else setErrores({ general: respuesta.error ?? 'No se pudo modificar el cliente' });
  }

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Modificar cliente"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={enviando}>
            Guardar
          </Button>
        </>
      }
    >
      <CamposCliente
        nombre={nombre}
        telefono={telefono}
        errores={errores}
        setNombre={setNombre}
        setTelefono={setTelefono}
      />
    </Dialog>
  );
}
