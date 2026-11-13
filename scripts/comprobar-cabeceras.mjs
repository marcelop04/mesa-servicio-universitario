// Comprobación de solo lectura; usar únicamente sobre el sistema del equipo.
// node scripts/comprobar-cabeceras.mjs http://localhost:8081
// node scripts/comprobar-cabeceras.mjs https://<origen-de-pruebas-autorizado>
import assert from 'node:assert/strict';

const url = new URL(process.argv[2] ?? 'http://localhost:8081');
const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
assert(url.protocol === 'https:' || (local && url.protocol === 'http:'), 'Solo HTTPS o HTTP en localhost.');
assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use solo el origen.');
for (const ruta of ['/', '/api/v1/auth/csrf', '/api/v1/me']) {
  const r = await fetch(new URL(ruta, url), { redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(r.status, ruta.endsWith('/me') ? 401 : 200, `Estado inesperado en ${ruta}`);
  const csp = r.headers.get('content-security-policy') ?? '';
  assert(csp.includes("default-src 'none'") && csp.includes("frame-ancestors 'none'"), `CSP ausente/incompleta en ${ruta}`);
  assert(!/script-src[^;]*('unsafe-inline'|'unsafe-eval')/.test(csp), 'No permitir JavaScript inline/eval.');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
  assert(r.headers.get('permissions-policy'), 'Falta Permissions-Policy.');
  if (url.protocol === 'https:') {
    assert(/max-age=[1-9]\d*/.test(r.headers.get('strict-transport-security') ?? ''), 'Falta HSTS en HTTPS.');
  }
  if (ruta.endsWith('/csrf')) {
    const cookie = r.headers.getSetCookie().find(c => c.startsWith('XSRF-TOKEN='));
    assert(cookie && /SameSite=Lax/i.test(cookie), 'Cookie CSRF sin SameSite=Lax.');
    assert(!/;\s*HttpOnly/i.test(cookie), 'La SPA debe poder leer el token CSRF.');
    if (url.protocol === 'https:') assert(/;\s*Secure/i.test(cookie), 'Cookie CSRF no segura en HTTPS.');
  }
  console.log(`OK ${ruta}: HTTP ${r.status}, cabeceras verificadas.`);
}
console.log('Esto no sustituye ZAP ni comprueba la cookie de sesión: revísela tras iniciar sesión.');
