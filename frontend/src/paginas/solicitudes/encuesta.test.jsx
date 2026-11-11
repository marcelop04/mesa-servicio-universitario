import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { EncuestaSatisfaccion, validarEncuesta } from './Encuesta.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), subir: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));

const cerrada = { id: 9, codigo: 'MSU-2026-0009', estado_codigo: 'CERRADA', version: 7 };

describe('P06 Encuesta de satisfacción (HU13)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no aparece si la solicitud no está cerrada', async () => {
    const { container } = render(<EncuestaSatisfaccion solicitud={{ ...cerrada, estado_codigo: 'RESUELTA' }} />);
    await act(async () => {});
    expect(container).toBeEmptyDOMElement();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('BDD 1: envía 4 puntos con el comentario recortado y confirma la recepción', async () => {
    api.get.mockResolvedValue(null);
    api.post.mockResolvedValue({ id: 1, calificacion: 4, comentario: 'Muy amables.', creada_en: '2026-11-11T15:00:00Z' });
    render(<EncuestaSatisfaccion solicitud={cerrada} />);
    await userEvent.click(await screen.findByLabelText(/Satisfecho$/));
    await userEvent.type(screen.getByLabelText(/Comentario/), '  Muy amables.  ');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes/9/encuesta', { calificacion: 4, comentario: 'Muy amables.' });
    expect(await screen.findByText('Gracias: recibimos tu calificación.')).toBeInTheDocument();
    expect(screen.getByText('4 de 5')).toBeInTheDocument();
  });

  it('exige elegir una calificación antes de enviar', async () => {
    api.get.mockResolvedValue(null);
    render(<EncuestaSatisfaccion solicitud={cerrada} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Enviar calificación' }));
    expect(screen.getByText('Elige una calificación de 1 a 5.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText(/Regular$/));
    expect(screen.queryByText('Elige una calificación de 1 a 5.')).not.toBeInTheDocument();
  });

  it('BDD 2: un caso ya calificado muestra la respuesta y no ofrece otro envío', async () => {
    api.get.mockResolvedValue({ id: 1, calificacion: 5, comentario: null, creada_en: '2026-11-10T15:00:00Z' });
    render(<EncuestaSatisfaccion solicitud={cerrada} />);
    expect(await screen.findByText('5 de 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar calificación' })).not.toBeInTheDocument();
  });

  it('BDD 2: si el servidor rechaza la duplicación, informa y recarga la respuesta', async () => {
    api.get.mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1, calificacion: 3, comentario: null, creada_en: '2026-11-10T15:00:00Z' });
    api.post.mockRejectedValue(new ErrorApi(409, { codigo: 'ENCUESTA_DUPLICADA', mensaje: 'Ya calificaste la solicitud.' }));
    render(<EncuestaSatisfaccion solicitud={cerrada} />);
    await userEvent.click(await screen.findByLabelText(/Regular$/));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar calificación' }));
    expect(await screen.findByText('3 de 5')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('valida el rango y el largo del comentario', () => {
    expect(validarEncuesta({ calificacion: 0, comentario: '' })).toHaveProperty('calificacion');
    expect(validarEncuesta({ calificacion: 3, comentario: 'x'.repeat(501) })).toHaveProperty('comentario');
    expect(validarEncuesta({ calificacion: 5, comentario: 'x'.repeat(500) })).toEqual({});
  });
});
