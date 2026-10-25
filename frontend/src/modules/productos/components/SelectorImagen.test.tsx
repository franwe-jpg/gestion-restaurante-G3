import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectorImagen } from './SelectorImagen';

const MB = 1024 * 1024;

function archivo(nombre: string, tipo: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

function abrir() {
  const onCambiar = vi.fn();
  render(<SelectorImagen onCambiar={onCambiar} />);
  return { onCambiar };
}

function elegir(etiqueta: string, ...archivos: File[]) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { files: archivos } });
}

beforeEach(() => {
  Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:vista-previa'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
  vi.restoreAllMocks();
});

describe('SelectorImagen: opciones', () => {
  it('ofrece «Elegir archivo» y «Sacar foto» con captura de cámara (CA 11)', () => {
    abrir();

    expect(screen.getByRole('button', { name: 'Elegir archivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sacar foto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Foto de la cámara')).toHaveAttribute('capture', 'environment');
    expect(screen.getByLabelText('Archivo de imagen')).not.toHaveAttribute('capture');
    expect(screen.getByLabelText('Archivo de imagen')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif',
    );
  });

  it('cada botón abre su selector', () => {
    abrir();
    const clic = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Sacar foto' }));
    expect(clic.mock.instances[0]).toBe(screen.getByLabelText('Foto de la cámara'));

    fireEvent.click(screen.getByRole('button', { name: 'Elegir archivo' }));
    expect(clic.mock.instances[1]).toBe(screen.getByLabelText('Archivo de imagen'));
  });
});

describe('SelectorImagen: elegir y quitar', () => {
  it('muestra la vista previa de un JPG y avisa el archivo (CA 11)', () => {
    const { onCambiar } = abrir();
    const foto = archivo('foto.jpg', 'image/jpeg');

    elegir('Archivo de imagen', foto);

    expect(screen.getByAltText('Vista previa de la imagen')).toHaveAttribute(
      'src',
      'blob:vista-previa',
    );
    expect(onCambiar).toHaveBeenLastCalledWith(foto);
  });

  it('acepta la foto sacada con la cámara', () => {
    const { onCambiar } = abrir();
    const foto = archivo('camara.png', 'image/png');

    elegir('Foto de la cámara', foto);

    expect(onCambiar).toHaveBeenLastCalledWith(foto);
    expect(screen.getByAltText('Vista previa de la imagen')).toBeInTheDocument();
  });

  it('quita la imagen, libera la vista previa y avisa null', () => {
    const { onCambiar } = abrir();
    elegir('Archivo de imagen', archivo('foto.jpg', 'image/jpeg'));

    fireEvent.click(screen.getByRole('button', { name: 'Quitar imagen' }));

    expect(onCambiar).toHaveBeenLastCalledWith(null);
    expect(screen.queryByAltText('Vista previa de la imagen')).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:vista-previa');
  });

  it('un HEIC sin vista previa muestra su nombre y su tamaño (S11)', () => {
    abrir();

    elegir('Archivo de imagen', archivo('IMG_0001.HEIC', '', 2 * MB));

    expect(screen.getByText('IMG_0001.HEIC')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.queryByAltText('Vista previa de la imagen')).not.toBeInTheDocument();
  });
});

describe('SelectorImagen: rechazos antes de enviar', () => {
  it('rechaza un archivo de 6 MB con el mensaje de tamaño (CA 10)', () => {
    const { onCambiar } = abrir();

    elegir('Archivo de imagen', archivo('grande.jpg', 'image/jpeg', 6 * MB));

    expect(
      screen.getByText('La imagen debe ser JPG, PNG o HEIC y pesar hasta 5 MB.'),
    ).toBeVisible();
    expect(onCambiar).not.toHaveBeenCalled();
    expect(screen.queryByAltText('Vista previa de la imagen')).not.toBeInTheDocument();
  });

  it('acepta un archivo de exactamente 5 MB', () => {
    const { onCambiar } = abrir();
    const justo = archivo('justo.png', 'image/png', 5 * MB);

    elegir('Archivo de imagen', justo);

    expect(onCambiar).toHaveBeenCalledWith(justo);
    expect(screen.queryByText(/pesar hasta 5 MB/)).not.toBeInTheDocument();
  });

  it('rechaza un formato que no es JPG, PNG ni HEIC', () => {
    const { onCambiar } = abrir();

    elegir('Archivo de imagen', archivo('menu.pdf', 'application/pdf'));

    expect(screen.getByText(/JPG, PNG o HEIC/)).toBeInTheDocument();
    expect(onCambiar).not.toHaveBeenCalled();
  });

  it('un rechazo conserva la imagen ya elegida y un acierto borra el mensaje', () => {
    abrir();
    elegir('Archivo de imagen', archivo('uno.jpg', 'image/jpeg'));

    elegir('Archivo de imagen', archivo('grande.jpg', 'image/jpeg', 6 * MB));
    expect(screen.getByAltText('Vista previa de la imagen')).toBeInTheDocument();
    expect(screen.getByText(/pesar hasta 5 MB/)).toBeInTheDocument();

    elegir('Archivo de imagen', archivo('dos.jpg', 'image/jpeg'));
    expect(screen.queryByText(/pesar hasta 5 MB/)).not.toBeInTheDocument();
  });

  it('si se cancela el diálogo sin archivo no cambia nada', () => {
    const { onCambiar } = abrir();

    elegir('Archivo de imagen');

    expect(onCambiar).not.toHaveBeenCalled();
  });
});
