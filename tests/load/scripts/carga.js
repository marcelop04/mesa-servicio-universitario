/**
 * Escenario de Carga Sostenida (RNF06) - k6
 * 20 usuarios virtuales (VU) sostenidos con 80 % lecturas y 20 % escrituras.
 * Umbrales RNF06:
 * - Consultas (tipo:lectura): p95 < 1000 ms (1 s)
 * - Escrituras (tipo:escritura): p95 < 2000 ms (2 s)
 * - Tasa de fallos: < 1 %
 *
 * Ejecución: k6 run tests/load/scripts/carga.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, CUENTAS, autenticar } from './comun.js';

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Rampa de subida a 20 VU
    { duration: '40s', target: 20 }, // Carga sostenida a 20 VU
    { duration: '10s', target: 0 },  // Rampa de bajada
  ],
  thresholds: {
    'http_req_duration{tipo:lectura}': ['p(95)<1000'],
    'http_req_duration{tipo:escritura}': ['p(95)<2000'],
    'http_req_failed': ['rate<0.01'],
  },
};

// Login único en setup(): se ejecuta una sola vez antes de lanzar los VUs
export function setup() {
  console.log(`Iniciando autenticación en setup() contra ${BASE_URL}...`);
  const sesionSolicitante = autenticar(CUENTAS.solicitante);
  const sesionSupervisor = autenticar(CUENTAS.supervisor);

  // Obtener IDs reales existentes para las consultas por ID
  const jar = new http.CookieJar();
  const res = http.get(`${BASE_URL}/solicitudes?tamano=20&pagina=1`, {
    headers: sesionSolicitante.headersLectura,
    jar,
  });
  const items = JSON.parse(res.body)?.items || [];
  const idsValidos = items.map((it) => it.id);

  console.log(`Setup completo. Casos válidos descubiertos: ${idsValidos.length}. Iniciando carga con 20 VU.`);
  return {
    solicitante: sesionSolicitante,
    supervisor: sesionSupervisor,
    idsValidos: idsValidos.length ? idsValidos : [1, 2, 3, 4, 5],
  };
}

export default function (data) {
  const jar = new http.CookieJar();
  const rand = Math.random();

  if (rand < 0.80) {
    // -------------------------------------------------------------------------
    // 80 % Operaciones de Consulta / Lectura
    // -------------------------------------------------------------------------
    const tipoConsulta = Math.floor(Math.random() * 5);
    let res;

    switch (tipoConsulta) {
      case 0:
        // Listado paginado de solicitudes
        res = http.get(`${BASE_URL}/solicitudes?tamano=10&pagina=1`, {
          headers: data.solicitante.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_solicitudes' },
        });
        break;

      case 1:
        // Consulta filtrada por estado
        res = http.get(`${BASE_URL}/solicitudes?estado=PENDIENTES&orden=vencimiento`, {
          headers: data.supervisor.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_solicitudes_pendientes' },
        });
        break;

      case 2:
        // Detalle de solicitud específica (utilizando ID real verificado en setup)
        const idCaso = data.idsValidos[Math.floor(Math.random() * data.idsValidos.length)];
        res = http.get(`${BASE_URL}/solicitudes/${idCaso}`, {
          headers: data.solicitante.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_solicitud_id' },
        });
        break;

      case 3:
        // Catálogos maestros
        res = http.get(`${BASE_URL}/catalogos`, {
          headers: data.solicitante.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_catalogos' },
        });
        break;

      case 4:
        // Métricas e indicadores del dashboard
        res = http.get(`${BASE_URL}/indicadores`, {
          headers: data.supervisor.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_indicadores' },
        });
        break;
    }

    check(res, {
      'Lectura respondió status 200': (r) => r.status === 200,
    });

  } else {
    // -------------------------------------------------------------------------
    // 20 % Operaciones de Mutación / Escritura
    // -------------------------------------------------------------------------
    const tipoEscritura = Math.random() < 0.5 ? 'crear' : 'comentar';
    let res;

    if (tipoEscritura === 'crear') {
      const payload = JSON.stringify({
        categoria_id: 1,
        ubicacion_id: 1,
        referencia: 'Laboratorio de pruebas de rendimiento k6',
        descripcion: `[CARGA] Solicitud de carga automática VU-${__VU}-${Date.now()}`,
        impacto: 'MEDIO',
        urgencia: 'MEDIA',
      });

      res = http.post(`${BASE_URL}/solicitudes`, payload, {
        headers: data.solicitante.headersEscritura,
        jar,
        tags: { tipo: 'escritura', endpoint: 'POST_solicitudes' },
      });

      check(res, {
        'Creación de solicitud respondió 201': (r) => r.status === 201,
      });

    } else {
      const idCaso = data.idsValidos[0] || 1;
      const payload = JSON.stringify({
        texto: `[CARGA] Comentario generado bajo carga VU-${__VU} iter-${__ITER}`,
      });

      res = http.post(`${BASE_URL}/solicitudes/${idCaso}/comentarios`, payload, {
        headers: data.solicitante.headersEscritura,
        jar,
        tags: { tipo: 'escritura', endpoint: 'POST_comentarios' },
      });

      check(res, {
        'Comentario respondió 201': (r) => r.status === 201,
      });
    }
  }

  // Pausa entre 300 ms y 800 ms para simular ritmo humano de navegación
  sleep(0.3 + Math.random() * 0.5);
}

/**
 * Hook de resumen k6: garantiza la exportación de métricas sanitizadas
 * sin incluir sesiones, tokens CSRF ni credenciales de usuario (RNF01).
 */
export function handleSummary(data) {
  delete data.setup_data;
  return {
    'tests/load/resultados/resumen-carga.json': JSON.stringify(data, null, 2),
  };
}
