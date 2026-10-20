import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EstadoBackend } from './EstadoBackend';

function respuestaJson(cuerpo: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: () => Promise.resolve(cuerpo),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('EstadoBackend', () => {
  it('muestra el estado cuando el backend responde ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({ estado: 'ok' })));

    render(<EstadoBackend />);

    expect(screen.getByText('Consultando /api/v1/salud...')).toBeInTheDocument();
    expect(await screen.findByText('Estado del servicio: ok')).toBeInTheDocument();
    expect(screen.getByText('Servicio activo')).toBeInTheDocument();
  });

  it('muestra un aviso cuando el backend no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<EstadoBackend />);

    expect(await screen.findByText('Error al contactar el backend')).toBeInTheDocument();
    expect(screen.getByText('No se pudo conectar con el backend')).toBeInTheDocument();
  });

  it('muestra el detalle de un error HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respuestaJson({ detalle: 'servicio no disponible' }, 503)),
    );

    render(<EstadoBackend />);

    expect(await screen.findByText('servicio no disponible')).toBeInTheDocument();
  });

  it('muestra el estado cuando la API responde con un valor distinto de ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson({ estado: 'degradado' })));

    render(<EstadoBackend />);

    expect(await screen.findByText('Estado del servicio: degradado')).toBeInTheDocument();
    expect(screen.getByText('Estado: degradado')).toBeInTheDocument();
  });
});
