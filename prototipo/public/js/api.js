/**
 * Cliente de la API simulada con fetch.
 * Responsables: Alex (PR03, peticiones) y Emanuel (PR06, manejo de errores).
 *
 * Usa las rutas y campos de la sección 10 bajo /api/v1. En la fase II basta con
 * cambiar API_BASE por la dirección del backend Spring Boot.
 * Todos los errores se convierten en ErrorDeApi con un mensaje comprensible:
 *  - tipo "red": la API no responde (servidor detenido o sin conexión);
 *  - tipo "http": la API respondió con el formato común { codigo, mensaje, errores, id_correlacion }.
 */
import { obtenerSesion } from './sesion.js';
import { simularFallaActiva, simularDemoraActiva } from './demo.js';

export const API_BASE = globalThis.MSU_API_BASE ?? '/api/v1';
const TIEMPO_MAXIMO_MS = 10000;

export class ErrorDeApi extends Error {
  constructor({ tipo, estado = 0, codigo, mensaje, errores = [], idCorrelacion = null }) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.tipo = tipo;
    this.estado = estado;
    this.codigo = codigo;
    this.errores = errores;
    this.idCorrelacion = idCorrelacion;
  }

  /** Errores de datos que se muestran junto a los campos. */
  get esValidacion() {
    return this.estado === 400 && this.errores.length > 0;
  }
}

function construirUrl(ruta, consulta) {
  const url = new URL(`${API_BASE}${ruta}`, location.origin);
  Object.entries(consulta ?? {}).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, valor);
  });
  return url;
}

/**
 * Petición genérica a la API simulada.
 * @param {string} ruta ruta relativa a /api/v1, por ejemplo "/solicitudes"
 * @param {{metodo?:string, cuerpo?:object, consulta?:object}} opciones
 */
export async function pedir(ruta, { metodo = 'GET', cuerpo, consulta } = {}) {
  const encabezados = { Accept: 'application/json' };
  const sesion = obtenerSesion();
  if (sesion) encabezados['X-Usuario-Id'] = String(sesion.id);
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json';
  if (simularFallaActiva()) encabezados['X-Simular-Falla'] = '1';
  if (simularDemoraActiva()) encabezados['X-Simular-Demora'] = '2000';

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);
  let respuesta;
  try {
    respuesta = await fetch(construirUrl(ruta, consulta), {
      method: metodo,
      headers: encabezados,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    });
  } catch (error) {
    const agotado = error.name === 'AbortError';
    throw new ErrorDeApi({
      tipo: 'red',
      codigo: agotado ? 'TIEMPO_AGOTADO' : 'SIN_CONEXION',
      mensaje: agotado
        ? 'La API simulada tardó demasiado en responder.'
        : 'No se pudo conectar con la API simulada. Comprueba que el servidor esté en ejecución (npm start).',
    });
  } finally {
    clearTimeout(temporizador);
  }

  if (respuesta.status === 204) return null;
  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    datos = null;
  }
  if (!respuesta.ok) {
    throw new ErrorDeApi({
      tipo: 'http',
      estado: respuesta.status,
      codigo: datos?.codigo ?? `HTTP_${respuesta.status}`,
      mensaje: datos?.mensaje ?? `La API respondió con un error (${respuesta.status}).`,
      errores: Array.isArray(datos?.errores) ? datos.errores : [],
      idCorrelacion: datos?.id_correlacion ?? respuesta.headers.get('X-Correlation-Id'),
    });
  }
  return datos;
}

export const api = {
  get: (ruta, consulta) => pedir(ruta, { consulta }),
  post: (ruta, cuerpo) => pedir(ruta, { metodo: 'POST', cuerpo: cuerpo ?? {} }),
  put: (ruta, cuerpo) => pedir(ruta, { metodo: 'PUT', cuerpo: cuerpo ?? {} }),
  eliminar: (ruta) => pedir(ruta, { metodo: 'DELETE' }),
};
