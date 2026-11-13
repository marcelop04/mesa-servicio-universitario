import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from './Login.jsx';

const sesion = vi.hoisted(() => ({ iniciarSesion: vi.fn() }));
vi.mock('../sesion/SesionContext.jsx', () => ({
  useSesion: () => ({ usuario: null, iniciarSesion: sesion.iniciarSesion }),
}));

function montar() {
  render(<MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/supervision" element={<p>Inicio del supervisor</p>} />
  </Routes></MemoryRouter>);
}

async function enviar() {
  await userEvent.type(screen.getByLabelText('Correo institucional'), 'supervisor@msu.test');
  await userEvent.type(screen.getByLabelText('Contraseña', { exact: true }), 'Clave-ficticia-del-test');
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

describe('C1 · inicio de sesión seguro', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no publica una contraseña por defecto en la pantalla', () => {
    montar();
    expect(screen.queryByText(/Demo12345/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña', { exact: true })).toHaveValue('');
  });

  it('muestra el bloqueo del servidor sin reintentar automáticamente ni navegar', async () => {
    sesion.iniciarSesion.mockRejectedValue(new Error('Demasiados intentos. Espere 30 segundos.'));
    montar();
    await enviar();
    expect(await screen.findByText('Demasiados intentos. Espere 30 segundos.')).toBeInTheDocument();
    expect(sesion.iniciarSesion).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Inicio del supervisor')).not.toBeInTheDocument();
  });

  it('una sesión válida conserva la navegación por rol', async () => {
    sesion.iniciarSesion.mockResolvedValue({ rol: 'SUPERVISOR' });
    montar();
    await enviar();
    expect(await screen.findByText('Inicio del supervisor')).toBeInTheDocument();
  });
});
