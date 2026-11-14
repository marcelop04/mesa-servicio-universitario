/**
 * Escenario de Estrés Escalonado y Evaluación de Límite Operativo - k6
 * Sube la carga por etapas (20 -> 50 -> 100 -> 200 -> 400 VU) para evaluar
 * el comportamiento del sistema bajo sobrecarga y el punto de quiebre del SLA.
 *
 * Criterio de quiebre operativo:
 * - Incumplimiento sostenido del SLA institucional (RNF06: p95 < 1,000 ms en lecturas).
 *   Bajo sobrecarga extrema (200-400 VU), la latencia p95 escala a 3.50 s (con picos
 *   individuales de hasta 8.42 s), superando ampliamente el SLA aunque el servidor
 *   no sufra caída de procesos (0.00 % de errores HTTP).
 *
 * Umbrales de seguridad configurados en k6:
 * - Tasa de error < 5 % (http_req_failed < 0.05) - Límite de resiliencia del servicio
 * - Latencia p95 tolerable < 5,000 ms - Umbral de degradación crítica admisible antes de colapso
 *
 * Ejecución local: k6 run tests/load/scripts/estres.js
 * Ejecución parametrizada (David B1): $env:BASE_URL="..."; k6 run tests/load/scripts/estres.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, CUENTAS, autenticar } from './comun.js';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Etapa 1: 20 VU (Línea base)
    { duration: '15s', target: 50 },  // Etapa 2: 50 VU
    { duration: '15s', target: 100 }, // Etapa 3: 100 VU
    { duration: '20s', target: 200 }, // Etapa 4: 200 VU (Inicio saturación hilos)
    { duration: '25s', target: 400 }, // Etapa 5: 400 VU (Saturación pool HikariCP 10 conexiones)
    { duration: '15s', target: 20 },  // Etapa 6: Cooldown / Recuperación a 20 VU
    { duration: '10s', target: 0 },   // Cierre
  ],
  thresholds: {
    // Monitoreo de criterios de quiebre:
    'http_req_failed': ['rate<0.05'], // Fallos tolerables < 5 %
    'http_req_duration{tipo:lectura}': ['p(95)<5000'], // Latencia tolerable < 5 s
  },
};

export function setup() {
  console.log(`Iniciando prueba de estrés escalonado contra ${BASE_URL}...`);
  const sesionSolicitante = autenticar(CUENTAS.solicitante);
  const sesionSupervisor = autenticar(CUENTAS.supervisor);

  const jar = new http.CookieJar();
  const res = http.get(`${BASE_URL}/solicitudes?tamano=20&pagina=1`, {
    headers: sesionSolicitante.headersLectura,
    jar,
  });
  const items = JSON.parse(res.body)?.items || [];
  const idsValidos = items.map((it) => it.id);

  console.log(`Setup completo. Casos válidos: ${idsValidos.length}. Iniciando ramp-up escalonado hasta 400 VU.`);
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
    // 80 % Consultas / Lecturas
    // -------------------------------------------------------------------------
    const tipo = Math.floor(Math.random() * 4);
    let res;

    switch (tipo) {
      case 0:
        res = http.get(`${BASE_URL}/solicitudes?tamano=10&pagina=1`, {
          headers: data.solicitante.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_solicitudes' },
        });
        break;

      case 1:
        res = http.get(`${BASE_URL}/solicitudes?estado=PENDIENTES`, {
          headers: data.supervisor.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_solicitudes_pendientes' },
        });
        break;

      case 2:
        const idCaso = data.idsValidos[Math.floor(Math.random() * data.idsValidos.length)];
        res = http.get(`${BASE_URL}/solicitudes/${idCaso}`, {
          headers: data.solicitante.headersLectura,
          jar,
          tags: { tipo: 'lectura', endpoint: 'GET_solicitud_id' },
        });
        break;

      case 3:
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
    // 20 % Mutaciones / Escrituras
    // -------------------------------------------------------------------------
    const payload = JSON.stringify({
      categoria_id: 2,
      ubicacion_id: 2,
      referencia: 'Laboratorio de Estrés k6',
      descripcion: `[CARGA] Caso bajo estrés VU-${__VU}-${Date.now()}`,
      impacto: 'BAJO',
      urgencia: 'BAJA',
    });

    const res = http.post(`${BASE_URL}/solicitudes`, payload, {
      headers: data.solicitante.headersEscritura,
      jar,
      tags: { tipo: 'escritura', endpoint: 'POST_solicitudes' },
    });

    check(res, {
      'Escritura respondió 201': (r) => r.status === 201,
    });
  }

  // Pausa reducida en estrés para maximizar concurrencia en pool de conexiones
  sleep(0.05 + Math.random() * 0.1);
}

/**
 * Hook de resumen k6: exporta el resultado de estrés sanitizado
 * excluyendo credenciales y tokens JWT de setup_data (RNF01).
 */
export function handleSummary(data) {
  delete data.setup_data;
  return {
    'tests/load/resultados/resumen-estres.json': JSON.stringify(data, null, 2),
  };
}
