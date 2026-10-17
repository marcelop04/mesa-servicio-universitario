import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { DetalleSolicitud, validarImagen } from './DetalleSolicitud.jsx';
import { CLAVE_FILTROS, MisSolicitudes } from './MisSolicitudes.jsx';
import { NuevaSolicitud, validarSolicitud } from './NuevaSolicitud.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), subir: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));

const catalogos = {
  areas: [{ id: 1, nombre: 'Soporte informático' }],
  categorias: [{ id: 2, nombre: 'Proyector y multimedia', area_id: 1 }],
  ubicaciones: [{ id: 3, nombre: 'Pabellón A · Aula 101' }],
};
const solicitud = {
  id: 9, codigo: 'MSU-2026-0009', descripcion: 'El proyector del aula 101 no enciende.', estado_codigo: 'REGISTRADA',
  estado_nombre: 'Registrada', prioridad_codigo: 'ALTA', prioridad_nombre: 'Alta', nivel_plazo: 'EN_PLAZO',
  categoria_nombre: 'Proyector y multimedia', area_nombre: 'Soporte informático', ubicacion_nombre: 'Pabellón A · Aula 101',
  impacto: 'MEDIO', urgencia: 'ALTA', solicitante_nombre: 'Ana Solicitante', tecnico_nombre: null, politica_version: 1,
  registrada_en: '2026-10-16T13:00:00Z', limite_atencion: '2026-10-16T21:00:00Z', limite_resolucion: '2026-10-18T13:00:00Z',
};
const enRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('P04 Nueva solicitud (HU04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue(catalogos);
  });

  it('BDD 2: sin ubicación ni descripción suficiente no envía nada', async () => {
    enRouter(<NuevaSolicitud />);
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar solicitud' }));
    expect(screen.getByText('Selecciona la ubicación donde ocurre el problema.')).toBeInTheDocument();
    expect(screen.getByText(/al menos 20 caracteres/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(validarSolicitud({ categoria_id: '2', ubicacion_id: '3', referencia: '', descripcion: 'x'.repeat(20), impacto: 'ALTO', urgencia: 'BAJA' })).toEqual({});
  });

  it('BDD 1: registra, muestra la prioridad en vivo y luego el código', async () => {
    api.post.mockResolvedValue({ ...solicitud });
    enRouter(<NuevaSolicitud />);
    await userEvent.selectOptions(await screen.findByLabelText(/^Categoría/), '2');
    await userEvent.selectOptions(screen.getByLabelText(/^Ubicación/), '3');
    await userEvent.type(screen.getByLabelText(/^Descripción/), 'El proyector del aula 101 no enciende.');
    await userEvent.click(screen.getByRole('radio', { name: /Medio/ }));
    await userEvent.click(screen.getByRole('radio', { name: /^Alta/ }));
    expect(screen.getByText('Prioridad estimada:').parentElement).toHaveTextContent('Alta');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar solicitud' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes', expect.objectContaining({
      categoria_id: 2, ubicacion_id: 3, impacto: 'MEDIO', urgencia: 'ALTA', referencia: null,
    }));
    expect(await screen.findByText('Solicitud MSU-2026-0009 registrada.')).toBeInTheDocument();
  });

  it('muestra los errores del servidor junto al campo', async () => {
    api.post.mockRejectedValue(new ErrorApi(400, { codigo: 'DATOS_INVALIDOS', mensaje: 'Revise los campos marcados.',
      errores: [{ campo: 'categoria_id', mensaje: 'La categoría seleccionada no existe o ya no está activa.' }] }));
    enRouter(<NuevaSolicitud />);
    await userEvent.selectOptions(await screen.findByLabelText(/^Categoría/), '2');
    await userEvent.selectOptions(screen.getByLabelText(/^Ubicación/), '3');
    await userEvent.type(screen.getByLabelText(/^Descripción/), 'Descripción suficientemente larga.');
    await userEvent.click(screen.getByRole('radio', { name: /Bajo/ }));
    await userEvent.click(screen.getByRole('radio', { name: /^Baja/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Registrar solicitud' }));
    expect(await screen.findByText('La categoría seleccionada no existe o ya no está activa.')).toBeInTheDocument();
  });
});

describe('P05 Mis solicitudes (HU05, AX06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    api.get.mockImplementation((ruta) => Promise.resolve(ruta === '/catalogos' ? catalogos.categorias
      : { items: [], pagina: 1, 'tamaño': 10, total: 0 }));
  });

  it('guarda los filtros en LocalStorage y los recupera al volver', async () => {
    const { unmount } = enRouter(<MisSolicitudes />);
    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'CERRADA');
    expect(JSON.parse(window.localStorage.getItem(CLAVE_FILTROS)).estado).toBe('CERRADA');
    unmount();
    enRouter(<MisSolicitudes />);
    expect(screen.getByLabelText('Estado')).toHaveValue('CERRADA');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/solicitudes', expect.objectContaining({ estado: 'CERRADA' })));
  });

  it('BDD 2: sin resultados muestra un mensaje comprensible', async () => {
    window.localStorage.setItem(CLAVE_FILTROS, JSON.stringify({ estado: 'CANCELADA' }));
    enRouter(<MisSolicitudes />);
    expect(await screen.findByText(/Ninguna solicitud coincide con los filtros/)).toBeInTheDocument();
  });
});

describe('Detalle reutilizable (AX05, HU06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((ruta) => Promise.resolve(
      ruta === '/solicitudes/9' ? solicitud
        : ruta.endsWith('/comentarios') ? [{ id: 1, autor_nombre: 'Sara Supervisora', texto: 'Lo revisamos hoy.', creado_en: '2026-10-16T14:00:00Z' }]
          : []));
  });

  it('muestra datos, comentarios y acciones del rol, y envía un comentario', async () => {
    api.post.mockResolvedValue({});
    enRouter(<DetalleSolicitud id={9} acciones={(s) => <button type="button">Acción de {s.codigo}</button>} />);
    expect(await screen.findByRole('heading', { name: 'MSU-2026-0009' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acción de MSU-2026-0009' })).toBeInTheDocument();
    expect(await screen.findByText('Lo revisamos hoy.')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Agregar comentario'), 'Sigue sin funcionar.');
    await userEvent.click(screen.getByRole('button', { name: 'Comentar' }));
    expect(api.post).toHaveBeenCalledWith('/solicitudes/9/comentarios', { texto: 'Sigue sin funcionar.' });
  });

  it('BDD 2 HU06: rechaza en el cliente archivos que no son imágenes o superan 5 MB', () => {
    expect(validarImagen({ type: 'application/pdf', size: 10 })).toMatch(/JPEG o PNG/);
    expect(validarImagen({ type: 'image/png', size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
    expect(validarImagen({ type: 'image/jpeg', size: 1000 }, 3)).toMatch(/máximo/);
    expect(validarImagen({ type: 'image/jpeg', size: 1000 }, 1)).toBeNull();
  });
});
