import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { calcularPrioridad, recalcularLimites, validarMotivo } from '../../reglas/prioridad.js';
import { Supervision } from './Supervision.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));

const matriz = {
  CRITICA: { horas_primera_atencion: 4, horas_resolucion: 24 },
  ALTA: { horas_primera_atencion: 8, horas_resolucion: 48 },
  MEDIA: { horas_primera_atencion: 24, horas_resolucion: 120 },
  BAJA: { horas_primera_atencion: 48, horas_resolucion: 240 },
};
const caso = {
  id: 7, codigo: 'MSU-2026-0007', descripcion: 'Sin red en el laboratorio de cómputo 1', area_id: 1,
  area_nombre: 'Soporte informático', categoria_nombre: 'Conectividad y red', ubicacion_nombre: 'Pabellón B · Lab 1',
  solicitante_nombre: 'Ana Solicitante', impacto: 'MEDIO', urgencia: 'MEDIA', prioridad_codigo: 'MEDIA',
  prioridad_nombre: 'Media', estado_codigo: 'EN_EVALUACION', estado_nombre: 'En evaluación', tecnico_id: null,
  tecnico_nombre: null, registrada_en: '2026-10-16T13:00:00Z', limite_atencion: '2026-10-17T13:00:00Z',
  limite_resolucion: '2026-10-21T13:00:00Z', nivel_plazo: 'EN_PLAZO', matriz_aplicada: matriz, version: 3,
};
const tecnicos = [{ id: 2, nombre: 'Tomás Soporte', area_id: 1, area_nombre: 'Soporte informático', pendientes: 4 }];

function rutas(detalle = caso) {
  api.get.mockImplementation((ruta) => {
    if (ruta === '/solicitudes') return Promise.resolve({ items: [detalle], pagina: 1, 'tamaño': 10, total: 1 });
    if (ruta === `/solicitudes/${detalle.id}`) return Promise.resolve(detalle);
    if (ruta === '/supervision/tecnicos') return Promise.resolve(tecnicos);
    return Promise.resolve({ areas: [], categorias: [] });
  });
}

async function abrirCaso() {
  render(<Supervision />);
  await userEvent.click(await screen.findByRole('button', { name: /MSU-2026-0007/ }));
  return screen.findByRole('region', { name: 'Evaluación y asignación' });
}

describe('Reglas de prioridad (tabla 5 y RN05)', () => {
  it('cruza impacto y urgencia y recalcula desde el registro', () => {
    expect(calcularPrioridad('ALTO', 'ALTA')).toBe('CRITICA');
    expect(calcularPrioridad('BAJO', 'MEDIA')).toBe('BAJA');
    expect(recalcularLimites('2026-10-16T13:00:00Z', 'ALTA', matriz)).toMatchObject({
      limite_atencion: '2026-10-16T21:00:00.000Z', limite_resolucion: '2026-10-18T13:00:00.000Z',
    });
    expect(validarMotivo('corto')).toMatch(/mínimo es 10/);
    expect(validarMotivo('Motivo suficiente')).toBeNull();
  });
});

describe('P07 Bandeja de supervisión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rutas();
  });

  it('lista las solicitudes pendientes ordenadas por prioridad', async () => {
    render(<Supervision />);
    const fila = await screen.findByRole('row', { name: /MSU-2026-0007/ });
    expect(within(fila).getByText('Sin asignar')).toBeInTheDocument();
    expect(within(fila).getByText('En plazo')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/solicitudes', expect.objectContaining({ estado: 'PENDIENTES', orden: 'prioridad' }));
  });

  it('HU07 BDD 2: un cambio de prioridad sin motivo no se envía', async () => {
    const panel = await abrirCaso();
    await userEvent.click(within(panel).getByRole('radio', { name: 'Alto' }));
    expect(within(panel).getByText('Alta', { selector: 'strong' })).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'Guardar cambio de prioridad' }));
    expect(within(panel).getByText(/El motivo es obligatorio/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('HU08: asigna un técnico del área enviando la versión', async () => {
    api.post.mockResolvedValue({});
    const panel = await abrirCaso();
    await userEvent.selectOptions(within(panel).getByLabelText(/Técnico activo del área/), '2');
    await userEvent.click(within(panel).getByRole('button', { name: 'Asignar' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes/7/asignaciones', { tecnico_id: 2, version: 3 });
  });

  it('HU24: un conflicto de versión avisa y recarga el caso', async () => {
    api.post.mockRejectedValue(new ErrorApi(409, { codigo: 'CONFLICTO_VERSION', mensaje: 'Otro usuario modificó la solicitud.' }));
    const panel = await abrirCaso();
    await userEvent.selectOptions(within(panel).getByLabelText(/Técnico activo del área/), '2');
    await userEvent.click(within(panel).getByRole('button', { name: 'Asignar' }));
    expect(await screen.findByText(/Se recargaron los datos del caso/)).toBeInTheDocument();
    expect(api.get.mock.calls.filter(([r]) => r === '/solicitudes/7').length).toBeGreaterThan(1);
  });
});
