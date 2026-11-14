/**
 * Medición de Carga contra el Despliegue en la Nube (David - Paquete B / E3)
 * Ejecuta carga real sobre https://msu-157-137-206-147.sslip.io (OCI sa-bogota-1)
 * con registro dinámico de solicitante, consultas de catálogos, solicitudes y OpenAPI.
 * Exporta resumen sanitizado sin credenciales ni setup_data.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://msu-157-137-206-147.sslip.io/api/v1';

export const options = {
  stages: [
    { duration: '5s', target: 10 },  // Rampa a 10 VUs
    { duration: '20s', target: 10 }, // Carga sostenida a 10 VUs
    { duration: '5s', target: 0 },   // Rampa de descenso
  ],
  thresholds: {
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<3000'],
  },
};

export function setup() {
  console.log(`[k6 Despliegue] Iniciando setup contra ${BASE_URL}...`);
  const jar = new http.CookieJar();

  // 1. Obtener CSRF
  const csrfRes = http.get(`${BASE_URL}/auth/csrf`, { jar });
  check(csrfRes, { 'CSRF obtenido (200)': (r) => r.status === 200 });
  const cookiesCsrf = jar.cookiesForURL(BASE_URL);
  const csrfToken = cookiesCsrf['XSRF-TOKEN'] ? cookiesCsrf['XSRF-TOKEN'][0] : '';

  // 2. Registrar usuario de prueba dinámico
  const timestamp = Date.now();
  const correo = `alex.k6.${timestamp}@unmsm.edu.pe`;
  const password = 'Password123!';

  const regRes = http.post(
    `${BASE_URL}/auth/registro`,
    JSON.stringify({
      nombre: 'Alex SDET Load Test',
      correo: correo,
      password: password,
      vinculo: 'ESTUDIANTE'
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfToken,
        'Cookie': `XSRF-TOKEN=${csrfToken}`,
      },
      jar,
    }
  );
  check(regRes, { 'Registro exitoso (201)': (r) => r.status === 201 });

  // 3. Login
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ correo, password }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfToken,
        'Cookie': `XSRF-TOKEN=${csrfToken}`,
      },
      jar,
    }
  );
  check(loginRes, { 'Login exitoso (200)': (r) => r.status === 200 });

  const cookiesLogin = jar.cookiesForURL(BASE_URL);
  const msuSesion = cookiesLogin['MSU_SESION'] ? cookiesLogin['MSU_SESION'][0] : '';
  const csrfRotado = cookiesLogin['XSRF-TOKEN'] ? cookiesLogin['XSRF-TOKEN'][0] : csrfToken;

  const cookieHeader = `MSU_SESION=${msuSesion}; XSRF-TOKEN=${csrfRotado}`;

  // 4. Crear una solicitud inicial
  const solRes = http.post(
    `${BASE_URL}/solicitudes`,
    JSON.stringify({
      titulo: 'Carga transfronteriza OCI',
      descripcion: 'Evaluación de latencia y rendimiento de red sobre el despliegue de David.',
      categoria_id: 1,
      ubicacion_id: 1,
      urgencia: 'MEDIA',
      impacto: 'MEDIO'
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfRotado,
        'Cookie': cookieHeader,
      },
      jar,
    }
  );

  let solicitudId = 1;
  try {
    const solJson = JSON.parse(solRes.body);
    solicitudId = solJson.id || 1;
  } catch (e) {
    solicitudId = 1;
  }

  console.log(`[k6 Despliegue] Setup completado. Solicitud ID: ${solicitudId}. Lanzando VUs.`);
  return {
    csrf: csrfRotado,
    cookieHeader: cookieHeader,
    solicitudId: solicitudId,
  };
}

export default function (data) {
  const jar = new http.CookieJar();
  const headers = {
    'Cookie': data.cookieHeader,
    'X-XSRF-TOKEN': data.csrf,
  };

  const rand = Math.random();

  if (rand < 0.40) {
    // 40% Listar solicitudes
    const res = http.get(`${BASE_URL}/solicitudes?pagina=1&tamano=10`, { headers, jar });
    check(res, { 'Listar solicitudes (200)': (r) => r.status === 200 });
  } else if (rand < 0.70) {
    // 30% Consultar catálogos
    const res = http.get(`${BASE_URL}/catalogos`, { headers, jar });
    check(res, { 'Catálogos (200)': (r) => r.status === 200 });
  } else if (rand < 0.90) {
    // 20% Perfil /me
    const res = http.get(`${BASE_URL}/me`, { headers, jar });
    check(res, { 'Perfil /me (200)': (r) => r.status === 200 });
  } else {
    // 10% Consulta de detalle de solicitud
    const res = http.get(`${BASE_URL}/solicitudes/${data.solicitudId}`, { headers, jar });
    check(res, { 'Detalle solicitud (200)': (r) => r.status === 200 || r.status === 404 });
  }

  sleep(0.3 + Math.random() * 0.4); // Pacing realista
}

export function handleSummary(data) {
  // Sanitización de seguridad (RNF01): nunca filtrar setup_data con tokens
  delete data.setup_data;

  return {
    'tests/load/resultados/resumen-carga-despliegue.json': JSON.stringify(data, null, 2),
    stdout: `\n=== RESUMEN EJECUCIÓN CARGA DESPLIEGUE NUBE (OCI sa-bogota-1) ===\n` +
      `Peticiones totales: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 'N/A'}\n` +
      `Tasa de error HTTP: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0} %\n` +
      `Latencia p95: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 'N/A'} ms\n` +
      `Latencia promedio: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 'N/A'} ms\n` +
      `Latencia mínima: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values.min.toFixed(2) : 'N/A'} ms\n` +
      `Latencia máxima: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max.toFixed(2) : 'N/A'} ms\n` +
      `=================================================================\n`,
  };
}

