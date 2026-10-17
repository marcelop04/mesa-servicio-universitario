/*
 * GB03 · Cliente de API común (Gabriel).
 * Todas las pantallas llaman a la API a través de este módulo: envía la cookie de sesión,
 * agrega el token CSRF en las operaciones que modifican datos y convierte las respuestas de
 * error al formato común del informe (código, mensaje, errores por campo, correlación).
 */

export const BASE_API = import.meta.env.VITE_API_URL ?? '/api/v1';

const COOKIE_CSRF = 'XSRF-TOKEN';
const CABECERA_CSRF = 'X-XSRF-TOKEN';
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

const MENSAJES = {
  0: 'No se pudo conectar con el servidor. Revise su conexión e intente nuevamente.',
  401: 'Su sesión no es válida o expiró. Inicie sesión nuevamente.',
  403: 'No tiene permiso para realizar esta operación.',
  404: 'El recurso solicitado no existe.',
  409: 'Otro usuario modificó estos datos o la operación entra en conflicto. Recargue y revise el cambio.',
  500: 'Ocurrió un error inesperado. Intente nuevamente.',
};

export class ErrorApi extends Error {
  constructor(estado, cuerpo = {}) {
    super(cuerpo.mensaje || MENSAJES[estado] || MENSAJES[500]);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.codigo = cuerpo.codigo ?? (estado === 0 ? 'SIN_CONEXION' : `HTTP_${estado}`);
    this.errores = Array.isArray(cuerpo.errores) ? cuerpo.errores : [];
    this.idCorrelacion = cuerpo.id_correlacion ?? null;
  }

  /** Errores de validación como objeto { campo: mensaje } para mostrarlos junto a cada campo. */
  get porCampo() {
    return Object.fromEntries(this.errores.map((e) => [e.campo, e.mensaje]));
  }

  get esConflicto() {
    return this.estado === 409;
  }
}

const oyentes = new Set();

/** Permite reaccionar a errores globales, p. ej. la sesión cierra al recibir 401. */
export function alRecibirError(oyente) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

export function leerCookie(nombre) {
  const par = document.cookie.split('; ').find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
}

async function obtenerTokenCsrf(renovar = false) {
  if (!renovar) {
    const actual = leerCookie(COOKIE_CSRF);
    if (actual) return actual;
  }
  await fetch(`${BASE_API}/auth/csrf`, { credentials: 'include' });
  return leerCookie(COOKIE_CSRF);
}

function construirUrl(ruta, parametros) {
  const url = new URL(`${BASE_API}${ruta}`, window.location.origin);
  Object.entries(parametros ?? {}).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(clave, valor);
  });
  return url.toString();
}

async function leerCuerpo(respuesta) {
  if (respuesta.status === 204) return null;
  const texto = await respuesta.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

async function ejecutar(metodo, ruta, { cuerpo, parametros, senal } = {}, reintentoCsrf = false) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta;
  try {
    if (!METODOS_SEGUROS.has(metodo)) {
      const token = await obtenerTokenCsrf(reintentoCsrf);
      if (token) cabeceras[CABECERA_CSRF] = token;
    }
    respuesta = await fetch(construirUrl(ruta, parametros), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      credentials: 'include',
      signal: senal,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    const error = new ErrorApi(0);
    oyentes.forEach((o) => o(error));
    throw error;
  }

  const datos = await leerCuerpo(respuesta);
  if (respuesta.ok) return datos;

  const error = new ErrorApi(respuesta.status, datos ?? {});
  // Un token CSRF vencido (p. ej. tras iniciar sesión) se renueva una sola vez.
  if (error.codigo === 'CSRF_INVALIDO' && !reintentoCsrf) {
    return ejecutar(metodo, ruta, { cuerpo, parametros, senal }, true);
  }
  oyentes.forEach((o) => o(error));
  throw error;
}

export const api = {
  get: (ruta, parametros, opciones) => ejecutar('GET', ruta, { ...opciones, parametros }),
  post: (ruta, cuerpo, opciones) => ejecutar('POST', ruta, { ...opciones, cuerpo }),
  put: (ruta, cuerpo, opciones) => ejecutar('PUT', ruta, { ...opciones, cuerpo }),
  del: (ruta, opciones) => ejecutar('DELETE', ruta, opciones),
};
