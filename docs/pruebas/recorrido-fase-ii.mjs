// EM07 · Recorrido completo de la semana 10 con capturas: solicitante → supervisor → técnico → solicitante.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:8081';
const SALIDA = process.argv[2];
mkdirSync(SALIDA, { recursive: true });
// NAVEGADOR=chrome para usar Google Chrome en lugar de Microsoft Edge.
const navegador = await chromium.launch({ channel: process.env.NAVEGADOR ?? 'msedge', headless: true });
const resultados = [];

async function sesion(correo, ancho = 1366, alto = 900) {
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-PE', timezoneId: 'America/Lima' });
  const p = await contexto.newPage();
  p.setDefaultTimeout(15000);
  await p.goto(`${BASE}/login`);
  await p.getByLabel('Correo institucional').fill(correo);
  await p.getByLabel('Contraseña', { exact: true }).fill('Demo12345!');
  await p.getByRole('button', { name: 'Iniciar sesión' }).click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'));
  return { contexto, p };
}

async function captura(p, nombre, descripcion) {
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: true });
  resultados.push(`${nombre}.png · ${descripcion}`);
  console.log('✓', nombre, '·', descripcion);
}

// 1. Solicitante registra una solicitud (HU04).
const sol = await sesion('solicitante@msu.test');
await sol.p.goto(`${BASE}/solicitudes/nueva`);
await sol.p.getByLabel(/^Categoría/).selectOption({ label: 'Proyector y multimedia' });
await sol.p.getByLabel(/^Ubicación/).selectOption({ label: 'Pabellón A · Aula 101' });
await sol.p.getByLabel(/^Referencia/).fill('Junto a la pizarra');
await sol.p.getByLabel(/^Descripción/).fill('El proyector del aula 101 no enciende y hay clases programadas toda la tarde.');
await sol.p.getByRole('radio', { name: /^Medio/ }).check();
await sol.p.getByRole('radio', { name: /^Alta/ }).check();
await captura(sol.p, '01-P04-nueva-solicitud', 'Solicitante completa el formulario; la prioridad estimada (Alta) se muestra en vivo');
await sol.p.getByRole('button', { name: 'Registrar solicitud' }).click();
const exito = sol.p.getByText(/Solicitud MSU-\d{4}-\d{4} registrada\./);
await exito.waitFor();
const codigo = (await exito.textContent()).match(/MSU-\d{4}-\d{4}/)[0];
await captura(sol.p, '02-P04-registrada', `Registro exitoso con código ${codigo}, prioridad y límites calculados por el servidor`);
await sol.p.goto(`${BASE}/solicitudes`);
await sol.p.getByRole('link', { name: codigo }).waitFor();
await captura(sol.p, '03-P05-mis-solicitudes', 'La solicitud aparece en Mis solicitudes con estado Registrada y plazo');

// 2. Supervisor evalúa (sube la prioridad con motivo) y asigna (HU07, HU08).
const sup = await sesion('supervisor@msu.test');
await sup.p.goto(`${BASE}/supervision`);
await sup.p.getByRole('button', { name: new RegExp(codigo) }).waitFor();
await captura(sup.p, '04-P07-bandeja', 'Bandeja de supervisión con las solicitudes pendientes ordenadas por prioridad');
await sup.p.getByRole('button', { name: new RegExp(codigo) }).click();
await sup.p.getByRole('heading', { name: 'Evaluación y asignación' }).waitFor();
await sup.p.locator('.segmentos__opcion', { hasText: /^Alto$/ }).click();
await sup.p.getByLabel(/Motivo del cambio de prioridad/).fill('Afecta a varios grupos que usan el aula durante la tarde.');
await captura(sup.p, '05-P07-evaluacion', 'Supervisor cambia el impacto: prioridad resultante Crítica y límites recalculados desde el registro');
await sup.p.getByRole('button', { name: /Iniciar evaluación y cambiar prioridad/ }).click();
await sup.p.getByText(/Prioridad actualizada a Crítica/).waitFor();
const opcion = sup.p.locator('#tecnico option', { hasText: 'Tomás Soporte' });
await sup.p.locator('#tecnico').selectOption(await opcion.getAttribute('value'));
await sup.p.getByRole('button', { name: 'Asignar', exact: true }).click();
await sup.p.getByText('Técnico asignado.').waitFor();
await captura(sup.p, '06-P07-asignada', 'Solicitud En evaluación pasa a Asignada a Tomás Soporte; la carga por técnico se actualiza');

// 3. Técnico inicia la atención y registra la solución (HU10, HU11).
const tec = await sesion('tecnico.soporte@msu.test');
await tec.p.goto(`${BASE}/atencion`);
await tec.p.getByRole('button', { name: new RegExp(codigo) }).click();
await tec.p.getByRole('button', { name: 'Iniciar atención' }).click();
await tec.p.getByText(/pasó a En atención/).waitFor();
await captura(tec.p, '07-P08-en-atencion', 'Técnico inicia la atención; se registra la primera atención');
await tec.p.getByLabel(/Solución aplicada/).fill('Se reemplazó el cable HDMI dañado y se probó el proyector con la laptop del docente.');
await tec.p.getByRole('button', { name: 'Registrar solución' }).click();
await tec.p.getByText(/quedó Resuelta/).waitFor();
await captura(tec.p, '08-P08-resuelta', 'Técnico registra la solución; la solicitud queda Resuelta y se abre la ventana de 72 horas');

// 4. Solicitante confirma (HU12) y revisa el historial (HU23).
await sol.p.goto(`${BASE}/solicitudes`);
await sol.p.getByRole('link', { name: codigo }).click();
await sol.p.getByRole('button', { name: 'Confirmar solución' }).waitFor();
await captura(sol.p, '09-P06-conformidad', 'Solicitante ve la solución, el historial y las acciones de conformidad');
await sol.p.getByRole('button', { name: 'Confirmar solución' }).click();
await sol.p.getByText(/la solicitud quedó cerrada/).waitFor();
await sol.p.getByText('Confirmó la solución').waitFor();
await captura(sol.p, '10-P06-cerrada', 'Solicitud Cerrada; el historial muestra cada transición con actor, fecha y motivo');

// 5. Vista móvil (RNF05).
const movil = await sesion('solicitante@msu.test', 360, 780);
await movil.p.goto(`${BASE}/solicitudes`);
await movil.p.getByRole('link', { name: codigo }).waitFor();
const desborde = await movil.p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
await captura(movil.p, '11-P05-movil-360', `Mis solicitudes a 360 px; desborde horizontal: ${desborde ? 'sí' : 'no'}`);

// 6. Registro público (HU01) e inicio de sesión con JWT en cookie HttpOnly; perfil (HU03).
const publico = await navegador.newContext({ viewport: { width: 1366, height: 900 }, locale: 'es-PE', timezoneId: 'America/Lima' });
const reg = await publico.newPage();
reg.setDefaultTimeout(15000);
const correoNuevo = `lucia.${Date.now()}@unmsm.edu.pe`;
await reg.goto(`${BASE}/registro`);
await reg.getByLabel(/^Nombre completo/).fill('Lucía Pérez');
await reg.getByLabel(/^Correo institucional/).fill(correoNuevo);
await reg.getByLabel(/^Vínculo/).selectOption('ESTUDIANTE');
await reg.getByLabel(/^Contraseña/).fill('MiClave12345');
await reg.getByLabel(/^Confirmar contraseña/).fill('MiClave12345');
await captura(reg, '13-P01-registro', 'Registro público de una cuenta de solicitante');
await reg.getByRole('button', { name: 'Crear cuenta' }).click();
await reg.getByText('Cuenta creada. Ingresa tu contraseña para continuar.').waitFor();
await reg.getByLabel('Contraseña', { exact: true }).fill('MiClave12345');
await reg.getByRole('button', { name: 'Iniciar sesión' }).click();
await reg.waitForURL((u) => u.pathname === '/solicitudes');
const cookies = await publico.cookies();
const jwt = cookies.find((c) => c.name === 'MSU_SESION');
const legible = await reg.evaluate(() => document.cookie.includes('MSU_SESION'));
await reg.goto(`${BASE}/perfil`);
await reg.getByRole('heading', { name: 'Cambiar contraseña' }).waitFor();
await captura(reg, '14-P03-perfil', `Perfil del nuevo solicitante; cookie MSU_SESION HttpOnly: ${jwt?.httpOnly ? 'sí' : 'no'}, legible desde JavaScript: ${legible ? 'sí' : 'no'}`);
if (!jwt?.httpOnly || legible) throw new Error('La cookie de sesión debe ser HttpOnly y no legible desde JavaScript');

await navegador.close();
console.log(`\nRecorrido completo con ${codigo}: ${resultados.length} capturas.`);
