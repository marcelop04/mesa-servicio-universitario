// Prueba LOCAL deliberada del limitador. Usa una cuenta inexistente, no bloquea al administrador.
// node scripts/demostrar-limite-login.mjs [http://localhost:8081]
import assert from 'node:assert/strict';

const url = new URL(process.argv[2] ?? 'http://localhost:8081');
assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Esta demostración solo admite localhost.');
assert.equal(url.protocol, 'http:', 'Use el entorno HTTP local, no producción.');
assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use solo el origen local.');
const maximo = Number(process.env.LOGIN_MAX_FALLOS ?? 5);
assert(Number.isInteger(maximo) && maximo >= 1 && maximo <= 20, 'LOGIN_MAX_FALLOS debe estar entre 1 y 20.');

const csrf = await fetch(new URL('/api/v1/auth/csrf', url), { signal: AbortSignal.timeout(15000) });
assert.equal(csrf.status, 200, 'La aplicación debe estar iniciada.');
const cookie = csrf.headers.getSetCookie().find(c => c.startsWith('XSRF-TOKEN='))?.split(';')[0];
assert(cookie, 'Falta la cookie CSRF.');
const token = decodeURIComponent(cookie.slice('XSRF-TOKEN='.length));
for (let i = 1; i <= maximo + 1; i++) {
  const respuesta = await fetch(new URL('/api/v1/auth/login', url), {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-XSRF-TOKEN': token },
    body: JSON.stringify({ correo: 'demostracion-limite@msu.test', password: 'Incorrecta-solo-demostracion' }),
  });
  assert.equal(respuesta.status, i <= maximo ? 401 : 429,
    'Si ya ejecutó esta demo, reinicie SOLO el backend para limpiar sus contadores locales.');
  console.log(`Intento ${i}: HTTP ${respuesta.status}`);
  if (respuesta.status === 429) {
    const datos = await respuesta.json();
    assert.equal(datos.codigo, 'DEMASIADOS_INTENTOS');
    console.log(`Bloqueo comprobado. Retry-After: ${respuesta.headers.get('Retry-After')} segundos.`);
  }
}
console.log('Puede seguir la exposición con las cuentas reales de demostración.');
