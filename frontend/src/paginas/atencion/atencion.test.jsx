import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { describirCambio, Historial } from '../solicitudes/Historial.jsx';
import { AccionesConformidad, AccionesTecnico, validarSolucion } from './AccionesAtencion.jsx';
import { Atencion } from './Atencion.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), subir: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));

const base = { id: 4, codigo: 'MSU-2026-0004', version: 5, limite_atencion: '2026-10-16T21:00:00Z' };
const recargar = vi.fn();

describe('P08 Atención técnica (HU10, HU11)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('la bandeja pide solo pendientes ordenadas por vencimiento', async () => {
    api.get.mockResolvedValue({ items: [], pagina: 1, 'tamaño': 10, total: 0 });
    render(<MemoryRouter><Atencion /></MemoryRouter>);
    expect(await screen.findByText('No tienes asignaciones con este estado.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/solicitudes', expect.objectContaining({ estado: 'PENDIENTES', orden: 'vencimiento' }));
  });

  it('HU10: inicia la atención enviando la versión', async () => {
    api.post.mockResolvedValue({});
    render(<AccionesTecnico solicitud={{ ...base, estado_codigo: 'ASIGNADA' }} recargar={recargar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar atención' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes/4/inicio', { version: 5 });
    expect(await screen.findByText(/pasó a En atención/)).toBeInTheDocument();
    expect(recargar).toHaveBeenCalled();
  });

  it('HU11 BDD 2: una solución corta no se envía', async () => {
    render(<AccionesTecnico solicitud={{ ...base, estado_codigo: 'EN_ATENCION' }} recargar={recargar} />);
    await userEvent.type(screen.getByLabelText(/Solución aplicada/), 'Listo.');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar solución' }));
    expect(screen.getByText(/al menos 20 caracteres/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(validarSolucion('Se cambió el cable HDMI del proyector.')).toBeNull();
  });

  it('HU24: un conflicto de versión avisa y recarga', async () => {
    api.post.mockRejectedValue(new ErrorApi(409, { codigo: 'CONFLICTO_VERSION', mensaje: 'Otro usuario modificó la solicitud.' }));
    render(<AccionesTecnico solicitud={{ ...base, estado_codigo: 'ASIGNADA' }} recargar={recargar} />);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar atención' }));
    expect(await screen.findByText(/Se recargó el caso/)).toBeInTheDocument();
    expect(recargar).toHaveBeenCalled();
  });
});

describe('P06 Conformidad (HU12)', () => {
  const resuelta = { ...base, estado_codigo: 'RESUELTA', ultima_resolucion_en: '2026-10-16T13:00:00Z' };
  const dentro = Date.parse('2026-10-17T13:00:00Z');
  beforeEach(() => vi.clearAllMocks());

  it('confirma la solución dentro de la ventana', async () => {
    api.post.mockResolvedValue({});
    render(<AccionesConformidad solicitud={resuelta} recargar={recargar} ahora={dentro} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar solución' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes/4/conformidad', { accion: 'CONFIRMAR', version: 5 });
  });

  it('reabrir exige motivo antes de enviar', async () => {
    api.post.mockResolvedValue({});
    render(<AccionesConformidad solicitud={resuelta} recargar={recargar} ahora={dentro} />);
    await userEvent.click(screen.getByRole('button', { name: 'El problema persiste' }));
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }));
    expect(within(dialogo).getByText(/El motivo es obligatorio/)).toBeInTheDocument();
    await userEvent.type(within(dialogo).getByLabelText(/Qué sigue fallando/), 'Se apaga a los diez minutos');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes/4/conformidad', { accion: 'REABRIR', motivo: 'Se apaga a los diez minutos', version: 5 });
  });

  it('BDD 2: pasadas 72 horas ya no ofrece reabrir', () => {
    render(<AccionesConformidad solicitud={resuelta} recargar={recargar} ahora={Date.parse('2026-10-19T14:00:00Z')} />);
    expect(screen.getByText(/Terminó el periodo de 72 horas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'El problema persiste' })).not.toBeInTheDocument();
  });
});

describe('Historial (HU23)', () => {
  it('muestra actor, acción, cambio y motivo de una reasignación', async () => {
    api.get.mockResolvedValue([{
      id: 1, accion: 'REASIGNAR', actor_nombre: 'Sara Supervisora', creado_en: '2026-10-16T15:00:00Z',
      anterior: { tecnico_nombre: 'Tomás Soporte' }, nuevo: { tecnico_nombre: 'Diana Flores' }, motivo: 'Tomás está de licencia',
    }]);
    render(<Historial id={4} />);
    expect(await screen.findByText('Sara Supervisora')).toBeInTheDocument();
    expect(screen.getByText('Tomás Soporte → Diana Flores')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Tomás está de licencia')).toBeInTheDocument();
    expect(describirCambio({ accion: 'EVALUAR', anterior: { estado_codigo: 'REGISTRADA' }, nuevo: { estado_codigo: 'EN_EVALUACION' } }))
      .toBe('Registrada → En evaluación');
  });
});
