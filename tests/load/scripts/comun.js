/**
 * Módulo común para pruebas de carga y estrés con k6.
 * Maneja autenticación única (JWT en cookie MSU_SESION + token CSRF),
 * variables de entorno configurables y constructores de petición.
 */
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';
export const PASSWORD_DEFAULT = __ENV.PASSWORD || 'Demo12345!';

export const CUENTAS = {
  solicitante: __ENV.USUARIO_SOLICITANTE || 'solicitante@msu.test',
  supervisor: __ENV.USUARIO_SUPERVISOR || 'supervisor@msu.test',
  tecnico: __ENV.USUARIO_TECNICO || 'tecnico.soporte@msu.test',
};

/**
 * Realiza el flujo de autenticación completo una sola vez:
 * 1. GET /auth/csrf con CookieJar aislado para obtener la cookie y token XSRF-TOKEN
 * 2. POST /auth/login con credenciales y header CSRF
 * Retorna las cookies de sesión y headers listos para reutilizar en cada iteración de las VUs.
 */
export function autenticar(correo, password = PASSWORD_DEFAULT) {
  const jar = new http.CookieJar();

  // 1. Obtener token y cookie CSRF
  const csrfRes = http.get(`${BASE_URL}/auth/csrf`, { jar });
  check(csrfRes, { 'CSRF obtenido correctamente (200)': (r) => r.status === 200 });

  const cookiesCsrf = jar.cookiesForURL(BASE_URL);
  const csrfInicial = cookiesCsrf['XSRF-TOKEN'] ? cookiesCsrf['XSRF-TOKEN'][0] : '';

  // 2. Login con credenciales institucionales y token CSRF
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ correo, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfInicial,
        'Cookie': `XSRF-TOKEN=${csrfInicial}`,
      },
      jar,
    }
  );

  check(loginRes, {
    'Inicio de sesión exitoso (200)': (r) => r.status === 200,
  });

  const cookiesLogin = jar.cookiesForURL(BASE_URL);
  const msuSesion = cookiesLogin['MSU_SESION'] ? cookiesLogin['MSU_SESION'][0] : '';
  const csrfRotado = cookiesLogin['XSRF-TOKEN'] ? cookiesLogin['XSRF-TOKEN'][0] : csrfInicial;

  check(loginRes, {
    'Cookie de sesión MSU_SESION recibida': () => Boolean(msuSesion),
  });

  const cookieHeader = `MSU_SESION=${msuSesion}; XSRF-TOKEN=${csrfRotado}`;

  return {
    msuSesion,
    csrfToken: csrfRotado,
    headersLectura: {
      'Cookie': cookieHeader,
      'Accept': 'application/json',
    },
    headersEscritura: {
      'Cookie': cookieHeader,
      'X-XSRF-TOKEN': csrfRotado,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
}
