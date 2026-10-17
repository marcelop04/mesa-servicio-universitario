import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente.js';
import { Perfil, validarCambioPassword } from './Perfil.jsx';
import { Registro, validarRegistro } from './Registro.jsx';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() }));
vi.mock('../../api/cliente.js', async (original) => ({ ...(await original()), api }));
const actualizarUsuario = vi.fn();
vi.mock('../../sesion/SesionContext.jsx', () => ({
  useSesion: () => ({
    usuario: { id: 6, nombre: 'Ana Solicitante', correo: 'solicitante@msu.test', vinculo: 'ESTUDIANTE', rol: 'SOLICITANTE', rol_nombre: 'Solicitante' },
    actualizarUsuario,
  }),
}));

function conRutas() {
  return render(
    <MemoryRouter initialEntries={['/registro']}>
      <Routes>
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<p>Pantalla de inicio de sesión</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function completar(correo = 'lucia@unmsm.edu.pe') {
  await userEvent.type(screen.getByLabelText(/^Nombre completo/), 'Lucía Pérez');
  await userEvent.type(screen.getByLabelText(/^Correo institucional/), correo);
  await userEvent.selectOptions(screen.getByLabelText(/^Vínculo/), 'ESTUDIANTE');
  await userEvent.type(screen.getByLabelText(/^Contraseña/), 'MiClave12345');
  await userEvent.type(screen.getByLabelText(/^Confirmar contraseña/), 'MiClave12345');
}

describe('P01 Registro (HU01)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('valida en el cliente antes de enviar', async () => {
    conRutas();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(screen.getByText('Seleccione su vínculo con la universidad.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(validarRegistro({ nombre: 'Ana', correo: 'a@b.pe', vinculo: 'DOCENTE', password: 'x'.repeat(10), confirmacion: 'y'.repeat(10) }))
      .toEqual({ confirmacion: 'Las contraseñas no coinciden.' });
  });

  it('BDD 1: crea la cuenta sin enviar rol y lleva al inicio de sesión', async () => {
    api.post.mockResolvedValue({ correo: 'lucia@unmsm.edu.pe', rol: 'SOLICITANTE' });
    conRutas();
    await completar();
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(api.post).toHaveBeenCalledWith('/auth/registro', {
      nombre: 'Lucía Pérez', correo: 'lucia@unmsm.edu.pe', vinculo: 'ESTUDIANTE', password: 'MiClave12345',
    });
    expect(await screen.findByText('Pantalla de inicio de sesión')).toBeInTheDocument();
  });

  it('BDD 2: un correo ya registrado se informa junto al campo', async () => {
    api.post.mockRejectedValue(new ErrorApi(409, { codigo: 'CORREO_DUPLICADO', mensaje: 'Ya existe una cuenta con ese correo.' }));
    conRutas();
    await completar('solicitante@msu.test');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ya existe una cuenta con ese correo.')).toBeInTheDocument();
  });
});

describe('P03 Perfil (HU03)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra los datos y cambia solo el nombre', async () => {
    api.put.mockResolvedValue({ nombre: 'Ana María', rol: 'SOLICITANTE' });
    render(<Perfil />);
    expect(screen.getByText('Estudiante')).toBeInTheDocument();
    const nombre = screen.getByLabelText(/^Nombre completo/);
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Ana María');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nombre' }));
    expect(api.put).toHaveBeenCalledWith('/me', { nombre: 'Ana María' });
    expect(actualizarUsuario).toHaveBeenCalled();
  });

  it('BDD 1: la confirmación debe coincidir y la contraseña actual errónea se muestra junto al campo', async () => {
    render(<Perfil />);
    await userEvent.type(screen.getByLabelText(/^Contraseña actual/), 'Demo12345!');
    await userEvent.type(screen.getByLabelText(/^Nueva contraseña/), 'NuevaClave2026');
    await userEvent.type(screen.getByLabelText(/^Confirmar nueva/), 'OtraClave2026');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(screen.getByText('La confirmación no coincide con la nueva contraseña.')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();

    api.put.mockRejectedValue(new ErrorApi(400, { codigo: 'DATOS_INVALIDOS', mensaje: 'Revise los campos marcados.',
      errores: [{ campo: 'actual', mensaje: 'La contraseña actual no es correcta.' }] }));
    await userEvent.clear(screen.getByLabelText(/^Confirmar nueva/));
    await userEvent.type(screen.getByLabelText(/^Confirmar nueva/), 'NuevaClave2026');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument();
    expect(validarCambioPassword({ actual: 'a', nueva: 'NuevaClave2026', confirmacion: 'NuevaClave2026' })).toEqual({});
  });
});
