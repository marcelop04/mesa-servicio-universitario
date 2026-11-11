// Fase III · Paquete A (Emanuel): recorrido en navegador con capturas de HU13, HU22 y HU23.
// Requiere `docker compose up --build`. Uso: node recorrido-fase-iii-emanuel.mjs ../evidencias/fase-iii-emanuel
// Nota: publica una versión nueva de la política de plazos en la base local de demostración.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:8081';
const SALIDA = process.argv[2] ?? '../evidencias/fase-iii-emanuel';
mkdirSync(SALIDA, { recursive: true });
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

async function captura(p, nombre, descripcion, completa = true) {
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SALIDA}/${nombre}.png`, fullPage: completa });
  resultados.push(`${nombre}.png · ${descripcion}`);
  console.log('✓', nombre, '·', descripcion);
}

async function sinDesborde(p, nombre) {
  const desborde = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (desborde) throw new Error(`${nombre}: hay desplazamiento horizontal a ${p.viewportSize().width} px (RNF05)`);
}

// 1. Preparar un caso cerrado: registrar, asignar, resolver y confirmar.
const sol = await sesion('solicitante@msu.test');
await sol.p.goto(`${BASE}/solicitudes/nueva`);
await sol.p.getByLabel(/^Categoría/).selectOption({ label: 'Proyector y multimedia' });
await sol.p.getByLabel(/^Ubicación/).selectOption({ index: 1 });
await sol.p.getByLabel(/^Descripción/).fill('El ecran del aula no baja y la proyección queda sobre la pared con poca visibilidad.');
await sol.p.getByRole('radio', { name: /^Medio/ }).check();
await sol.p.getByRole('radio', { name: /^Media/ }).check();
await sol.p.getByRole('button', { name: 'Registrar solicitud' }).click();
const exito = sol.p.getByText(/Solicitud MSU-\d{4}-\d{4} registrada\./);
await exito.waitFor();
const codigo = (await exito.textContent()).match(/MSU-\d{4}-\d{4}/)[0];

const sup = await sesion('supervisor@msu.test');
await sup.p.goto(`${BASE}/supervision`);
await sup.p.getByRole('button', { name: new RegExp(codigo) }).click();
await sup.p.getByRole('heading', { name: 'Evaluación y asignación' }).waitFor();
await sup.p.getByRole('button', { name: /^Iniciar evaluación/ }).click();
await sup.p.getByText(/Evaluación iniciada/).waitFor();
const opcion = sup.p.locator('#tecnico option', { hasText: 'Tomás Soporte' });
await sup.p.locator('#tecnico').selectOption(await opcion.getAttribute('value'));
await sup.p.getByRole('button', { name: 'Asignar', exact: true }).click();
await sup.p.getByText('Técnico asignado.').waitFor();

const tec = await sesion('tecnico.soporte@msu.test');
await tec.p.goto(`${BASE}/atencion`);
await tec.p.getByRole('button', { name: new RegExp(codigo) }).click();
await tec.p.getByRole('button', { name: 'Iniciar atención' }).click();
await tec.p.getByText(/pasó a En atención/).waitFor();
await tec.p.getByLabel(/Solución aplicada/).fill('Se lubricó el mecanismo del ecran y se ajustó el tope; baja y sube sin trabarse.');
await tec.p.getByRole('button', { name: 'Registrar solución' }).click();
await tec.p.getByText(/quedó Resuelta/).waitFor();

await sol.p.goto(`${BASE}/solicitudes`);
await sol.p.getByRole('link', { name: codigo }).click();
await sol.p.getByRole('button', { name: 'Confirmar solución' }).click();
await sol.p.getByText(/la solicitud quedó cerrada/).waitFor();

// 2. HU13: encuesta de satisfacción.
await sol.p.getByRole('heading', { name: '¿Cómo calificas la atención?' }).waitFor();
await sol.p.getByRole('button', { name: 'Enviar calificación' }).click();
await sol.p.getByText('Elige una calificación de 1 a 5.').waitFor();
await sol.p.getByRole('heading', { name: '¿Cómo calificas la atención?' }).scrollIntoViewIfNeeded();
await captura(sol.p, '01-P06-encuesta-validacion', 'HU13: sin calificación no se envía; el error aparece junto al grupo');
await sol.p.getByLabel(/Satisfecho$/).check();
await sol.p.getByRole('textbox', { name: 'Comentario (opcional)' }).fill('El técnico llegó rápido y explicó qué falló.');
await captura(sol.p, '02-P06-encuesta', `HU13: el solicitante califica con 4 la solicitud cerrada ${codigo}`);
await sol.p.getByRole('button', { name: 'Enviar calificación' }).click();
await sol.p.getByText('Gracias: recibimos tu calificación.').waitFor();
await captura(sol.p, '03-P06-encuesta-registrada', 'HU13 BDD 1: se confirma la recepción y ya no se ofrece otro envío');
await sol.p.reload();
await sol.p.getByText('4 de 5').waitFor();
if (await sol.p.getByRole('button', { name: 'Enviar calificación' }).count()) {
  throw new Error('HU13 BDD 2: tras recargar no debe ofrecerse una segunda encuesta');
}

// 3. HU22: políticas de plazos.
const adm = await sesion('admin@msu.test');
await adm.p.goto(`${BASE}/admin/configuracion`);
await adm.p.getByRole('tab', { name: 'Políticas de plazos' }).click();
await adm.p.getByRole('heading', { name: /^Versión vigente: v\d+/ }).waitFor();
const vigente = Number((await adm.p.getByRole('heading', { name: /^Versión vigente/ }).textContent()).match(/v(\d+)/)[1]);
await captura(adm.p, '04-P12-politicas', `HU22: versión vigente v${vigente} con sus plazos e historial de versiones`);
await adm.p.getByRole('button', { name: 'Nueva versión' }).click();
const alta = adm.p.getByRole('group', { name: 'Alta' });
const resolucionAlta = Number(await alta.getByLabel('Resolución (horas)').inputValue());
await alta.getByLabel('Primera atención (horas)').fill(String(resolucionAlta + 2));
await adm.p.getByRole('button', { name: 'Revisar y publicar' }).click();
await adm.p.getByText(/no puede superar la resolución/).waitFor();
await captura(adm.p, '05-P12-politica-invalida', 'HU22 BDD 2: una primera atención mayor que la resolución se rechaza indicando el dato');
// Se deshace el dato inválido y se amplía en un día la resolución de Baja (siempre coherente).
await adm.p.getByRole('button', { name: 'Cancelar' }).click();
await adm.p.getByRole('button', { name: 'Nueva versión' }).click();
const baja = adm.p.getByRole('group', { name: 'Baja' }).getByLabel('Resolución (horas)');
await baja.fill(String(Number(await baja.inputValue()) + 24));
await adm.p.getByRole('button', { name: 'Revisar y publicar' }).click();
await adm.p.getByRole('dialog').waitFor();
await captura(adm.p, '06-P12-politica-confirmar', 'HU22: confirmación antes de publicar; las solicitudes existentes conservan su versión', false);
await adm.p.getByRole('button', { name: 'Publicar', exact: true }).click();
await adm.p.getByText(`Se publicó la versión ${vigente + 1}.`, { exact: false }).waitFor();
await captura(adm.p, '07-P12-politica-publicada', `HU22 BDD 1: la versión ${vigente + 1} queda vigente y la v${vigente} pasa al historial`);

// 4. HU23: auditoría administrativa.
await adm.p.getByRole('tab', { name: 'Auditoría administrativa' }).click();
await adm.p.getByRole('heading', { name: 'Auditoría administrativa' }).waitFor();
await adm.p.getByRole('row', { name: /Publicación de política/ }).first().waitFor();
await captura(adm.p, '08-P12-auditoria', 'HU23: accesos y cambios administrativos, sin contraseñas ni tokens');
await adm.p.getByLabel('Acción').selectOption('POLITICA_PUBLICAR');
await adm.p.getByRole('row', { name: /Publicación de política/ }).first().waitFor();
await captura(adm.p, '09-P12-auditoria-filtro', 'HU23: filtro por acción; el detalle muestra la versión y la matriz publicada');
const texto = await adm.p.locator('.tabla').textContent();
if (/Demo12345|\$2[ab]\$|MSU_SESION/.test(texto)) throw new Error('HU23 BDD 2: la auditoría no debe mostrar secretos');

// 5. Vista móvil (RNF05).
const movil = await sesion('admin@msu.test', 360, 780);
await movil.p.goto(`${BASE}/admin/configuracion`);
await movil.p.getByRole('tab', { name: 'Políticas de plazos' }).click();
await movil.p.getByRole('heading', { name: /^Versión vigente/ }).waitFor();
await sinDesborde(movil.p, 'Políticas');
await captura(movil.p, '10-P12-politicas-movil-360', 'Políticas a 360 px sin desplazamiento horizontal de la página');
const solMovil = await sesion('solicitante@msu.test', 360, 780);
await solMovil.p.goto(`${BASE}/solicitudes`);
await solMovil.p.getByRole('link', { name: codigo }).click();
await solMovil.p.getByText('4 de 5').waitFor();
await sinDesborde(solMovil.p, 'Encuesta');
await captura(solMovil.p, '11-P06-encuesta-movil-360', 'Encuesta registrada a 360 px sin desplazamiento horizontal');

await navegador.close();
console.log(`\nRecorrido de la fase III (paquete A) con ${codigo}: ${resultados.length} capturas.`);
