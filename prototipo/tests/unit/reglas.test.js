/**
 * Pruebas unitarias del módulo de reglas (sección 5 del informe).
 * Responsable: Emanuel (calidad) sobre el módulo de Alex y Marcelo.
 * Ejecutar: npm test
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MATRIZ_PRIORIDAD, POLITICA_V1, calcularPrioridad, obtenerPlazos, sumarHorasCorridas, calcularLimites,
  recalcularPorCambioDePrioridad, validarSolicitud, validarMotivo, validarSolucion, esPendiente,
} from '../../public/js/reglas.js';

const H = 3600 * 1000;

describe('Tabla 5: matriz de prioridad', () => {
  const esperado = [
    ['ALTO', 'ALTA', 'CRITICA'], ['ALTO', 'MEDIA', 'ALTA'], ['ALTO', 'BAJA', 'MEDIA'],
    ['MEDIO', 'ALTA', 'ALTA'], ['MEDIO', 'MEDIA', 'MEDIA'], ['MEDIO', 'BAJA', 'BAJA'],
    ['BAJO', 'ALTA', 'MEDIA'], ['BAJO', 'MEDIA', 'BAJA'], ['BAJO', 'BAJA', 'BAJA'],
  ];
  for (const [impacto, urgencia, prioridad] of esperado) {
    test(`${impacto} × ${urgencia} = ${prioridad}`, () => assert.equal(calcularPrioridad(impacto, urgencia), prioridad));
  }
  test('datos faltantes o inválidos no producen prioridad', () => {
    assert.equal(calcularPrioridad(undefined, 'ALTA'), null);
    assert.equal(calcularPrioridad('ALTO', 'URGENTE'), null);
    assert.equal(calcularPrioridad('toString', 'ALTA'), null);
  });
  test('la matriz es inmutable', () => {
    assert.throws(() => { 'use strict'; MATRIZ_PRIORIDAD.ALTO.ALTA = 'BAJA'; });
  });
});

describe('Tabla 6: plazos de la política v1', () => {
  test('horas por prioridad', () => {
    assert.deepEqual(obtenerPlazos('CRITICA'), { horas_primera_atencion: 4, horas_resolucion: 24 });
    assert.deepEqual(obtenerPlazos('ALTA'), { horas_primera_atencion: 8, horas_resolucion: 48 });
    assert.deepEqual(obtenerPlazos('MEDIA'), { horas_primera_atencion: 24, horas_resolucion: 120 });
    assert.deepEqual(obtenerPlazos('BAJA'), { horas_primera_atencion: 48, horas_resolucion: 240 });
  });
  test('la primera atención nunca supera a la resolución', () => {
    for (const p of Object.values(POLITICA_V1)) assert.ok(p.horas_primera_atencion < p.horas_resolucion);
  });
  test('prioridad desconocida', () => assert.equal(obtenerPlazos('URGENTE'), null));
});

describe('RN01-RN03: fechas en horas corridas y UTC', () => {
  test('HU14 BDD 1: prioridad Alta registrada a las 08:00 de Lima vence a las 16:00 y 48 h después', () => {
    const registro = '2026-10-16T13:00:00.000Z'; // 08:00 en America/Lima
    const limites = calcularLimites(registro, 'ALTA');
    assert.equal(limites.limite_atencion, '2026-10-16T21:00:00.000Z'); // 16:00 Lima
    assert.equal(limites.limite_resolucion, '2026-10-18T13:00:00.000Z');
  });
  test('cuenta fines de semana (horas corridas, sin pausas)', () => {
    const viernes = '2026-10-16T22:00:00.000Z'; // viernes 17:00 Lima
    assert.equal(sumarHorasCorridas(viernes, 48).toISOString(), '2026-10-18T22:00:00.000Z'); // domingo
  });
  test('acepta Date y conserva milisegundos', () => {
    const d = new Date('2026-10-01T00:00:00.123Z');
    assert.equal(sumarHorasCorridas(d, 4).getTime() - d.getTime(), 4 * H);
  });
  test('rechaza fecha u horas inválidas', () => {
    assert.throws(() => sumarHorasCorridas('no es fecha', 1), TypeError);
    assert.throws(() => sumarHorasCorridas('2026-10-01T00:00:00Z', 0), RangeError);
  });
  test('usa la matriz aplicada guardada en el caso (RN04)', () => {
    const politicaPropia = { ...POLITICA_V1, BAJA: { horas_primera_atencion: 10, horas_resolucion: 100 } };
    const l = calcularLimites('2026-10-01T00:00:00.000Z', 'BAJA', politicaPropia);
    assert.equal(l.limite_atencion, '2026-10-01T10:00:00.000Z');
  });
});

describe('RN05: cambio de prioridad desde el registro original', () => {
  const caso = { registrada_en: '2026-10-15T16:20:00.000Z', matriz_aplicada: POLITICA_V1, impacto: 'BAJO', urgencia: 'BAJA', prioridad_codigo: 'BAJA' };
  test('Bajo/Baja → Medio/Alta = Alta con límites desde el registro', () => {
    const r = recalcularPorCambioDePrioridad(caso, 'MEDIO', 'ALTA');
    assert.equal(r.prioridad_codigo, 'ALTA');
    assert.equal(Date.parse(r.limite_atencion) - Date.parse(caso.registrada_en), 8 * H);
    assert.equal(Date.parse(r.limite_resolucion) - Date.parse(caso.registrada_en), 48 * H);
  });
  test('no modifica el objeto original', () => {
    recalcularPorCambioDePrioridad(caso, 'ALTO', 'ALTA');
    assert.equal(caso.prioridad_codigo, 'BAJA');
  });
});

describe('HU04: validación de la solicitud', () => {
  const valido = { categoria_id: 1, ubicacion_id: 2, descripcion: 'El proyector del aula no enciende desde la mañana.', impacto: 'MEDIO', urgencia: 'ALTA' };
  test('datos completos no tienen errores', () => assert.deepEqual(validarSolicitud(valido), []));
  test('PV02: sin ubicación y descripción corta', () => {
    const errores = validarSolicitud({ ...valido, ubicacion_id: '', descripcion: 'No anda' });
    assert.deepEqual(errores.map((e) => e.campo).sort(), ['descripcion', 'ubicacion_id']);
  });
  test('descripción: 20 caracteres tras recortar espacios es el mínimo; 2001 excede', () => {
    assert.deepEqual(validarSolicitud({ ...valido, descripcion: `  ${'a'.repeat(20)}  ` }), []);
    assert.equal(validarSolicitud({ ...valido, descripcion: 'a'.repeat(19) })[0].campo, 'descripcion');
    assert.equal(validarSolicitud({ ...valido, descripcion: 'a'.repeat(2001) })[0].campo, 'descripcion');
  });
  test('categoría o ubicación inactiva', () => {
    const errores = validarSolicitud(valido, { categoriasActivas: new Set([3]), ubicacionesActivas: new Set([2]) });
    assert.deepEqual(errores.map((e) => e.campo), ['categoria_id']);
  });
  test('impacto y urgencia obligatorios', () => {
    const errores = validarSolicitud({ ...valido, impacto: null, urgencia: 'X' });
    assert.deepEqual(errores.map((e) => e.campo), ['impacto', 'urgencia']);
  });
  test('referencia hasta 200 caracteres', () => {
    assert.equal(validarSolicitud({ ...valido, referencia: 'r'.repeat(201) })[0].campo, 'referencia');
  });
});

describe('Motivos, soluciones y estados', () => {
  test('motivo de 10 a 1000 caracteres', () => {
    assert.equal(validarMotivo('').length, 1);
    assert.equal(validarMotivo('corto').length, 1);
    assert.equal(validarMotivo('Motivo válido').length, 0);
    assert.equal(validarMotivo('m'.repeat(1001)).length, 1);
  });
  test('solución de 20 a 2000 caracteres', () => {
    assert.equal(validarSolucion('Listo').length, 1);
    assert.equal(validarSolucion('Se cambió el cable de poder del equipo.').length, 0);
  });
  test('pendiente = Registrada, En evaluación, Asignada o En atención', () => {
    assert.ok(['REGISTRADA', 'EN_EVALUACION', 'ASIGNADA', 'EN_ATENCION'].every(esPendiente));
    assert.ok(!['RESUELTA', 'CERRADA', 'CANCELADA'].some(esPendiente));
  });
});
