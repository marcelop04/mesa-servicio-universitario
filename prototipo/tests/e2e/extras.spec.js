/**
 * Pruebas complementarias del recorrido: PR01 (acceso por rol), PR06 (lista vacía),
 * restablecer datos y D07 (DELETE de notificaciones y baja lógica de catálogos).
 * Responsable: Emanuel (D09).
 */
import { test, expect } from '@playwright/test';
import { CUENTAS, captura, observar, restablecer, ingresar, encabezados, completarFormulario } from './ayudas.js';

test.beforeEach(async ({ request }) => {
  await restablecer(request);
});

test('PR01 Acceso simulado: nombre, rol y menú según rol; cierre de sesión', async ({ page }, info) => {
  await page.goto('/solicitudes.html');
  await expect(page).toHaveURL(/index\.html\?volver=/);

  const menus = {
    lucia: ['Mis solicitudes', 'Nueva solicitud', 'Notificaciones'],
    carla: ['Mis asignaciones', 'Notificaciones'],
    ana: ['Bandeja de solicitudes', 'Notificaciones'],
    luis: ['Catálogos', 'Notificaciones'],
  };
  for (const [clave, esperado] of Object.entries(menus)) {
    const cuenta = CUENTAS[clave];
    await ingresar(page, cuenta);
    await expect(page.getByTestId('usuario-actual')).toContainText(`Rol: ${cuenta.rol}`);
    await expect(page.locator('.menu__enlace')).toHaveText(esperado);
    const guardado = await page.evaluate(() => sessionStorage.getItem('msu.sesion'));
    expect(guardado).not.toMatch(/contrase|password|token/i);
  }
  // Administrador sin acceso operativo
  await page.goto('/solicitudes.html');
  await expect(page.getByRole('heading', { name: 'Acceso no permitido' })).toBeVisible();
  await page.goto('/catalogos.html');
  await captura(page, 'pr01-administrador-catalogos.png');

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/index\.html$/);
  expect(await page.evaluate(() => sessionStorage.getItem('msu.sesion'))).toBeNull();
  await captura(page, 'pr01-acceso.png');
  observar(info, 'Sin sesión redirige al acceso; cada rol ve su nombre, «Rol: …» y su menú; sessionStorage solo guarda el perfil público; el administrador ve «Acceso no permitido» en el listado operativo; Cerrar sesión borra la sesión.');
});

test('PR01 Acceso solo con teclado', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('input[name="correo"]').first()).toBeVisible();
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.name === 'correo')) break;
  }
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.waitForURL(/solicitudes\.html/);
  await expect(page.getByTestId('usuario-actual')).toContainText(CUENTAS.lucia.nombre);
});

test('PR06 Lista vacía: sin solicitudes y filtro sin coincidencias', async ({ page }, info) => {
  await ingresar(page, CUENTAS.sofia);
  const vacio = page.locator('[data-estado="vacio"]');
  await expect(vacio).toContainText('Todavía no registraste solicitudes');
  await expect(vacio.getByRole('link', { name: 'Registrar una solicitud' })).toBeVisible();
  await captura(page, 'pr06-lista-vacia-sin-solicitudes.png');

  await ingresar(page, CUENTAS.lucia);
  await page.locator('#filtro-estado').selectOption('RESUELTA');
  await page.locator('#filtro-categoria').selectOption({ label: 'Mobiliario' });
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(vacio).toContainText('No hay solicitudes que coincidan con los filtros');
  await captura(page, 'pr06-lista-vacia-filtro.png');
  await vacio.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  observar(info, 'Cuenta sin casos: «Todavía no registraste solicitudes» con enlace para registrar. Filtro Resuelta + Mobiliario: «No hay solicitudes que coincidan con los filtros» con «Limpiar filtros», sin error técnico.');
});

test('Base: botón «Restablecer datos» vuelve al estado inicial', async ({ page, request }, info) => {
  await ingresar(page, CUENTAS.lucia);
  await page.goto('/nueva-solicitud.html');
  await completarFormulario(page);
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();
  const codigo = (await page.getByTestId('codigo').textContent()).trim();
  await page.getByRole('button', { name: 'Restablecer datos' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restablecer' }).click();
  await expect(page.getByText('Datos simulados restablecidos a su estado inicial.')).toBeVisible();
  const r = await request.get('/api/v1/solicitudes', { headers: encabezados(CUENTAS.lucia), params: { codigo } });
  expect((await r.json()).total).toBe(0);
  observar(info, `${codigo} registrado y luego eliminado por el restablecimiento (búsqueda por código → total 0).`);
});

test('D07 DELETE /api/v1/notificaciones/{id}: borra solo avisos propios', async ({ page, request }, info) => {
  const { items } = await (await request.get('/api/v1/notificaciones', { headers: encabezados(CUENTAS.lucia) })).json();
  const propio = items[0];
  const ajeno = await request.delete(`/api/v1/notificaciones/${propio.id}`, { headers: encabezados(CUENTAS.ana) });
  expect(ajeno.status()).toBe(403);
  expect((await ajeno.json()).codigo).toBe('PERMISO_DENEGADO');

  await ingresar(page, CUENTAS.lucia);
  await page.getByRole('link', { name: 'Notificaciones' }).click();
  const avisos = page.locator('[data-aviso]');
  const antes = await avisos.count();
  await captura(page, 'd07-notificaciones.png');
  await avisos.first().getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.locator('#aviso-accion')).toContainText('Aviso eliminado');
  await expect(avisos).toHaveCount(antes - 1);

  const restante = (await (await request.get('/api/v1/notificaciones', { headers: encabezados(CUENTAS.lucia) })).json()).items[0];
  const borrar = await request.delete(`/api/v1/notificaciones/${restante.id}`, { headers: encabezados(CUENTAS.lucia) });
  expect(borrar.status()).toBe(204);
  expect((await request.delete(`/api/v1/notificaciones/${restante.id}`, { headers: encabezados(CUENTAS.lucia) })).status()).toBe(404);
  // La solicitud asociada sigue intacta
  expect((await request.get(`/api/v1/solicitudes/${restante.solicitud_id}`, { headers: encabezados(CUENTAS.lucia) })).status()).toBe(200);
  observar(info, `Aviso ajeno → 403 PERMISO_DENEGADO; eliminar desde la vista quitó 1 aviso (${antes}→${antes - 1}); DELETE propio → 204 y repetido → 404; la solicitud asociada sigue disponible.`);
});

test('D07 DELETE /api/v1/admin/catalogos/{tipo}/{id}: desactivación lógica', async ({ page, request }, info) => {
  expect((await request.delete('/api/v1/admin/catalogos/categorias/6', { headers: encabezados(CUENTAS.lucia) })).status()).toBe(403);

  await ingresar(page, CUENTAS.luis);
  const fila = page.locator('tr[data-registro="categorias-6"]');
  await expect(fila).toContainText('Mobiliario');
  await expect(fila).toContainText('Activo');
  await fila.getByRole('button', { name: 'Desactivar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Desactivar' }).click();
  await expect(fila).toContainText('Inactivo');
  await captura(page, 'd07-catalogo-desactivado.png');

  const registro = await (await request.get('/api/v1/admin/catalogos/categorias/6', { headers: encabezados(CUENTAS.luis) })).json();
  expect(registro).toMatchObject({ id: 6, nombre: 'Mobiliario', activo: false });
  const activas = await (await request.get('/api/v1/catalogos', { headers: encabezados(CUENTAS.lucia), params: { tipo: 'categorias' } })).json();
  expect(activas.items.some((c) => c.id === 6)).toBe(false);
  const rechazo = await request.post('/api/v1/solicitudes', { headers: encabezados(CUENTAS.lucia), data: { categoria_id: 6, ubicacion_id: 1, descripcion: 'Carpeta rota en la última fila del aula.', impacto: 'BAJO', urgencia: 'BAJA' } });
  expect(rechazo.status()).toBe(400);

  // HU21 BDD 1: sigue visible en los casos anteriores
  await ingresar(page, CUENTAS.lucia);
  await page.goto('/detalle.html?id=5');
  await expect(page.locator('.datos').first()).toContainText('Mobiliario');
  await page.goto('/nueva-solicitud.html');
  await expect(page.locator('#campo-categoria')).toBeEnabled();
  const opciones = await page.locator('#campo-categoria option').allTextContents();
  expect(opciones).not.toContain('Mobiliario');
  expect(opciones).toContain('Reubicación de mobiliario');

  const reactivar = await request.put('/api/v1/admin/catalogos/categorias/6', { headers: encabezados(CUENTAS.luis), data: { activo: true } });
  expect((await reactivar.json()).activo).toBe(true);
  observar(info, 'Solicitante → 403. Administrador: «Desactivar» deja Mobiliario como Inactivo; GET del registro devuelve activo=false (no se borró); deja de ofrecerse en el formulario y la API rechaza su uso (400); MSU-2026-0005 sigue mostrando Mobiliario; PUT {activo:true} la reactiva.');
});
