import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { Auditoria, describirMetadatos } from './Auditoria.jsx';
import { Politicas, horasLegibles, validarPolitica } from './Politicas.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));

const detalles = [
  { prioridad_codigo: 'CRITICA', prioridad_nombre: 'Crítica', horas_primera_atencion: 4, horas_resolucion: 24 },
  { prioridad_codigo: 'ALTA', prioridad_nombre: 'Alta', horas_primera_atencion: 8, horas_resolucion: 48 },
  { prioridad_codigo: 'MEDIA', prioridad_nombre: 'Media', horas_primera_atencion: 24, horas_resolucion: 120 },
  { prioridad_codigo: 'BAJA', prioridad_nombre: 'Baja', horas_primera_atencion: 48, horas_resolucion: 240 },
];
const v1 = {
  id: 1, version: 1, vigente: true, vigente_desde: '2026-10-01T13:00:00Z', publicada_por: 'Ana Admin', solicitudes: 6, detalles,
};
const matriz = (cambios = {}) => Object.fromEntries(detalles.map((d) => [d.prioridad_codigo, {
  horas_primera_atencion: d.horas_primera_atencion, horas_resolucion: d.horas_resolucion, ...cambios[d.prioridad_codigo],
}]));

describe('P12 Políticas de plazos (HU22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue([v1]);
  });

  it('muestra la versión vigente con sus plazos y el historial', async () => {
    render(<Politicas />);
    expect(await screen.findByRole('heading', { name: 'Versión vigente: v1' })).toBeInTheDocument();
    expect(screen.getByText(/6 solicitudes la usan/)).toBeInTheDocument();
    expect(screen.getByText('120 h (5 días)')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /v1 · vigente/ })).toBeInTheDocument();
  });

  it('BDD 1: publica una matriz coherente enviando la versión base', async () => {
    api.post.mockResolvedValue({ ...v1, id: 2, version: 2 });
    render(<Politicas />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva versión' }));
    const alta = screen.getByRole('group', { name: 'Alta' });
    const atencion = within(alta).getByLabelText('Primera atención (horas)');
    await userEvent.clear(atencion);
    await userEvent.type(atencion, '6');
    await userEvent.click(screen.getByRole('button', { name: 'Revisar y publicar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
    expect(api.post).toHaveBeenCalledWith('/admin/politicas', expect.objectContaining({
      version_base: 1,
      detalles: expect.arrayContaining([{ prioridad_codigo: 'ALTA', horas_primera_atencion: 6, horas_resolucion: 48 }]),
    }));
    expect(await screen.findByText(/Se publicó la versión 2/)).toBeInTheDocument();
  });

  it('BDD 2: una primera atención mayor que la resolución no se envía y se indica el dato', async () => {
    render(<Politicas />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva versión' }));
    const alta = within(screen.getByRole('group', { name: 'Alta' })).getByLabelText('Primera atención (horas)');
    await userEvent.clear(alta);
    await userEvent.type(alta, '50');
    await userEvent.click(screen.getByRole('button', { name: 'Revisar y publicar' }));
    expect(screen.getByText('La primera atención (50 h) no puede superar la resolución (48 h).')).toBeInTheDocument();
    expect(alta).toHaveAttribute('aria-invalid', 'true');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('muestra junto al campo el error que devuelve el servidor', async () => {
    api.post.mockRejectedValue(new ErrorApi(409, { codigo: 'POLITICA_DESACTUALIZADA', mensaje: 'Otra persona publicó la versión 2.' }));
    render(<Politicas />);
    await userEvent.click(await screen.findByRole('button', { name: 'Nueva versión' }));
    const baja = within(screen.getByRole('group', { name: 'Baja' })).getByLabelText('Resolución (horas)');
    await userEvent.clear(baja);
    await userEvent.type(baja, '300');
    await userEvent.click(screen.getByRole('button', { name: 'Revisar y publicar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
    expect(await screen.findByText('Otra persona publicó la versión 2.')).toBeInTheDocument();
  });

  it('valida orden de urgencia y rangos como el servidor', () => {
    expect(validarPolitica(matriz())).toEqual({});
    expect(validarPolitica(matriz({ CRITICA: { horas_primera_atencion: 10 } })))
      .toHaveProperty(['CRITICA.horas_primera_atencion']);
    expect(validarPolitica(matriz({ MEDIA: { horas_resolucion: 0 } }))).toHaveProperty(['MEDIA.horas_resolucion']);
    expect(horasLegibles(48)).toBe('48 h (2 días)');
    expect(horasLegibles(8)).toBe('8 h');
  });
});

describe('P12 Auditoría administrativa (HU23)', () => {
  const registro = {
    id: 9, actor_id: 1, actor_nombre: 'Ana Admin', actor_correo: 'admin@msu.test', accion: 'USUARIO_ACTUALIZAR',
    entidad: 'USUARIO', entidad_id: '4', creada_en: '2026-11-11T15:00:00Z',
    metadatos: { correo: 'tecnico@msu.test', cambios: { rol: { anterior: 'TECNICO', nuevo: 'SUPERVISOR' } } },
  };
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((ruta) => Promise.resolve(ruta === '/admin/auditoria/opciones'
      ? { acciones: ['SESION_INICIAR', 'USUARIO_ACTUALIZAR'], entidades: ['USUARIO'] }
      : { items: [registro], pagina: 1, 'tamaño': 20, total: 1 }));
  });

  it('lista los registros con actor, acción y cambios legibles', async () => {
    render(<Auditoria />);
    const fila = await screen.findByRole('row', { name: /Ana Admin/ });
    expect(within(fila).getByText('Cambio de usuario')).toBeInTheDocument();
    expect(within(fila).getByText('rol: TECNICO → SUPERVISOR')).toBeInTheDocument();
    expect(within(fila).getByText('Usuario #4')).toBeInTheDocument();
  });

  it('filtra por acción y reinicia la página', async () => {
    render(<Auditoria />);
    await screen.findByRole('row', { name: /Ana Admin/ });
    await userEvent.selectOptions(screen.getByLabelText('Acción'), 'SESION_INICIAR');
    expect(api.get).toHaveBeenLastCalledWith('/admin/auditoria', expect.objectContaining({ accion: 'SESION_INICIAR', pagina: 1 }));
  });

  it('no consulta con un rango de fechas invertido', async () => {
    render(<Auditoria />);
    await screen.findByRole('row', { name: /Ana Admin/ });
    const llamadas = api.get.mock.calls.length;
    await userEvent.type(screen.getByLabelText('Desde'), '2026-11-10');
    await userEvent.type(screen.getByLabelText('Hasta'), '2026-11-01');
    expect(screen.getByText('La fecha final no puede ser anterior a la inicial.')).toBeInTheDocument();
    expect(api.get.mock.calls.slice(llamadas).filter(([r, p]) => r === '/admin/auditoria' && p.hasta === '2026-11-01'))
      .toHaveLength(0);
  });

  it('resume metadatos sin exponer objetos crudos', () => {
    expect(describirMetadatos({ filas: 3, filtros: { estado: 'PENDIENTES' } }))
      .toEqual(['filas: 3', 'filtros: estado=PENDIENTES']);
    expect(describirMetadatos({ matriz: {
      BAJA: { horas_primera_atencion: 48, horas_resolucion: 240 },
      ALTA: { horas_primera_atencion: 8, horas_resolucion: 48 },
    } })).toEqual(['matriz: ALTA 8/48 h · BAJA 48/240 h']);
    expect(describirMetadatos(null)).toEqual([]);
  });
});
