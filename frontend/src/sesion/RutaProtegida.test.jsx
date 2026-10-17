import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RutaProtegida } from './RutaProtegida.jsx';

const sesion = vi.hoisted(() => ({ actual: { usuario: null, cargando: false } }));
vi.mock('./SesionContext.jsx', () => ({ useSesion: () => sesion.actual }));

function montar(ruta) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/login" element={<p>Pantalla de login</p>} />
        <Route path="/supervision" element={<p>Bandeja del supervisor</p>} />
        <Route element={<RutaProtegida roles={['ADMINISTRADOR']} />}>
          <Route path="/admin/usuarios" element={<p>Usuarios</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('rutas protegidas por rol', () => {
  it('sin sesión lleva al inicio de sesión', () => {
    sesion.actual = { usuario: null, cargando: false };
    montar('/admin/usuarios');
    expect(screen.getByText('Pantalla de login')).toBeInTheDocument();
  });

  it('un rol sin permiso vuelve a su propia pantalla de inicio', () => {
    sesion.actual = { usuario: { rol: 'SUPERVISOR' }, cargando: false };
    montar('/admin/usuarios');
    expect(screen.getByText('Bandeja del supervisor')).toBeInTheDocument();
  });

  it('el rol permitido entra a la pantalla', () => {
    sesion.actual = { usuario: { rol: 'ADMINISTRADOR' }, cargando: false };
    montar('/admin/usuarios');
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });
});
