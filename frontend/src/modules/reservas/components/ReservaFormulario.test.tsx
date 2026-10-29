import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastContext } from '../../../shared/components/ui/toast-context';
import { crearReserva, modificarReserva } from '../api';
import type { Reserva } from '../types';

import { ReservaFormulario } from './ReservaFormulario';

vi.mock('../api');

const CREADA: Reserva = {
  id: 1,
  mesa_id: 5,
  cliente_id: 7,
  fecha: '2026-11-03',
  hora: '21:30',
  cantidad_personas: 4,
  estado: 'ACTIVA',
};

/** Fila `ACTIVA` que se abre en el panel de edición. */
const EXISTENTE: Reserva = { ...CREADA, id: 12 };

const mostrarToast = vi.fn();

function abrir(reserva?: Reserva) {
  const onCerrar = vi.fn();
  const onGuardado = vi.fn();
  render(
    <ToastContext.Provider value={{ mostrarToast }}>
      <ReservaFormulario reserva={reserva} onCerrar={onCerrar} onGuardado={onGuardado} />
    </ToastContext.Provider>,
  );
  return { onCerrar, onGuardado };
}

type Campos = Partial<Record<'cliente' | 'fecha' | 'hora' | 'cantidad' | 'mesa', string>>;

const ETIQUETAS = {
  cliente: /Cliente/,
  fecha: /Fecha/,
  hora: /Hora/,
  cantidad: /Cantidad de personas/,
  mesa: /Mesa/,
} as const;

function escribir(valores: Campos) {
  for (const [campo, valor] of Object.entries(valores)) {
    const etiqueta = ETIQUETAS[campo as keyof typeof ETIQUETAS];
    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
  }
}

function completar(campos: Campos = {}) {
  escribir({
    cliente: '7',
    fecha: '2026-11-03',
    hora: '21:30',
    cantidad: '4',
    mesa: '5',
    ...campos,
  });
}

function guardar() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar reserva' }));
}

beforeEach(() => {
  // Solo el reloj: los temporizadores reales siguen sirviendo a waitFor y findBy.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 2, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('ReservaFormulario: panel de alta', () => {
  it('se titula «Nueva reserva» y trae los campos y los botones', () => {
    abrir();

    expect(screen.getByRole('heading', { name: 'Nueva reserva' })).toBeInTheDocument();
    for (const etiqueta of Object.values(ETIQUETAS)) {
      expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Cerrar formulario' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeInTheDocument();
  });

  it.each([
    ['Cancelar', 'Cancelar'],
    ['Cerrar formulario', 'Cerrar formulario'],
  ])('«%s» cierra el panel sin enviar nada', (_nombre, boton) => {
    const { onCerrar, onGuardado } = abrir();
    completar();

    fireEvent.click(screen.getByRole('button', { name: boton }));

    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(onGuardado).not.toHaveBeenCalled();
    expect(crearReserva).not.toHaveBeenCalled();
  });
});

describe('ReservaFormulario: validación local', () => {
  it('con campos vacíos no envía y marca cada uno como obligatorio', () => {
    abrir();

    guardar();

    expect(screen.getAllByText(/es obligatori[oa]\./)).toHaveLength(5);
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it.each(['0', 'abc'])('con la cantidad %s advierte un entero positivo y no envía', (cantidad) => {
    abrir();
    completar({ cantidad });

    guardar();

    expect(screen.getByText(/cantidad de personas debe ser un entero positivo/)).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('con Cliente 0 y Mesa -1 advierte un entero positivo en cada campo', () => {
    abrir();
    completar({ cliente: '0', mesa: '-1' });

    guardar();

    expect(screen.getByText('El cliente debe ser un entero positivo.')).toBeVisible();
    expect(screen.getByText('La mesa debe ser un entero positivo.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('con una fecha anterior a hoy advierte y no envía', () => {
    abrir();
    completar({ fecha: '2026-11-01' });

    guardar();

    expect(screen.getByText('La fecha no puede ser anterior a hoy.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it.each(['11:30', '12:00'])('hoy con la hora %s advierte y no envía', (hora) => {
    abrir();
    completar({ fecha: '2026-11-02', hora });

    guardar();

    expect(screen.getByText('La hora debe ser posterior a la hora actual.')).toBeVisible();
    expect(crearReserva).not.toHaveBeenCalled();
  });

  it('hoy con la hora 12:01 sí envía (límite)', () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    abrir();
    completar({ fecha: '2026-11-02', hora: '12:01' });

    guardar();

    expect(crearReserva).toHaveBeenCalledTimes(1);
  });
});

describe('ReservaFormulario: envío', () => {
  it('envía los datos como números, avisa y notifica a quien lo abrió', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: CREADA, exito: true });
    const { onGuardado, onCerrar } = abrir();
    completar();

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(crearReserva).toHaveBeenCalledWith({
      mesa_id: 5,
      cliente_id: 7,
      fecha: '2026-11-03',
      hora: '21:30',
      cantidad_personas: 4,
    });
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Reserva creada', variante: 'success' }),
    );
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it('mientras envía deshabilita «Guardar reserva» para no duplicar el alta', async () => {
    let resolver: (valor: { datos: Reserva; exito: true }) => void = () => undefined;
    vi.mocked(crearReserva).mockReturnValue(new Promise((resolve) => (resolver = resolve)));
    abrir();
    completar();

    guardar();

    expect(await screen.findByRole('button', { name: 'Guardar reserva' })).toBeDisabled();
    resolver({ datos: CREADA, exito: true });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeEnabled(),
    );
  });
});

describe('ReservaFormulario: errores del servidor', () => {
  it.each([
    'La mesa 5 ya tiene una reserva activa el 2026-11-02 a las 21:30',
    'La mesa 99 no existe',
    'La fecha de la reserva no puede ser anterior a hoy',
  ])('muestra «%s» como error general y conserva los datos', async (detalle) => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    const { onGuardado } = abrir();
    completar();

    guardar();

    expect(await screen.findByText(detalle)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('5');
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('4');
    expect(screen.getByRole('heading', { name: 'Nueva reserva' })).toBeInTheDocument();
  });

  it('si la respuesta no trae detalle muestra un error general', async () => {
    vi.mocked(crearReserva).mockResolvedValue({ datos: null, exito: false });
    abrir();
    completar();

    guardar();

    expect(await screen.findByText('No se pudo crear la reserva')).toBeInTheDocument();
  });
});

describe('ReservaFormulario: panel de edición', () => {
  it('se titula «Modificar reserva» y trae los datos de la fila', () => {
    abrir(EXISTENTE);

    expect(screen.getByRole('heading', { name: 'Modificar reserva' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Nueva reserva' })).toBeNull();
    expect(screen.getByLabelText(ETIQUETAS.fecha)).toHaveValue('2026-11-03');
    expect(screen.getByLabelText(ETIQUETAS.hora)).toHaveValue('21:30');
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('4');
    expect(screen.getByRole('button', { name: 'Guardar reserva' })).toBeEnabled();
  });

  it('muestra Cliente y Mesa deshabilitados y deja editar los otros tres campos', () => {
    abrir(EXISTENTE);

    expect(screen.getByLabelText(ETIQUETAS.cliente)).toHaveValue('7');
    expect(screen.getByLabelText(ETIQUETAS.cliente)).toBeDisabled();
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toHaveValue('5');
    expect(screen.getByLabelText(ETIQUETAS.mesa)).toBeDisabled();
    for (const campo of ['fecha', 'hora', 'cantidad'] as const) {
      expect(screen.getByLabelText(ETIQUETAS[campo])).toBeEnabled();
    }
  });

  it.each(['Cancelar', 'Cerrar formulario'])('«%s» cierra el panel sin enviar el PUT', (boton) => {
    const { onCerrar, onGuardado } = abrir(EXISTENTE);
    escribir({ cantidad: '6' });

    fireEvent.click(screen.getByRole('button', { name: boton }));

    expect(onCerrar).toHaveBeenCalledTimes(1);
    expect(onGuardado).not.toHaveBeenCalled();
    expect(modificarReserva).not.toHaveBeenCalled();
  });
});

describe('ReservaFormulario: guardar la edición', () => {
  it('envía solo fecha, hora y cantidad, avisa y notifica a quien lo abrió', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: EXISTENTE, exito: true });
    const { onGuardado, onCerrar } = abrir(EXISTENTE);
    escribir({ fecha: '2026-11-04', hora: '20:00', cantidad: '6' });

    guardar();

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1));
    expect(modificarReserva).toHaveBeenCalledExactlyOnceWith(12, {
      fecha: '2026-11-04',
      hora: '20:00',
      cantidad_personas: 6,
    });
    expect(mostrarToast).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Reserva modificada', variante: 'success' }),
    );
    expect(crearReserva).not.toHaveBeenCalled();
    expect(onCerrar).not.toHaveBeenCalled();
  });

  it.each([
    [{ fecha: '2026-11-01' }, 'La fecha no puede ser anterior a hoy.'],
    [{ cantidad: '0' }, 'La cantidad de personas debe ser un entero positivo.'],
  ])('con %j advierte «%s» y no envía el PUT', (cambio, aviso) => {
    abrir(EXISTENTE);
    escribir(cambio);

    guardar();

    expect(screen.getByText(aviso)).toBeVisible();
    expect(modificarReserva).not.toHaveBeenCalled();
  });
});

describe('ReservaFormulario: errores de la edición', () => {
  it.each([
    'La mesa 5 ya tiene una reserva activa el 2026-11-03 a las 21:30',
    'La reserva 12 no está activa y no se puede modificar',
    'La reserva 12 no existe',
  ])('muestra «%s» como error general y deja el panel abierto', async (detalle) => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: null, exito: false, error: detalle });
    const { onGuardado } = abrir(EXISTENTE);
    escribir({ cantidad: '6' });

    guardar();

    expect(await screen.findByText(detalle)).toBeInTheDocument();
    expect(onGuardado).not.toHaveBeenCalled();
    expect(screen.getByLabelText(ETIQUETAS.cantidad)).toHaveValue('6');
    expect(screen.getByLabelText(ETIQUETAS.cliente)).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Modificar reserva' })).toBeInTheDocument();
  });

  it('si la respuesta no trae detalle muestra un error general de la modificación', async () => {
    vi.mocked(modificarReserva).mockResolvedValue({ datos: null, exito: false });
    abrir(EXISTENTE);

    guardar();

    expect(await screen.findByText('No se pudo modificar la reserva')).toBeInTheDocument();
  });
});
