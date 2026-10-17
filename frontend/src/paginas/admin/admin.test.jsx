import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { Configuracion, validarOpcion } from './Configuracion.jsx';
import { Usuarios, validarCuenta } from './Usuarios.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));
vi.mock('../../sesion/SesionContext.jsx', () => ({ useSesion: () => ({ usuario: { id: 1, rol: 'ADMINISTRADOR' } }) }));

const pagina = (items) => ({ items, pagina: 1, 'tamaño': 20, total: items.length });
const tecnico = {
  id: 2, nombre: 'Tomás Soporte', correo: 'tecnico.soporte@msu.test', rol: 'TECNICO', rol_nombre: 'Técnico',
  area_id: 1, area_nombre: 'Soporte informático', activo: true, pendientes: 2,
};

describe('P11 Usuarios (HU20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((ruta) =>
      Promise.resolve(ruta === '/catalogos' ? [{ id: 1, nombre: 'Soporte informático' }] : pagina([tecnico])));
  });

  it('valida en el cliente que un técnico tenga área', () => {
    const errores = validarCuenta({ nombre: 'Ana', correo: 'ana@msu.test', password: 'Inicial12345', rol: 'TECNICO', area_id: '' }, true);
    expect(errores).toEqual({ area_id: 'Un técnico debe pertenecer a un área.' });
  });

  it('lista las cuentas con su carga pendiente', async () => {
    render(<Usuarios />);
    const fila = await screen.findByRole('row', { name: /Tomás Soporte/ });
    expect(within(fila).getByText('Soporte informático')).toBeInTheDocument();
    expect(within(fila).getByText('2')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/admin/usuarios', expect.objectContaining({ pagina: 1, tamano: 10 }));
  });

  it('no permite confirmar la desactivación de un técnico con casos pendientes (BDD 2)', async () => {
    render(<Usuarios />);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Tomás Soporte' }));
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar cuenta' }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('tiene 2 casos pendientes');
    expect(within(dialogo).getByRole('button', { name: 'Desactivar' })).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('el administrador no ve la opción de desactivar su propia cuenta', async () => {
    api.get.mockImplementation((ruta) => Promise.resolve(ruta === '/catalogos' ? [] : pagina([
      { ...tecnico, id: 1, nombre: 'Adán Administrador', rol: 'ADMINISTRADOR', rol_nombre: 'Administrador', pendientes: null },
      tecnico,
    ])));
    render(<Usuarios />);
    await userEvent.click(await screen.findByRole('button', { name: 'Editar Adán Administrador' }));
    expect(screen.queryByRole('button', { name: 'Desactivar cuenta' })).not.toBeInTheDocument();
  });

  it('crea un técnico y muestra los errores del servidor junto al campo', async () => {
    api.post.mockRejectedValueOnce(new ErrorApi(409, { codigo: 'CORREO_DUPLICADO', mensaje: 'Ya existe una cuenta con ese correo.' }));
    render(<Usuarios />);
    await userEvent.click(await screen.findByRole('button', { name: /Crear usuario/ }));
    await userEvent.type(screen.getByLabelText(/Nombre completo/), 'Lucía Redes');
    await userEvent.type(screen.getByLabelText(/^Correo institucional/), 'lucia@msu.test');
    await userEvent.type(screen.getByLabelText(/Contraseña inicial/), 'Inicial12345');
    await userEvent.selectOptions(screen.getByLabelText(/^Área/), '1');
    await userEvent.click(within(screen.getByRole('form', { name: 'Crear usuario interno' })).getByRole('button', { name: 'Crear usuario' }));
    expect(api.post).toHaveBeenCalledWith('/admin/usuarios', expect.objectContaining({
      nombre: 'Lucía Redes', correo: 'lucia@msu.test', rol: 'TECNICO', area_id: 1,
    }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese correo.');
  });
});

describe('P12 Configuración (HU21)', () => {
  const listas = {
    '/admin/catalogos/areas': [{ id: 1, nombre: 'Mantenimiento', activo: true, fijo: false }],
    '/admin/catalogos/categorias': [{ id: 5, nombre: 'Gasfitería', area_id: 1, area_nombre: 'Mantenimiento', activo: true, fijo: false }],
    '/admin/catalogos/ubicaciones': [{ id: 7, nombre: 'Pabellón A · Aula 101', edificio: 'Pabellón A', ambiente: 'Aula 101', activo: false, fijo: false }],
    '/admin/catalogos/estados': [{ id: 'EN_ATENCION', nombre: 'En atención', activo: true, fijo: true }],
    '/admin/catalogos/prioridades': [{ id: 'ALTA', nombre: 'Alta', activo: true, fijo: true }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((ruta) => Promise.resolve(pagina(listas[ruta] ?? [])));
    api.del.mockResolvedValue({ id: 1, nombre: 'Mantenimiento', activo: false });
  });

  it('valida campos obligatorios por tipo', () => {
    expect(validarOpcion(['nombre', 'area_id'], { nombre: ' ', area_id: '' })).toEqual({
      nombre: 'Este campo es obligatorio.', area_id: 'Seleccione el área a la que pertenece.',
    });
  });

  it('muestra cada catálogo en su tarjeta con su estado', async () => {
    render(<Configuracion />);
    const areas = await screen.findByRole('region', { name: 'Áreas' });
    expect(await within(areas).findByText('1 categoría')).toBeInTheDocument();
    const ubicaciones = screen.getByRole('region', { name: 'Ubicaciones' });
    expect(within(ubicaciones).getByText('Pabellón A / Aula 101')).toBeInTheDocument();
    expect(within(ubicaciones).getByText('Inactivo')).toBeInTheDocument();
    expect(within(ubicaciones).getByRole('button', { name: 'Reactivar Pabellón A · Aula 101' })).toBeInTheDocument();
  });

  it('desactiva con DELETE tras confirmar (desactivación lógica)', async () => {
    render(<Configuracion />);
    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar Mantenimiento' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('No se borra');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(api.del).toHaveBeenCalledWith('/admin/catalogos/areas/1'));
    expect(await screen.findByText('«Mantenimiento» quedó desactivada.')).toBeInTheDocument();
  });

  it('los estados son fijos: se pueden renombrar pero no desactivar (BDD 2)', async () => {
    render(<Configuracion />);
    const estados = await screen.findByRole('region', { name: 'Estados' });
    expect(await within(estados).findByText('Código EN_ATENCION')).toBeInTheDocument();
    expect(within(estados).getByRole('button', { name: 'Renombrar En atención' })).toBeInTheDocument();
    expect(within(estados).queryByRole('button', { name: /Desactivar/ })).not.toBeInTheDocument();
  });

  it('las pestañas se recorren con las flechas del teclado', async () => {
    render(<Configuracion />);
    screen.getByRole('tab', { name: 'Catálogos' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Políticas de plazos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Políticas de plazos' })).toHaveFocus();
  });
});
