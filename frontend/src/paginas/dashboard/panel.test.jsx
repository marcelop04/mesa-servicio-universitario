import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Notificaciones } from '../notificaciones/Notificaciones.jsx';
import { Dashboard, horas, porcentaje, urlCsv } from './Dashboard.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));

const indicadores = {
  desde: '2026-09-18', hasta: '2026-10-17', area_id: null, generado_en: '2026-10-17T15:00:00Z',
  conteos: { registradas: 3, pendientes: 1, atendidas: 1, resueltas: 0, cerradas: 1, canceladas: 1, vencidas_activas: 1, porcentaje_solucionado: 50.0 },
  tiempos: { tiempo_medio_resolucion_horas: 6.0, base_tiempo: 1, cumplimiento_resolucion: 100.0, base_resolucion: 1, cumplimiento_primera_atencion: null, base_primera_atencion: 0 },
  satisfaccion: { promedio: null, encuestas: 0 },
  por_estado: [{ clave: 'REGISTRADA', etiqueta: 'Registrada', valor: 1 }, { clave: 'CERRADA', etiqueta: 'Cerrada', valor: 1 }],
  por_prioridad: [{ clave: 'ALTA', etiqueta: 'Alta', valor: 2 }],
  por_categoria: [{ clave: 'Gasfitería', etiqueta: 'Gasfitería', valor: 2 }],
  por_tecnico: [{ clave: 'Sin asignar', etiqueta: 'Sin asignar', valor: 2 }],
};

describe('P10 Dashboard (HU17 a HU19)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((ruta) => Promise.resolve(ruta === '/indicadores' ? indicadores : []));
  });

  it('muestra conteos, indicadores con su base y Sin datos cuando el denominador es cero', async () => {
    render(<Dashboard />);
    expect(await screen.findByText('Registradas')).toBeInTheDocument();
    expect(screen.getByText('50,0 %')).toBeInTheDocument();
    expect(screen.getByText('6,0 h')).toBeInTheDocument();
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('0 encuestas')).toBeInTheDocument();
    const porTecnico = screen.getByRole('region', { name: 'Por técnico responsable' });
    expect(within(porTecnico).getByText('Sin asignar')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/indicadores', expect.objectContaining({ desde: expect.any(String), hasta: expect.any(String) }));
  });

  it('el CSV usa los mismos filtros y los formatos no inventan datos', () => {
    expect(urlCsv({ desde: '2026-10-01', hasta: '2026-10-17', area_id: '2' })).toBe('/api/v1/reportes/solicitudes.csv?desde=2026-10-01&hasta=2026-10-17&area_id=2');
    expect(urlCsv({ desde: '2026-10-01', hasta: '', area_id: '' })).toBe('/api/v1/reportes/solicitudes.csv?desde=2026-10-01');
    expect(porcentaje(null)).toBe('Sin datos');
    expect(horas(15)).toBe('15,0 h');
  });
});

describe('P09 Notificaciones (HU16)', () => {
  const pagina = (items) => ({ items, pagina: 1, 'tamaño': 15, total: items.length });
  const aviso = { id: 4, tipo: 'VENCIMIENTO', texto: 'La solicitud MSU-2026-0001 superó el plazo de resolución.', solicitud_id: 1, solicitud_codigo: 'MSU-2026-0001', creada_en: '2026-10-17T15:00:00Z', leida_en: null, leida: false };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(pagina([aviso]));
    api.put.mockResolvedValue({});
    api.del.mockResolvedValue(null);
  });

  it('lista los avisos con su tipo y enlace, y marca uno como leído', async () => {
    render(<MemoryRouter><Notificaciones /></MemoryRouter>);
    expect(await screen.findByText(aviso.texto)).toBeInTheDocument();
    expect(screen.getByText('Plazo vencido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver MSU-2026-0001' })).toHaveAttribute('href', '/solicitudes/1');
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como leído' }));
    expect(api.put).toHaveBeenCalledWith('/notificaciones/4/lectura');
  });

  it('filtra no leídos y elimina un aviso propio con confirmación', async () => {
    render(<MemoryRouter><Notificaciones /></MemoryRouter>);
    await screen.findByText(aviso.texto);
    await userEvent.click(screen.getByRole('button', { name: 'No leídos' }));
    expect(api.get).toHaveBeenLastCalledWith('/notificaciones', expect.objectContaining({ no_leidas: true }));
    await userEvent.click(screen.getByRole('button', { name: /Eliminar aviso de MSU-2026-0001/ }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    expect(api.del).toHaveBeenCalledWith('/notificaciones/4');
  });
});
