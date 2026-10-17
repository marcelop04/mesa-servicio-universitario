/**
 * PV10 Revisión documental: cruce automático RF ↔ HU ↔ BDD ↔ pantallas ↔ épicas.
 * Responsable: Emanuel (D09).
 *
 * Lee el texto extraído del informe (no versionado) y compara:
 *  - tabla 12 (backlog: HU → RF, pantallas) con la cabecera de cada HU en 7.4;
 *  - que cada HU tenga BDD 1 y BDD 2 y pertenezca a la épica de la tabla 11;
 *  - tabla 27 (RF → HU, pantallas, aceptación) con la tabla 12 invertida;
 *  - que las pantallas usadas existan en la tabla 21 y que ninguna quede sin historia.
 * Uso: node docs/pruebas/pv10-cruce-trazabilidad.mjs ruta/al/informe.txt
 */
import fs from 'node:fs';
const txt = fs.readFileSync(process.argv[2], 'utf8');
const lines = txt.split('\n');
const between = (a, b) => { const i = lines.findIndex(l => l.startsWith(a)); const j = lines.findIndex((l, k) => k > i && l.startsWith(b)); return lines.slice(i + 1, j).map(l => l.replace(/^ \| /, '').trim()).filter(Boolean); };
const ids = (s, p) => [...new Set((s.match(new RegExp(p + '\\d\\d', 'g')) || []))];
// Tabla 12
const t12 = between('Tabla 12.', 'P06 y P08 reutilizan').slice(4);
const backlog = {};
for (let i = 0; i + 3 < t12.length; i += 4) backlog[t12[i]] = { desc: t12[i+1], rf: ids(t12[i+2], 'RF'), p: ids(t12[i+3], 'P') };
// Cabeceras HU
const hu = {};
lines.forEach((l, i) => { const m = l.match(/^(HU\d\d)\. (.*)/); if (m && lines[i+1]?.startsWith('E0')) { const h = lines[i+1]; hu[m[1]] = { titulo: m[2], e: h.slice(0,3), rf: ids(h.split('·')[1], 'RF'), p: ids(h.split('·')[2], 'P'), bdd: [] };
  for (let k = i + 2; k < i + 10; k++) { const b = lines[k]?.match(/^BDD (\d)\./); if (b) hu[m[1]].bdd.push(b[1]); } } });
// Tabla 27
const t27 = between('Tabla 27.', 'Los escenarios especifican').slice(4);
const traz = {};
for (let i = 0; i + 3 < t27.length; i += 4) traz[t27[i]] = { hu: ids(t27[i+1], 'HU'), p: ids(t27[i+2], 'P'), acept: ids(t27[i+3], 'HU') };
// Tabla 11 épicas
const t11 = between('Tabla 11.', '7.2').slice(5);
const epicas = {};
for (let i = 0; i + 4 < t11.length; i += 5) { const r = t11[i+2].match(/HU(\d\d)(?: (?:a|y) HU(\d\d))?/); epicas[t11[i]] = { desde: +r[1], hasta: +(r[2] || r[1]) }; }
// RF definidos y pantallas
const pDef = new Set(between('Tabla 21.', 'En móvil').filter(x => /^P\d\d$/.test(x)));
const out = [];
const eq = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
for (const [h, b] of Object.entries(backlog)) {
  const c = hu[h]; if (!c) { out.push(`${h}: sin especificación en 7.4`); continue; }
  if (!eq(b.rf, c.rf)) out.push(`${h}: RF tabla 12 ${b.rf} ≠ cabecera ${c.rf}`);
  if (!eq(b.p, c.p)) out.push(`${h}: pantallas tabla 12 ${b.p} ≠ cabecera ${c.p}`);
  if (c.bdd.join() !== '1,2') out.push(`${h}: BDD encontrados ${c.bdd}`);
  const n = +h.slice(2); const ep = epicas[c.e]; if (!ep || n < ep.desde || n > ep.hasta) out.push(`${h}: épica ${c.e} no cubre la historia según tabla 11`);
  for (const p of c.p) if (!pDef.has(p)) out.push(`${h}: pantalla ${p} no está en tabla 21`);
  for (const r of c.rf) if (!traz[r]?.hu.includes(h)) out.push(`${h}: tabla 27 no lista ${h} en ${r}`);
}
for (let n = 1; n <= 30; n++) { const r = 'RF' + String(n).padStart(2, '0'); const t = traz[r];
  if (!t) { out.push(`${r}: falta en tabla 27`); continue; }
  const huDesdeBacklog = Object.entries(backlog).filter(([, b]) => b.rf.includes(r)).map(([h]) => h);
  if (!eq(t.hu, huDesdeBacklog)) out.push(`${r}: tabla 27 HU ${t.hu} ≠ tabla 12 ${huDesdeBacklog}`);
  if (!eq(t.hu, t.acept)) out.push(`${r}: aceptación ${t.acept} ≠ HU ${t.hu}`);
  const pUnion = [...new Set(t.hu.flatMap(h => backlog[h]?.p || []))];
  if (!eq(t.p, pUnion)) out.push(`${r}: pantallas tabla 27 ${t.p} ≠ unión de pantallas de sus HU ${pUnion}`);
}
const pUsadas = new Set(Object.values(backlog).flatMap(b => b.p));
for (const p of pDef) if (!pUsadas.has(p)) out.push(`${p}: pantalla sin historia`);
console.log('HU en tabla 12:', Object.keys(backlog).length, '· HU especificadas:', Object.keys(hu).length, '· RF en tabla 27:', Object.keys(traz).length, '· pantallas:', pDef.size, '· épicas:', Object.keys(epicas).length);
console.log(out.length ? out.join('\n') : 'Sin inconsistencias');
