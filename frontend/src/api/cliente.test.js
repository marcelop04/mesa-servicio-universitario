import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alRecibirError, api, ErrorApi } from './cliente.js';

function respuesta(estado, cuerpo) {
  return Promise.resolve(new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  }));
}

describe('cliente de API (GB03)', () => {
  let fetchSimulado;

  beforeEach(() => {
    fetchSimulado = vi.fn();
    vi.stubGlobal('fetch', fetchSimulado);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envía la cookie de sesión y arma los parámetros sin valores vacíos', async () => {
    fetchSimulado.mockReturnValueOnce(respuesta(200, { items: [] }));
    await api.get('/admin/usuarios', { rol: 'TECNICO', q: '', pagina: 2 });
    const [url, opciones] = fetchSimulado.mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/admin\/usuarios\?rol=TECNICO&pagina=2$/);
    expect(opciones.credentials).toBe('include');
    expect(opciones.headers['X-XSRF-TOKEN']).toBeUndefined();
  });

  it('agrega el token CSRF de la cookie en las escrituras', async () => {
    document.cookie = 'XSRF-TOKEN=abc123; path=/';
    fetchSimulado.mockReturnValueOnce(respuesta(201, { id: 1 }));
    await api.post('/admin/catalogos/areas', { nombre: 'Laboratorios' });
    const [, opciones] = fetchSimulado.mock.calls[0];
    expect(opciones.headers['X-XSRF-TOKEN']).toBe('abc123');
    expect(opciones.body).toBe('{"nombre":"Laboratorios"}');
  });

  it('pide el token CSRF cuando aún no existe la cookie', async () => {
    fetchSimulado.mockImplementationOnce(() => {
      document.cookie = 'XSRF-TOKEN=nuevo; path=/';
      return respuesta(200, {});
    });
    fetchSimulado.mockReturnValueOnce(respuesta(204));
    const resultado = await api.del('/admin/catalogos/areas/3');
    expect(fetchSimulado.mock.calls[0][0]).toMatch(/\/auth\/csrf$/);
    expect(fetchSimulado.mock.calls[1][1].headers['X-XSRF-TOKEN']).toBe('nuevo');
    expect(resultado).toBeNull();
  });

  it('convierte un 409 al formato común y expone los errores por campo', async () => {
    document.cookie = 'XSRF-TOKEN=abc123; path=/';
    fetchSimulado.mockReturnValueOnce(respuesta(409, {
      codigo: 'TECNICO_CON_CARGA', mensaje: 'El técnico tiene 2 solicitudes pendientes.', errores: [],
      id_correlacion: 'abc-123',
    }));
    const error = await api.put('/admin/usuarios/4', { activo: false }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.esConflicto).toBe(true);
    expect(error.codigo).toBe('TECNICO_CON_CARGA');
    expect(error.message).toBe('El técnico tiene 2 solicitudes pendientes.');
    expect(error.idCorrelacion).toBe('abc-123');
  });

  it('expone los errores de validación como { campo: mensaje }', async () => {
    document.cookie = 'XSRF-TOKEN=abc123; path=/';
    fetchSimulado.mockReturnValueOnce(respuesta(400, {
      codigo: 'DATOS_INVALIDOS', mensaje: 'Revise los campos marcados.',
      errores: [{ campo: 'area_id', mensaje: 'Seleccione un área activa.' }],
    }));
    const error = await api.post('/admin/usuarios', {}).catch((e) => e);
    expect(error.porCampo).toEqual({ area_id: 'Seleccione un área activa.' });
  });

  it('avisa a los oyentes ante un 401 para cerrar la sesión', async () => {
    const oyente = vi.fn();
    const dejar = alRecibirError(oyente);
    fetchSimulado.mockReturnValueOnce(respuesta(401, { codigo: 'SIN_SESION', mensaje: 'Su sesión expiró.' }));
    await api.get('/me').catch(() => {});
    expect(oyente).toHaveBeenCalledWith(expect.objectContaining({ estado: 401 }));
    dejar();
  });

  it('usa un mensaje propio cuando el 403 no trae cuerpo', async () => {
    fetchSimulado.mockReturnValueOnce(respuesta(403));
    const error = await api.get('/admin/usuarios').catch((e) => e);
    expect(error.message).toBe('No tiene permiso para realizar esta operación.');
  });

  it('informa la falta de conexión sin afirmar éxito', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await api.get('/catalogos').catch((e) => e);
    expect(error.estado).toBe(0);
    expect(error.codigo).toBe('SIN_CONEXION');
    expect(error.message).toMatch(/No se pudo conectar/);
  });

  it('si no logra obtener el token CSRF responde con el error común de conexión', async () => {
    fetchSimulado.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const error = await api.post('/admin/catalogos/areas', { nombre: 'X' }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error.codigo).toBe('SIN_CONEXION');
  });

  it('renueva el token CSRF una vez si el servidor lo rechaza', async () => {
    document.cookie = 'XSRF-TOKEN=viejo; path=/';
    fetchSimulado
      .mockReturnValueOnce(respuesta(403, { codigo: 'CSRF_INVALIDO', mensaje: 'Token inválido' }))
      .mockImplementationOnce(() => {
        document.cookie = 'XSRF-TOKEN=renovado; path=/';
        return respuesta(200, {});
      })
      .mockReturnValueOnce(respuesta(201, { id: 9 }));
    const creado = await api.post('/admin/catalogos/areas', { nombre: 'Laboratorios' });
    expect(creado).toEqual({ id: 9 });
    expect(fetchSimulado.mock.calls[2][1].headers['X-XSRF-TOKEN']).toBe('renovado');
  });
});
