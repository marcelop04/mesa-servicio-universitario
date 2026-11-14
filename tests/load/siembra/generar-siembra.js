/**
 * Generador idempotente del script SQL de siembra para pruebas de carga y estrés (2000 casos).
 * Ejecución: node tests/load/siembra/generar-siembra.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO_SALIDA = path.join(__dirname, 'siembra-2000-casos.sql');

const MATRIZ_JSON = JSON.stringify({
  CRITICA: { horas_primera_atencion: 4, horas_resolucion: 24 },
  ALTA: { horas_primera_atencion: 8, horas_resolucion: 48 },
  MEDIA: { horas_primera_atencion: 24, horas_resolucion: 120 },
  BAJA: { horas_primera_atencion: 48, horas_resolucion: 240 },
});

// Relación área -> categorías y técnicos
const CONFIG_AREAS = {
  1: { nombre: 'Soporte informático', categorias: [7, 8, 9, 10], tecnico_id: 2 },
  2: { nombre: 'Mantenimiento', categorias: [1, 2, 3, 4], tecnico_id: 3 },
  3: { nombre: 'Servicios generales', categorias: [5, 6], tecnico_id: 4 },
};

// Distribución ponderada de estados (total 100%)
const DISTRIBUCION_ESTADOS = [
  { estado: 'CERRADA', peso: 45 },
  { estado: 'RESUELTA', peso: 15 },
  { estado: 'EN_ATENCION', peso: 15 },
  { estado: 'ASIGNADA', peso: 10 },
  { estado: 'EN_EVALUACION', peso: 5 },
  { estado: 'REGISTRADA', peso: 10 },
];

// Distribución ponderada de prioridades (total 100%)
const DISTRIBUCION_PRIORIDADES = [
  { prioridad: 'MEDIA', impacto: 'MEDIO', urgencia: 'MEDIA', peso: 45 },
  { prioridad: 'ALTA', impacto: 'ALTO', urgencia: 'MEDIA', peso: 30 },
  { prioridad: 'BAJA', impacto: 'BAJO', urgencia: 'BAJA', peso: 15 },
  { prioridad: 'CRITICA', impacto: 'ALTO', urgencia: 'ALTA', peso: 10 },
];

function seleccionarPonderado(items) {
  const rand = Math.random() * 100;
  let acumulado = 0;
  for (const item of items) {
    acumulado += item.peso;
    if (rand <= acumulado) return item;
  }
  return items[items.length - 1];
}

function formatearFecha(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

console.log('Generando script SQL con 2000 registros para pruebas de rendimiento...');

let sql = `-- Script de siembra para pruebas de carga y estrés: 2000 casos
-- Idempotente: limpia previamente cualquier registro con prefijo [CARGA]
-- Generado automáticamente por tests/load/siembra/generar-siembra.js

DELETE FROM encuesta WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM comentario WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM evidencia WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM evento_operativo WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM notificacion WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM asignacion_historica WHERE solicitud_id IN (SELECT id FROM solicitud WHERE descripcion LIKE '[CARGA]%');
DELETE FROM solicitud WHERE descripcion LIKE '[CARGA]%';

`;

const BATCH_SIZE = 250;
const TOTAL_CASOS = 2000;
const ahora = Date.now();

for (let batch = 0; batch < TOTAL_CASOS; batch += BATCH_SIZE) {
  sql += `INSERT INTO solicitud (
    codigo, solicitante_id, categoria_id, area_id, ubicacion_id, referencia, descripcion,
    impacto, urgencia, prioridad_codigo, estado_codigo, tecnico_id,
    registrada_en, primera_atencion_en, ultima_resolucion_en, cerrada_en,
    limite_atencion, limite_resolucion, politica_id, matriz_aplicada, version_fechas, version
  ) VALUES\n`;

  const filas = [];
  for (let i = batch + 1; i <= batch + BATCH_SIZE; i++) {
    const num = String(i).padStart(4, '0');
    const codigo = `MSU-CARG-${num}`;
    const areaId = (i % 3) + 1;
    const infoArea = CONFIG_AREAS[areaId];
    const catId = infoArea.categorias[i % infoArea.categorias.length];
    const ubicacionId = (i % 8) + 1;

    const { estado } = seleccionarPonderado(DISTRIBUCION_ESTADOS);
    const { prioridad, impacto, urgencia } = seleccionarPonderado(DISTRIBUCION_PRIORIDADES);

    // Antigüedad aleatoria entre 1 y 60 días atrás
    const diasAtras = (i % 60) + 1;
    const tiempoBase = ahora - diasAtras * 24 * 3600 * 1000;
    const fechaRegistro = new Date(tiempoBase);

    const horasAtencion = prioridad === 'CRITICA' ? 4 : prioridad === 'ALTA' ? 8 : prioridad === 'MEDIA' ? 24 : 48;
    const horasResolucion = prioridad === 'CRITICA' ? 24 : prioridad === 'ALTA' ? 48 : prioridad === 'MEDIA' ? 120 : 240;

    const fechaLimAtencion = new Date(tiempoBase + horasAtencion * 3600 * 1000);
    const fechaLimResolucion = new Date(tiempoBase + horasResolucion * 3600 * 1000);

    const tecnicoId = ['ASIGNADA', 'EN_ATENCION', 'RESUELTA', 'CERRADA'].includes(estado)
      ? infoArea.tecnico_id
      : 'NULL';

    const fechaPrimeraAtencion = ['EN_ATENCION', 'RESUELTA', 'CERRADA'].includes(estado)
      ? `'${formatearFecha(new Date(tiempoBase + (horasAtencion / 2) * 3600 * 1000))}'`
      : 'NULL';

    const fechaUltimaResolucion = ['RESUELTA', 'CERRADA'].includes(estado)
      ? `'${formatearFecha(new Date(tiempoBase + (horasResolucion / 2) * 3600 * 1000))}'`
      : 'NULL';

    const fechaCerrada = estado === 'CERRADA'
      ? `'${formatearFecha(new Date(tiempoBase + (horasResolucion / 2 + 12) * 3600 * 1000))}'`
      : 'NULL';

    const descripcion = `[CARGA] Caso de prueba de rendimiento #${num} para el área de ${infoArea.nombre}.`;

    filas.push(
      `  ('${codigo}', 1, ${catId}, ${areaId}, ${ubicacionId}, 'Piso ${(i % 4) + 1}', '${descripcion}', ` +
      `'${impacto}', '${urgencia}', '${prioridad}', '${estado}', ${tecnicoId}, ` +
      `'${formatearFecha(fechaRegistro)}', ${fechaPrimeraAtencion}, ${fechaUltimaResolucion}, ${fechaCerrada}, ` +
      `'${formatearFecha(fechaLimAtencion)}', '${formatearFecha(fechaLimResolucion)}', 1, '${MATRIZ_JSON}', 1, 0)`
    );
  }

  sql += filas.join(',\n') + ';\n\n';
}

fs.writeFileSync(ARCHIVO_SALIDA, sql, 'utf-8');
console.log(`Script generado exitosamente en ${ARCHIVO_SALIDA} con ${TOTAL_CASOS} casos.`);

