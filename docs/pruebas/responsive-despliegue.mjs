// Paquete B: revisión de la aplicación real a 360 y 1366 px, sin modificar sus datos.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origen = new URL(process.env.BASE ?? 'https://configurar-url-publica.invalid');
const local = ['localhost', '127.0.0.1'].includes(origen.hostname);
if (origen.protocol !== 'https:' && !(local && process.env.PERMITIR_HTTP_LOCAL === 'true')) {
  throw new Error('BASE debe usar HTTPS. Para una verificación local: PERMITIR_HTTP_LOCAL=true.');
}
if (origen.hostname.endsWith('.invalid')) throw new Error('Configurar BASE con la URL desplegada.');
if (!process.env.MSU_TEST_PASSWORD) throw new Error('Definir MSU_TEST_PASSWORD con la contraseña de las cuentas ficticias.');
const BASE = origen.origin;
const salida = resolve(process.env.SALIDA ?? '../evidencias/fase-iii-iv-david/responsive');
await mkdir(salida, { recursive: true });
const navegador = await chromium.launch({
  ...(process.env.NAVEGADOR ? { channel: process.env.NAVEGADOR } : {}), headless: true,
});
const resultados = [];
const fallos = [];
const roles = [
  { nombre: 'solicitante', correo: process.env.MSU_EMAIL_SOLICITANTE ?? 'solicitante@msu.test', rutas: ['/solicitudes', '/solicitudes/nueva', '/notificaciones', '/perfil'] },
  { nombre: 'supervisor', correo: process.env.MSU_EMAIL_SUPERVISOR ?? 'supervisor@msu.test', rutas: ['/supervision', '/dashboard', '/notificaciones'] },
  { nombre: 'tecnico', correo: process.env.MSU_EMAIL_TECNICO ?? 'tecnico.soporte@msu.test', rutas: ['/atencion', '/notificaciones'] },
  { nombre: 'admin', correo: process.env.MSU_EMAIL_ADMIN ?? 'admin@msu.test', rutas: ['/admin/usuarios', '/admin/configuracion'] },
];

async function captura(pagina, nombre, ancho) {
  await pagina.waitForLoadState('networkidle');
  await pagina.waitForFunction(() => document.querySelectorAll('.cargando').length === 0);
  const medidas = await pagina.evaluate(() => ({ ancho: innerWidth, contenido: document.documentElement.scrollWidth }));
  const archivo = `${nombre}-${ancho}.png`;
  await pagina.screenshot({ path: resolve(salida, archivo), fullPage: true, animations: 'disabled' });
  const sinDesborde = medidas.contenido <= medidas.ancho + 1;
  resultados.push({ archivo, ruta: new URL(pagina.url()).pathname, ancho, sin_desborde: sinDesborde });
  if (!sinDesborde) fallos.push(`${archivo}: desborde horizontal (${medidas.contenido}px).`);
}

try {
  for (const ancho of [360, 1366]) {
    const publico = await navegador.newContext({ viewport: { width: ancho, height: ancho === 360 ? 780 : 900 }, locale: 'es-PE' });
    const pagina = await publico.newPage();
    await pagina.goto(`${BASE}/login`);
    await pagina.getByRole('button', { name: 'Iniciar sesión' }).waitFor();
    await captura(pagina, 'login', ancho);
    await pagina.goto(`${BASE}/registro`);
    await pagina.getByRole('heading', { level: 1 }).waitFor();
    await captura(pagina, 'registro', ancho);
    await publico.close();

    for (const rol of roles) {
      const contexto = await navegador.newContext({ viewport: { width: ancho, height: ancho === 360 ? 780 : 900 }, locale: 'es-PE' });
      const p = await contexto.newPage();
      p.setDefaultTimeout(20000);
      p.on('response', (res) => {
        if (res.url().startsWith(`${BASE}/api/`) && res.status() >= 500) {
          fallos.push(`${rol.nombre}/${ancho}: API ${res.status()} ${new URL(res.url()).pathname}`);
        }
      });
      await p.goto(`${BASE}/login`);
      await p.getByLabel('Correo institucional').fill(rol.correo);
      await p.getByLabel('Contraseña', { exact: true }).fill(process.env.MSU_TEST_PASSWORD);
      await p.getByRole('button', { name: 'Iniciar sesión' }).click();
      await p.waitForURL((u) => !u.pathname.startsWith('/login'));
      for (const ruta of rol.rutas) {
        await p.goto(`${BASE}${ruta}`);
        await p.waitForURL((u) => u.pathname === ruta);
        await p.getByRole('heading', { level: 1 }).waitFor();
        await captura(p, `${rol.nombre}-${ruta.replaceAll('/', '-').replace(/^-/, '')}`, ancho);
        if (ruta === '/admin/configuracion') {
          for (const [tab, nombre] of [['Políticas de plazos', 'politicas'], ['Auditoría administrativa', 'auditoria']]) {
            await p.getByRole('tab', { name: tab }).click();
            if (nombre === 'politicas') await p.getByRole('button', { name: 'Nueva versión', exact: true }).waitFor();
            else await p.getByRole('heading', { name: 'Auditoría administrativa', exact: true }).waitFor();
            await captura(p, `admin-${nombre}`, ancho);
          }
        }
        if (ruta === '/solicitudes') {
          const enlace = p.getByRole('link', { name: /^MSU-\d{4}-\d+/ }).first();
          if (await enlace.count()) {
            await enlace.click();
            await p.getByRole('heading', { level: 1 }).waitFor();
            await captura(p, 'solicitante-detalle', ancho);
          }
        }
      }
      await contexto.close();
    }
  }
} catch (error) {
  fallos.push(error.message);
} finally {
  await navegador.close();
  const informe = {
    fecha_utc: new Date().toISOString(), url: BASE, entorno: local ? 'local' : 'desplegado',
    resultados, fallos, estado: fallos.length ? 'FALLO' : 'OK',
    nota: 'Capturas automatizadas y desborde horizontal; completar revisión visual y SUS con personas.',
  };
  await writeFile(resolve(salida, 'resultado.json'), `${JSON.stringify(informe, null, 2)}\n`);
  console.log(`${informe.estado}: ${resultados.length} capturas; ${fallos.length} fallos. Informe: ${salida}`);
  if (fallos.length) {
    console.error(fallos.join('\n'));
    process.exitCode = 1;
  }
}
