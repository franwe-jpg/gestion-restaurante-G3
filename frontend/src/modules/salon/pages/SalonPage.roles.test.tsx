import { fireEvent, render as renderBase, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/components/ui/toast';
import { usarRoles } from '../../../test/sesionDePrueba';
import {
  crearChef,
  crearMozo,
  listarChefs,
  listarMesas,
  listarMozos,
  listarSectores,
} from '../api';
import type { Chef, Mesa, Mozo, Sector } from '../types';

import { SalonPage } from './SalonPage';

vi.mock('../api');

const SECTOR: Sector = {
  id: 1,
  nombre: 'Salón principal',
  descripcion: null,
  estado: 'HABILITADO',
};
const MESA: Mesa = {
  id: 1,
  numero: 1,
  capacidad: 2,
  sector: { id: 1, nombre: 'Salón principal' },
  estado: 'LIBRE',
};
const MOZO: Mozo = {
  id: 1,
  dni: '30123456',
  nombre: 'Juan',
  apellido: 'Fernández',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'juan@resto.com',
};
const MOZO_SIN_USUARIO: Mozo = { ...MOZO, id: 2, dni: '35987654', nombre: 'Ana', correo: null };
const CHEF: Chef = {
  id: 4,
  dni: '28111222',
  nombre: 'Marta',
  apellido: 'Gómez',
  telefono: null,
  estado: 'HABILITADO',
  correo: 'marta@resto.com',
};

function pagina<T>(items: T[], total = items.length) {
  return { datos: { items, total, limit: 50, offset: 0 }, exito: true };
}

function UbicacionActual() {
  const ubicacion = useLocation();
  return <p data-testid="ubicacion">{ubicacion.pathname + ubicacion.search}</p>;
}

function render(ui: ReactElement) {
  return renderBase(
    <MemoryRouter initialEntries={['/salon']}>
      <ToastProvider>{ui}</ToastProvider>
      <UbicacionActual />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(listarSectores).mockResolvedValue(pagina([SECTOR]));
  vi.mocked(listarMesas).mockResolvedValue(pagina([MESA]));
  vi.mocked(listarMozos).mockResolvedValue(pagina([MOZO, MOZO_SIN_USUARIO]));
  vi.mocked(listarChefs).mockResolvedValue(pagina([CHEF]));
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('Salón: el encargado gestiona todo', () => {
  beforeEach(() => usarRoles(['ENCARGADO']));

  it('muestra el título «Salón, Mozos y Chefs», las cuatro pestañas y las cuatro altas', async () => {
    render(<SalonPage />);

    expect(screen.getByRole('heading', { name: 'Salón, Mozos y Chefs' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((pestana) => pestana.textContent)).toEqual([
      'Sectores',
      'Mesas',
      'Mozos',
      'Chefs',
    ]);
    for (const nombre of ['Nuevo sector', 'Nueva mesa', 'Nuevo mozo', 'Nuevo chef']) {
      expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument();
    }
    expect(await screen.findByText('Salón principal')).toBeInTheDocument();
  });

  it('«Mozos» muestra el correo o «Sin usuario»', async () => {
    render(<SalonPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Mozos' }));

    expect(await screen.findByText('juan@resto.com')).toBeInTheDocument();
    expect(screen.getByText('Sin usuario')).toBeInTheDocument();
  });

  it('«Chefs» lista los chefs con su correo', async () => {
    render(<SalonPage />);

    fireEvent.click(screen.getByRole('tab', { name: 'Chefs' }));

    expect(await screen.findByText('Gómez, Marta')).toBeInTheDocument();
    expect(screen.getByText('marta@resto.com')).toBeInTheDocument();
    expect(listarChefs).toHaveBeenCalledWith(50, 0);
    expect(screen.getByRole('button', { name: 'Editar el chef 28111222' })).toBeInTheDocument();
  });
});

describe('Salón: el encargado crea chefs y mozos', () => {
  beforeEach(() => usarRoles(['ENCARGADO']));

  it('crea un chef desde la pestaña: el diálogo se cierra, avisa y el chef aparece', async () => {
    const creado: Chef = {
      ...CHEF,
      id: 9,
      dni: '29555666',
      nombre: 'Rita',
      correo: 'rita@resto.com',
    };
    vi.mocked(listarChefs)
      .mockResolvedValueOnce(pagina([CHEF]))
      .mockResolvedValue(pagina([CHEF, creado]));
    vi.mocked(crearChef).mockResolvedValue({ datos: creado, exito: true });
    render(<SalonPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Chefs' }));
    await screen.findByText('Gómez, Marta');

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo chef' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo chef' });
    fireEvent.change(within(dialogo).getByLabelText(/DNI/), { target: { value: '29555666' } });
    fireEvent.change(within(dialogo).getByLabelText(/Nombre/), { target: { value: 'Rita' } });
    fireEvent.change(within(dialogo).getByLabelText(/Apellido/), { target: { value: 'Gómez' } });
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), {
      target: { value: 'rita@resto.com' },
    });
    fireEvent.change(within(dialogo).getByLabelText(/Contraseña/), {
      target: { value: 'clave-1234' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar chef' }));

    expect(await screen.findByText('Chef creado')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findByText('rita@resto.com')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chefs' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Salón: el encargado crea mozos', () => {
  beforeEach(() => usarRoles(['ENCARGADO']));

  it('crea un mozo con correo y contraseña: aparece en el listado con su correo', async () => {
    const creado: Mozo = {
      ...MOZO,
      id: 7,
      dni: '40111222',
      nombre: 'Luis',
      correo: 'luis@resto.com',
    };
    vi.mocked(listarMozos).mockResolvedValue(pagina([creado]));
    vi.mocked(crearMozo).mockResolvedValue({ datos: creado, exito: true });
    render(<SalonPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo mozo' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo mozo' });
    fireEvent.change(within(dialogo).getByLabelText(/DNI/), { target: { value: '40111222' } });
    fireEvent.change(within(dialogo).getByLabelText(/Nombre/), { target: { value: 'Luis' } });
    fireEvent.change(within(dialogo).getByLabelText(/Apellido/), { target: { value: 'Castro' } });
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), {
      target: { value: 'luis@resto.com' },
    });
    fireEvent.change(within(dialogo).getByLabelText(/Contraseña/), {
      target: { value: 'clave-1234' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Guardar mozo' }));

    expect(await screen.findByText('luis@resto.com')).toBeInTheDocument();
    expect(crearMozo).toHaveBeenCalledWith(
      expect.objectContaining({ correo: 'luis@resto.com', contrasena: 'clave-1234' }),
    );
  });
});

describe('Salón: el mozo solo consulta sectores y mesas', () => {
  beforeEach(() => usarRoles(['MOZO']));

  it('ve solo las pestañas Sectores y Mesas y ninguna alta', async () => {
    render(<SalonPage />);

    expect(screen.getAllByRole('tab').map((pestana) => pestana.textContent)).toEqual([
      'Sectores',
      'Mesas',
    ]);
    expect(screen.queryByRole('tab', { name: 'Mozos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Chefs' })).not.toBeInTheDocument();
    for (const nombre of ['Nuevo sector', 'Nueva mesa', 'Nuevo mozo', 'Nuevo chef']) {
      expect(screen.queryByRole('button', { name: nombre })).not.toBeInTheDocument();
    }
    expect(await screen.findByText('Salón principal')).toBeInTheDocument();
  });

  it('los sectores y las mesas no tienen acciones de edición ni baja', async () => {
    render(<SalonPage />);
    await screen.findByText('Salón principal');

    expect(screen.queryByRole('button', { name: /Editar|Eliminar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Acciones' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Mesas' }));
    expect((await screen.findAllByText('Libre')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Editar|Eliminar/ })).not.toBeInTheDocument();
  });
});

describe('Salón: el mozo opera comandas y no ve la gestión', () => {
  beforeEach(() => usarRoles(['MOZO']));

  it('puede abrir una comanda desde una mesa libre (opera comandas)', async () => {
    render(<SalonPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mesas' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir comanda en la mesa 1' }));

    expect(screen.getByTestId('ubicacion')).toHaveTextContent('/atencion?mesa=1');
  });

  it('no consulta mozos ni chefs (evita el 403)', async () => {
    render(<SalonPage />);
    await screen.findByText('Salón principal');

    expect(listarMozos).not.toHaveBeenCalled();
    expect(listarChefs).not.toHaveBeenCalled();
  });

  it('un usuario con roles de mozo y chef ve lo mismo que el mozo', async () => {
    usarRoles(['MOZO', 'CHEF']);
    render(<SalonPage />);
    await screen.findByText('Salón principal');

    expect(screen.queryByRole('tab', { name: 'Mozos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nuevo chef' })).not.toBeInTheDocument();
  });
});
