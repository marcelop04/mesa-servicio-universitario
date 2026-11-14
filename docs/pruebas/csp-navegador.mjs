// C1/C3: regresión local de CSP/COOP/COEP/CORP, no es E2E/SUS ni una prueba de producción.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origen = new URL(process.env.BASE ?? 'http://127.0.0.1:8081');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origen.hostname), 'Esta prueba solo admite loopback.');
assert(!origen.username && !origen.password && !origen.search && !origen.hash && origen.pathname === '/');
assert(process.env.MSU_TEST_PASSWORD, 'Use la contraseña ficticia del fixture local, no una cuenta pública.');
const salida = resolve(process.env.SALIDA ?? '../../reports/seguridad/csp-navegador');
const navegador = await chromium.launch({ channel: process.env.NAVEGADOR ?? 'msedge', headless: true });
const resultados = [];
const fallos = [];
const roles = [
  ['solicitante', ['/solicitudes', '/solicitudes/nueva', '/perfil']],
  ['tecnico.soporte', ['/atencion', '/perfil']],
  ['supervisor', ['/supervision', '/dashboard', '/perfil']],
  ['admin', ['/admin/usuarios', '/admin/configuracion', '/perfil']],
];

async function comprobar(pagina, ruta, ancho) {
  await pagina.waitForLoadState('networkidle');
  const datos = await pagina.evaluate(() => ({
    violaciones: window.violacionesCsp,
    aislado: crossOriginIsolated,
    hojasCargadas: [...document.styleSheets].some(h => h.href?.startsWith(location.origin)),
    textoVisible: !!document.querySelector('h1, .swagger-ui .title'),
  }));
  assert.deepEqual(datos.violaciones, [], `Violaciones CSP en ${ruta}`);
  assert(datos.aislado, `No hay aislamiento de origen en ${ruta}`);
  assert(datos.hojasCargadas && datos.textoVisible, `Vista/estilos sin cargar en ${ruta}`);
  resultados.push({ ruta, ancho, csp_sin_violaciones: true, aislamiento: true });
}

try {
  for (const ancho of [360, 1366]) {
    const contexto = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
    await contexto.addInitScript(() => {
      window.violacionesCsp = [];
      document.addEventListener('securitypolicyviolation', e => window.violacionesCsp.push(e.effectiveDirective));
    });
    const p = await contexto.newPage();
    p.setDefaultTimeout(20000);
    p.on('pageerror', error => fallos.push(error.message));
    p.on('response', r => {
      if (r.status() >= 500) fallos.push(`HTTP ${r.status()} en ${new URL(r.url()).pathname}`);
    });
    for (const ruta of ['/login', '/registro', '/sus/', '/swagger-ui.html']) {
      await p.goto(new URL(ruta, origen).href);
      if (ruta === '/sus/') await p.locator('#sus-form fieldset').last().waitFor();
      else if (ruta.startsWith('/swagger')) await p.locator('.swagger-ui .info .title').waitFor();
      else await p.getByRole('heading', { level: 1 }).waitFor();
      await comprobar(p, ruta, ancho);
    }
    const estiloAjeno = await p.evaluate(async () => {
      const estilo = document.createElement('style');
      estilo.textContent = 'html { --msu-fixture-csp: no-debe-aplicarse; }';
      document.head.append(estilo);
      await new Promise(requestAnimationFrame);
      return getComputedStyle(document.documentElement).getPropertyValue('--msu-fixture-csp');
    });
    assert.equal(estiloAjeno, '', 'CSP debe bloquear un estilo ajeno al hash conocido de Swagger.');
    resultados.at(-1).estilo_ajeno_bloqueado = true;
    for (const [cuenta, rutas] of roles) {
      await p.goto(new URL('/login', origen).href);
      await p.getByLabel('Correo institucional').fill(`${cuenta}@msu.test`);
      await p.getByLabel('Contraseña', { exact: true }).fill(process.env.MSU_TEST_PASSWORD);
      await p.getByRole('button', { name: 'Iniciar sesión' }).click();
      await p.waitForURL(u => !u.pathname.startsWith('/login'));
      for (const ruta of rutas) {
        await p.goto(new URL(ruta, origen).href);
        await p.getByRole('heading', { level: 1 }).waitFor();
        await comprobar(p, ruta, ancho);
        if (ruta === '/dashboard') {
          // React escribe el ancho vía CSSOM; no basta con que el HTML devuelva 200.
          const barras = await p.locator('.barras__barra').evaluateAll(elementos =>
            elementos.map(e => ({ declarado: e.style.width, visible: e.getBoundingClientRect().width })));
          assert(barras.length > 0 && barras.every(b => b.declarado && b.visible > 0),
            'El fixture debe contener casos y las barras dinámicas deben conservar su ancho.');
        }
        if (ruta === '/admin/configuracion') {
          for (const nombre of ['Políticas de plazos', 'Auditoría administrativa']) {
            await p.getByRole('tab', { name: nombre }).click();
            await comprobar(p, `/admin/configuracion#${nombre}`, ancho);
          }
        }
      }
      await p.locator(ancho === 360 ? '.cabecera__avatar' : '.lateral .cuenta').click();
      await p.getByRole('menuitem', { name: 'Cerrar sesión' }).click();
      await p.waitForURL(u => u.pathname.startsWith('/login'));
    }
    await contexto.close();
  }
} catch (error) {
  fallos.push(error.message);
} finally {
  await navegador.close();
  await mkdir(salida, { recursive: true });
  const informe = { fecha_utc: new Date().toISOString(), entorno: 'local, H2 y datos ficticios',
    url: origen.origin, navegador: process.env.NAVEGADOR ?? 'msedge', resultados, fallos,
    estado: fallos.length ? 'FALLO' : 'OK',
    limite: 'No acredita HTTPS público, DAST de la release desplegada, E2E por HU ni sesiones SUS.' };
  await writeFile(resolve(salida, 'resultado.json'), `${JSON.stringify(informe, null, 2)}\n`);
  console.log(`${informe.estado}: ${resultados.length} vistas; ${fallos.length} fallos.`);
  if (fallos.length) {
    console.error(fallos.join('\n'));
    process.exitCode = 1;
  }
}
