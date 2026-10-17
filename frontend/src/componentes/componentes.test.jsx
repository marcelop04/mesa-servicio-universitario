import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Campo, Confirmacion, EtiquetaEstado, EtiquetaPrioridad, Paginacion, Tabla } from './index.js';

describe('componentes reutilizables (GB02)', () => {
  it('Campo asocia la etiqueta, la ayuda y el error al control', () => {
    render(<Campo id="correo" etiqueta="Correo" obligatorio ayuda="Use su correo" error="Ingrese un correo válido." />);
    const control = screen.getByLabelText(/Correo/);
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAccessibleDescription('Use su correo Ingrese un correo válido.');
    expect(control).toBeRequired();
  });

  it('las etiquetas expresan estado y prioridad con texto', () => {
    render(
      <>
        <EtiquetaEstado codigo="EN_ATENCION" />
        <EtiquetaPrioridad codigo="CRITICA" />
      </>,
    );
    expect(screen.getByText('En atención')).toBeInTheDocument();
    expect(screen.getByText('Crítica')).toBeInTheDocument();
  });

  it('Paginacion muestra el rango y avisa el cambio de página', async () => {
    const onCambiar = vi.fn();
    render(<Paginacion pagina={1} tamano={20} total={45} onCambiar={onCambiar} />);
    expect(screen.getByText('Mostrando 1–20 de 45 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onCambiar).toHaveBeenCalledWith(2);
  });

  it('Tabla muestra la lista vacía con un mensaje comprensible', () => {
    render(<Tabla columnas={[{ clave: 'nombre', titulo: 'Nombre' }]} filas={[]} vacio="No hay cuentas." />);
    expect(screen.getByText('No hay cuentas.')).toBeInTheDocument();
  });

  it('Tabla ofrece reintentar ante un error', async () => {
    const onReintentar = vi.fn();
    render(<Tabla columnas={[]} filas={[]} error={new Error('Sin conexión')} onReintentar={onReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onReintentar).toHaveBeenCalled();
  });

  it('Tabla rotula cada celda con su columna para la vista móvil', () => {
    render(<Tabla columnas={[{ clave: 'nombre', titulo: 'Nombre' }]} filas={[{ id: 1, nombre: 'Aula 101' }]} />);
    expect(screen.getByText('Aula 101')).toHaveAttribute('data-titulo', 'Nombre');
  });

  it('Confirmacion enfoca Cancelar y se cierra con Escape', async () => {
    const onCancelar = vi.fn();
    render(<Confirmacion abierto titulo="Desactivar" onConfirmar={() => {}} onCancelar={onCancelar}>¿Seguro?</Confirmacion>);
    expect(screen.getByRole('dialog', { name: 'Desactivar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(onCancelar).toHaveBeenCalled();
  });
});
