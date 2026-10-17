/**
 * PV09 Datos de diseño (tabla 26) y fórmula de la tabla 7.
 * Responsable: Emanuel.
 * 35 pendientes + 80 solucionadas + 5 canceladas = 120 registradas;
 * porcentaje solucionado = 100 × 80 / (120 − 5) = 69,6 %.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularIndicadoresBase, formatearPorcentaje, redondearUnDecimal } from '../../public/js/reglas.js';

test('PV09: 35 pendientes, 80 solucionadas y 5 canceladas → 120 registradas y 69,6 %', () => {
  const r = calcularIndicadoresBase({ pendientes: 35, solucionadas: 80, canceladas: 5 });
  assert.equal(r.registradas, 120);
  assert.equal(r.porcentaje_solucionado, 69.6);
  assert.equal(formatearPorcentaje(r.porcentaje_solucionado), '69,6 %');
  // Comprobación independiente de la fórmula sin redondeo: 80 / 115 = 0,695652…
  assert.ok(Math.abs((100 * 80) / (120 - 5) - 69.5652) < 0.0001);
});

test('denominador cero se muestra como "Sin datos"', () => {
  const r = calcularIndicadoresBase({ pendientes: 0, solucionadas: 0, canceladas: 3 });
  assert.equal(r.registradas, 3);
  assert.equal(r.porcentaje_solucionado, null);
  assert.equal(formatearPorcentaje(r.porcentaje_solucionado), 'Sin datos');
});

test('un decimal en porcentajes', () => {
  assert.equal(redondearUnDecimal(66.666), 66.7);
  assert.equal(formatearPorcentaje(100), '100,0 %');
});
