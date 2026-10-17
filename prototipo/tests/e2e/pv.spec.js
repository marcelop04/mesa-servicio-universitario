/**
 * Pruebas de validación PV01–PV08 de la tabla 26 contra el prototipo en ejecución.
 * Responsable: Emanuel (D09). PV09 es unitaria (tests/unit/indicadores.test.js)
 * y PV10 es una revisión documental (docs/pruebas/resultados-PV.md).
 *
 * Cada prueba restablece los datos simulados antes de empezar.
 * Las capturas quedan en docs/pruebas/capturas/.
 */
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import {
  CUENTAS, HORA, captura, observar, restablecer, ingresar, encabezados, completarFormulario, sinDesbordeHorizontal,
} from './ayudas.js';

test.beforeEach(async ({ request }) => {
  await restablecer(request);
});

async function totalDe(request, cuenta) {
  const r = await request.get('/api/v1/solicitudes', { headers: encabezados(cuenta), params: { 'tamaño': 100 } });
  expect(r.status()).toBe(200);
  return (await r.json()).total;
}

test('PV01 Registro válido: código único, prioridad y límites; listado y detalle consistentes', async ({ page, request }, info) => {
  await ingresar(page, CUENTAS.lucia);
  const antes = await totalDe(request, CUENTAS.lucia);
  await page.goto('/nueva-solicitud.html');
  await completarFormulario(page, { impacto: 'medio', urgencia: 'media' });
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();

  const resultado = page.getByTestId('resultado-registro');
  await expect(resultado).toBeVisible();
  await expect(page.locator('#titulo-resultado')).toBeFocused();
  const codigo = (await page.getByTestId('codigo').textContent()).trim();
  expect(codigo).toMatch(/^MSU-2026-\d{4}$/);
  await expect(resultado.getByTestId('estado')).toHaveText('Registrada');
  await expect(resultado.getByTestId('prioridad')).toHaveText('Prioridad Media');
  const limiteAtencion = (await resultado.getByTestId('limite-atencion').textContent()).trim();
  const limiteResolucion = (await resultado.getByTestId('limite-resolucion').textContent()).trim();
  await captura(page, 'pv01-registro-exitoso.png');

  // Unicidad y valores calculados en el servidor
  const r = await request.get('/api/v1/solicitudes', { headers: encabezados(CUENTAS.ana), params: { codigo, 'tamaño': 100 } });
  const { items, total } = await r.json();
  expect(total).toBe(1);
  const s = items[0];
  expect(s.estado_codigo).toBe('REGISTRADA');
  expect(s.solicitante_id).toBe(CUENTAS.lucia.id);
  expect(Date.parse(s.limite_atencion) - Date.parse(s.registrada_en)).toBe(24 * HORA);
  expect(Date.parse(s.limite_resolucion) - Date.parse(s.registrada_en)).toBe(120 * HORA);
  expect(await totalDe(request, CUENTAS.lucia)).toBe(antes + 1);

  // Listado
  await page.getByRole('link', { name: 'Ir a mis solicitudes' }).click();
  const fila = page.locator('tbody tr', { hasText: codigo });
  await expect(fila).toHaveCount(1);
  await expect(fila).toContainText('Registrada');
  await expect(fila).toContainText('Prioridad Media');
  await expect(fila).toContainText('Sin asignar');
  await captura(page, 'pv01-listado.png');

  // Detalle
  await fila.getByRole('link', { name: codigo }).click();
  await expect(page.getByTestId('codigo')).toHaveText(codigo);
  await expect(page.getByTestId('estado')).toHaveText('Registrada');
  await expect(page.getByTestId('prioridad')).toHaveText('Prioridad Media');
  await expect(page.getByTestId('responsable')).toHaveText('Sin asignar');
  await expect(page.getByTestId('limite-atencion')).toContainText(limiteAtencion);
  await expect(page.getByTestId('limite-resolucion')).toContainText(limiteResolucion);
  await expect(page.getByTestId('historial')).toContainText('Solicitud registrada');
  await captura(page, 'pv01-detalle.png');
  observar(info, `Código ${codigo}; estado Registrada; Prioridad Media; límites ${limiteAtencion} y ${limiteResolucion} (24 h y 120 h exactas desde registrada_en ${s.registrada_en}); total del solicitante ${antes}→${antes + 1}; 1 coincidencia del código; listado y detalle muestran los mismos valores.`);
});

test('PV02 Campos incompletos: sin ubicación y descripción corta', async ({ page, request }, info) => {
  await ingresar(page, CUENTAS.lucia);
  const antes = await totalDe(request, CUENTAS.lucia);
  await page.goto('/nueva-solicitud.html');
  await completarFormulario(page, { ubicacion: null, descripcion: 'No funciona', impacto: 'medio', urgencia: 'alta' });
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();

  const resumen = page.locator('#resumen-errores');
  await expect(resumen).toBeVisible();
  await expect(resumen).toBeFocused();
  await expect(resumen).toContainText('La solicitud no se registró');
  const errorUbicacion = page.locator('[data-campo="ubicacion_id"] #error-ubicacion_id');
  const errorDescripcion = page.locator('[data-campo="descripcion"] #error-descripcion');
  await expect(errorUbicacion).toHaveText('Selecciona la ubicación donde ocurre el problema.');
  await expect(errorDescripcion).toContainText('tiene 11 caracteres y el mínimo es 20');
  await expect(page.locator('#campo-ubicacion')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#campo-descripcion')).toHaveAttribute('aria-describedby', /error-descripcion/);
  // Los datos válidos se conservan y no hay errores en los campos correctos
  await expect(page.locator('#campo-categoria option:checked')).toHaveText('Proyector y audio');
  await expect(page.locator('#impacto-medio')).toBeChecked();
  await expect(page.locator('#urgencia-alta')).toBeChecked();
  await expect(page.locator('#campo-descripcion')).toHaveValue('No funciona');
  await expect(page.locator('#error-categoria_id')).toHaveCount(0);
  await expect(page.getByTestId('resultado-registro')).toHaveCount(0);
  await captura(page, 'pv02-campos-incompletos.png');

  // El servidor también rechaza (sin depender del cliente) y responde con el formato común
  const r = await request.post('/api/v1/solicitudes', {
    headers: encabezados(CUENTAS.lucia),
    data: { categoria_id: 2, descripcion: 'No funciona', impacto: 'MEDIO', urgencia: 'ALTA' },
  });
  expect(r.status()).toBe(400);
  const cuerpo = await r.json();
  expect(cuerpo.codigo).toBe('VALIDACION');
  expect(cuerpo.errores.map((e) => e.campo).sort()).toEqual(['descripcion', 'ubicacion_id']);
  expect(cuerpo.id_correlacion).toBeTruthy();
  expect(await totalDe(request, CUENTAS.lucia)).toBe(antes);

  // Al corregir, el error del campo desaparece y el registro se completa
  await page.locator('#campo-ubicacion').selectOption({ label: 'Pabellón A — Aula 203' });
  await expect(errorUbicacion).toHaveCount(0);
  observar(info, `Interfaz: resumen enfocado con 2 errores; «Selecciona la ubicación donde ocurre el problema.» junto a Ubicación y «La descripción es muy corta: tiene 11 caracteres y el mínimo es 20.» junto a Descripción; categoría, impacto, urgencia y texto conservados. API directa: 400 VALIDACION con errores en descripcion y ubicacion_id e id_correlacion. Total sin cambios (${antes}).`);
});

/** Arranca un servidor real independiente para poder detenerlo durante la prueba. */
async function iniciarServidor(puerto, archivo) {
  const proceso = spawn(process.execPath, ['servidor/servidor.js'], {
    env: { ...process.env, PUERTO: String(puerto), DB_ARCHIVO: archivo, SILENCIOSO: '1' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${puerto}/api/v1/demo/cuentas`);
      if (r.ok) return proceso;
    } catch { /* aún no responde */ }
    await new Promise((ok) => setTimeout(ok, 100));
  }
  throw new Error('El servidor de PV03 no arrancó');
}

async function detenerServidor(proceso) {
  if (proceso.exitCode !== null) return;
  await new Promise((ok) => {
    proceso.once('exit', ok);
    proceso.kill('SIGTERM');
  });
}

test('PV03 Fallo de API: falla simulada (503) con reintento', async ({ page, request }, info) => {
  await ingresar(page, CUENTAS.lucia);
  const antes = await totalDe(request, CUENTAS.lucia);
  await page.goto('/nueva-solicitud.html');
  await completarFormulario(page);
  await page.getByLabel('Simular falla de la API').check();
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();

  const error = page.locator('#error-envio [data-estado="error-api"]');
  await expect(error).toBeVisible();
  await expect(error).toBeFocused();
  await expect(error.getByRole('heading')).toHaveText('La solicitud no se registró');
  await expect(error).toContainText('El servicio no está disponible en este momento');
  await expect(error).toContainText('Tus datos siguen en el formulario');
  await expect(error.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  await expect(page.getByText('Solicitud registrada')).toHaveCount(0);
  await expect(page.locator('#campo-descripcion')).not.toHaveValue('');
  await expect(page.getByRole('button', { name: 'Registrar solicitud' })).toBeEnabled();
  await captura(page, 'pv03-falla-simulada.png');
  expect(await totalDe(request, CUENTAS.lucia)).toBe(antes);

  await page.getByLabel('Simular falla de la API').uncheck();
  await error.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByTestId('resultado-registro')).toBeVisible();
  const codigo = (await page.getByTestId('codigo').textContent()).trim();
  expect(await totalDe(request, CUENTAS.lucia)).toBe(antes + 1);
  observar(info, `Con «Simular falla de la API»: 503 SERVICIO_NO_DISPONIBLE; mensaje «La solicitud no se registró … El servicio no está disponible…» con foco y botón Reintentar; ningún texto de éxito; datos conservados; total sin cambios (${antes}). Tras desactivar la falla, Reintentar registró ${codigo} (total ${antes + 1}).`);
});

test('PV03 Fallo de API: API detenida de verdad y reintento al volver', async ({ page }, info) => {
  const PUERTO = 3012;
  const archivo = '.tmp/db-pv03.json';
  rmSync(archivo, { force: true });
  let servidor = await iniciarServidor(PUERTO, archivo);
  const base = `http://localhost:${PUERTO}`;
  try {
    await ingresar(page, CUENTAS.lucia, base);
    await expect(page.locator('tbody tr')).toHaveCount(5);

    // Listado con la API detenida
    await detenerServidor(servidor);
    await page.getByRole('button', { name: 'Actualizar' }).click();
    const errorListado = page.locator('#resultados [data-estado="error-api"]');
    await expect(errorListado).toBeVisible();
    await expect(errorListado.getByRole('heading')).toHaveText('No se pudo cargar el listado');
    await expect(errorListado).toContainText('No se pudo conectar con la API simulada');
    await expect(errorListado.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await captura(page, 'pv03-api-detenida-listado.png');

    servidor = await iniciarServidor(PUERTO, archivo);
    await errorListado.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.locator('tbody tr')).toHaveCount(5);

    // Registro con la API detenida
    await page.goto(`${base}/nueva-solicitud.html`);
    await completarFormulario(page);
    await detenerServidor(servidor);
    await page.getByRole('button', { name: 'Registrar solicitud' }).click();
    const errorEnvio = page.locator('#error-envio [data-estado="error-api"]');
    await expect(errorEnvio).toContainText('La solicitud no se registró');
    await expect(errorEnvio).toContainText('No se pudo conectar con la API simulada');
    await expect(page.getByText('Solicitud registrada')).toHaveCount(0);
    await captura(page, 'pv03-api-detenida-registro.png');

    servidor = await iniciarServidor(PUERTO, archivo);
    await errorEnvio.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByTestId('resultado-registro')).toBeVisible();
    const codigo = (await page.getByTestId('codigo').textContent()).trim();
    const cuenta = await (await fetch(`${base}/api/v1/solicitudes?codigo=${codigo}`, { headers: encabezados(CUENTAS.lucia) })).json();
    expect(cuenta.total).toBe(1);
    observar(info, `Proceso del servidor terminado con SIGTERM: el listado mostró «No se pudo cargar el listado … No se pudo conectar con la API simulada…» con Reintentar; el registro mostró «La solicitud no se registró» sin texto de éxito. Al reiniciar el servidor, Reintentar cargó el listado y registró ${codigo} una sola vez.`);
  } finally {
    await detenerServidor(servidor);
  }
});

test('PV04 Prioridad: impacto Medio y urgencia Alta', async ({ page }, info) => {
  await ingresar(page, CUENTAS.lucia);
  await page.goto('/nueva-solicitud.html');
  await completarFormulario(page, { impacto: 'medio', urgencia: 'alta' });
  const vista = page.getByTestId('vista-prioridad');
  await expect(vista).toContainText('Prioridad Alta');
  await expect(page.getByTestId('plazo-atencion')).toContainText('8 h desde el registro');
  await expect(page.getByTestId('plazo-resolucion')).toContainText('48 h desde el registro');
  await captura(page, 'pv04-prioridad-en-vivo.png');

  const respuesta = page.waitForResponse((r) => r.url().endsWith('/api/v1/solicitudes') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Registrar solicitud' }).click();
  const s = await (await respuesta).json();
  expect(s.prioridad_codigo).toBe('ALTA');
  expect(Date.parse(s.limite_atencion) - Date.parse(s.registrada_en)).toBe(8 * HORA);
  expect(Date.parse(s.limite_resolucion) - Date.parse(s.registrada_en)).toBe(48 * HORA);
  await expect(page.getByTestId('resultado-registro').getByTestId('prioridad')).toHaveText('Prioridad Alta');
  await expect(page.getByTestId('limite-atencion')).toContainText('(8 h)');
  await expect(page.getByTestId('limite-resolucion')).toContainText('(48 h)');
  await captura(page, 'pv04-prioridad-registrada.png');

  // Las otras combinaciones de la tabla 5 en la interfaz
  await page.goto('/nueva-solicitud.html');
  await completarFormulario(page, { impacto: 'alto', urgencia: 'alta' });
  await expect(vista).toContainText('Prioridad Crítica');
  await page.locator('#impacto-bajo').check();
  await page.locator('#urgencia-baja').check();
  await expect(vista).toContainText('Prioridad Baja');
  observar(info, `Vista previa: «Prioridad Alta», «8 h desde el registro», «48 h desde el registro». Servidor: ${s.codigo} con prioridad_codigo ALTA, limite_atencion = registrada_en + 8 h y limite_resolucion = registrada_en + 48 h (${s.registrada_en} → ${s.limite_atencion} / ${s.limite_resolucion}).`);
});

test('PV05 Flujo permitido: evaluación y asignación visibles solo para el supervisor', async ({ page, request }, info) => {
  // Solicitante: ve su solicitud MSU-2026-0006 pero no tiene acciones
  await ingresar(page, CUENTAS.lucia);
  await page.goto('/detalle.html?id=6');
  await expect(page.getByTestId('estado')).toHaveText('Registrada');
  await expect(page.getByRole('button', { name: 'Iniciar evaluación' })).toHaveCount(0);
  await expect(page.locator('#panel-acciones')).toBeHidden();

  // Técnico no asignado: sin acceso al detalle
  await ingresar(page, CUENTAS.carla);
  await page.goto('/detalle.html?id=6');
  await expect(page.locator('[data-estado="error-api"]')).toContainText('No tienes acceso a esta solicitud');
  // Técnico asignado (MSU-2026-0004): solo su acción, sin acciones del supervisor
  await page.goto('/detalle.html?id=4');
  await expect(page.getByRole('button', { name: 'Iniciar atención' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar evaluación' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Cambiar prioridad' })).toHaveCount(0);

  // Permisos en el servidor
  expect((await request.post('/api/v1/solicitudes/6/evaluacion', { headers: encabezados(CUENTAS.lucia), data: { version: 1 } })).status()).toBe(403);

  // Supervisor
  await ingresar(page, CUENTAS.ana);
  await page.locator('tbody tr', { hasText: 'MSU-2026-0006' }).getByRole('link').click();
  await expect(page.getByTestId('estado')).toHaveText('Registrada');
  await expect(page.getByRole('heading', { name: 'Asignar técnico' })).toHaveCount(0);
  await captura(page, 'pv05-supervisor-registrada.png');
  await page.getByRole('button', { name: 'Iniciar evaluación' }).click();
  await expect(page.locator('#aviso-accion')).toContainText('la solicitud pasó a En evaluación');
  await expect(page.getByTestId('estado')).toHaveText('En evaluación');
  await expect(page.getByRole('button', { name: 'Iniciar evaluación' })).toHaveCount(0);

  // Solo técnicos activos del área (Soporte informático): Carla y Diego; no Miguel (inactivo) ni Pedro (Mantenimiento)
  const select = page.locator('#asignar-tecnico');
  await expect(select).toBeEnabled();
  const opciones = await select.locator('option').allTextContents();
  expect(opciones.some((o) => o.startsWith('Carla Huamán Torres'))).toBe(true);
  expect(opciones.some((o) => o.startsWith('Diego Salazar Núñez'))).toBe(true);
  expect(opciones.some((o) => o.includes('Miguel') || o.includes('Pedro'))).toBe(false);
  await select.selectOption({ label: 'Diego Salazar Núñez — 0 pendientes' });
  await page.getByRole('button', { name: 'Asignar técnico' }).click();
  await expect(page.locator('#aviso-accion')).toContainText('Solicitud asignada a Diego Salazar Núñez');
  await expect(page.getByTestId('estado')).toHaveText('Asignada');
  await expect(page.getByTestId('responsable')).toHaveText('Diego Salazar Núñez');
  const historial = page.getByTestId('historial');
  await expect(historial).toContainText('Evaluación iniciada');
  await expect(historial).toContainText('Técnico asignado');
  await expect(historial).toContainText('Responsable: Sin asignar → Diego Salazar Núñez');
  await captura(page, 'pv05-supervisor-asignada.png');

  // Técnicos inválidos rechazados por el servidor sin alterar el responsable (MSU-2026-0010, En evaluación)
  const otraArea = await request.post('/api/v1/solicitudes/10/asignaciones', { headers: encabezados(CUENTAS.ana), data: { tecnico_id: 6, version: 2 } });
  const inactivo = await request.post('/api/v1/solicitudes/10/asignaciones', { headers: encabezados(CUENTAS.ana), data: { tecnico_id: 8, version: 2 } });
  expect(otraArea.status()).toBe(400);
  expect(inactivo.status()).toBe(400);
  expect((await otraArea.json()).errores[0].campo).toBe('tecnico_id');
  const caso10 = await (await request.get('/api/v1/solicitudes/10', { headers: encabezados(CUENTAS.ana) })).json();
  expect(caso10.tecnico_id).toBeNull();
  // Asignar sin evaluar: transición inválida (MSU-2026-0008 Registrada)
  expect((await request.post('/api/v1/solicitudes/8/asignaciones', { headers: encabezados(CUENTAS.ana), data: { tecnico_id: 6, version: 1 } })).status()).toBe(409);

  // El efecto se ve en el detalle del solicitante
  await ingresar(page, CUENTAS.lucia);
  await page.goto('/detalle.html?id=6');
  await expect(page.getByTestId('estado')).toHaveText('Asignada');
  await expect(page.getByTestId('responsable')).toHaveText('Diego Salazar Núñez');
  await expect(page.locator('#panel-acciones')).toBeHidden();
  await captura(page, 'pv05-solicitante-ve-efecto.png');
  observar(info, 'Solicitante y técnico no ven acciones de supervisor (técnico no asignado recibe «No tienes acceso…»; POST de evaluación del solicitante → 403). Supervisor: «Iniciar evaluación» solo en Registrada → En evaluación; la lista de técnicos solo ofreció Carla y Diego (no Miguel inactivo ni Pedro de otra área); asignar Diego → Asignada, historial con «Evaluación iniciada» y «Técnico asignado». Técnico de otra área o inactivo → 400 en tecnico_id sin cambiar responsable; asignar en Registrada → 409. El solicitante ve Asignada y responsable Diego.');
});

test('PV06 Horas y versiones: cambio de prioridad desde el registro original', async ({ page, request }, info) => {
  await ingresar(page, CUENTAS.ana);
  await page.goto('/detalle.html?id=5');
  await expect(page.getByTestId('prioridad')).toHaveText('Prioridad Baja');
  const registrada = await page.getByTestId('registrada').locator('time').getAttribute('datetime');
  const antes = await (await request.get('/api/v1/solicitudes/5', { headers: encabezados(CUENTAS.ana) })).json();

  // Sin motivo: rechazado y sin cambios
  await page.locator('#prioridad-impacto').selectOption('MEDIO');
  await page.locator('#prioridad-urgencia').selectOption('ALTA');
  await expect(page.getByTestId('vista-recalculo')).toContainText('Nueva prioridad: Prioridad Alta');
  await page.getByRole('button', { name: 'Guardar cambio de prioridad' }).click();
  const bloque = page.locator('[data-bloque="accion-prioridad"]');
  await expect(bloque.locator('[data-resumen]')).toBeFocused();
  await expect(bloque.locator('#error-motivo')).toContainText('El motivo es obligatorio');
  const servidorSinMotivo = await request.post('/api/v1/solicitudes/5/evaluacion', { headers: encabezados(CUENTAS.ana), data: { impacto: 'MEDIO', urgencia: 'ALTA', version: antes.version } });
  expect(servidorSinMotivo.status()).toBe(400);
  const sinCambio = await (await request.get('/api/v1/solicitudes/5', { headers: encabezados(CUENTAS.ana) })).json();
  expect(sinCambio.prioridad_codigo).toBe('BAJA');
  expect(sinCambio.limite_resolucion).toBe(antes.limite_resolucion);
  await captura(page, 'pv06-cambio-sin-motivo.png');

  // Con motivo
  const motivo = 'El tablero suelto ya provocó una caída y la carpeta se usa en todas las clases.';
  await page.locator('#prioridad-motivo').fill(motivo);
  await page.getByRole('button', { name: 'Guardar cambio de prioridad' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cambiar prioridad' }).click();
  await expect(page.locator('#aviso-accion')).toContainText('Prioridad actualizada a Alta');
  await expect(page.getByTestId('prioridad')).toHaveText('Prioridad Alta');
  await expect(page.getByTestId('registrada').locator('time')).toHaveAttribute('datetime', registrada);
  const nuevaAtencion = await page.getByTestId('limite-atencion').locator('time').getAttribute('datetime');
  const nuevaResolucion = await page.getByTestId('limite-resolucion').locator('time').getAttribute('datetime');
  expect(Date.parse(nuevaAtencion) - Date.parse(registrada)).toBe(8 * HORA);
  expect(Date.parse(nuevaResolucion) - Date.parse(registrada)).toBe(48 * HORA);

  const evento = page.getByTestId('historial').locator('li[data-accion="CAMBIAR_PRIORIDAD"]');
  await expect(evento).toContainText('Prioridad: Baja → Alta');
  await expect(evento).toContainText('Límite de resolución:');
  await expect(evento).toContainText(motivo);
  await captura(page, 'pv06-cambio-prioridad.png');

  const despues = await (await request.get('/api/v1/solicitudes/5', { headers: encabezados(CUENTAS.ana) })).json();
  const { items } = await (await request.get('/api/v1/solicitudes/5/historial', { headers: encabezados(CUENTAS.ana) })).json();
  const ev = items.find((e) => e.accion === 'CAMBIAR_PRIORIDAD');
  expect(despues.registrada_en).toBe(antes.registrada_en);
  expect(despues.version_fechas).toBe(antes.version_fechas + 1);
  expect(despues.version).toBe(antes.version + 1);
  expect(ev.anterior.prioridad_codigo).toBe('BAJA');
  expect(ev.nuevo.prioridad_codigo).toBe('ALTA');
  expect(ev.anterior.limite_resolucion).toBe(antes.limite_resolucion);
  expect(ev.nuevo.limite_resolucion).toBe(despues.limite_resolucion);

  // Versión antigua: conflicto 409 (HU24)
  const conflicto = await request.post('/api/v1/solicitudes/5/evaluacion', { headers: encabezados(CUENTAS.ana), data: { impacto: 'ALTO', urgencia: 'ALTA', motivo, version: antes.version } });
  expect(conflicto.status()).toBe(409);
  observar(info, `Sin motivo: error junto al campo, resumen enfocado y 400 en el servidor; prioridad y límites sin cambios. Con motivo: Baja → Alta; registrada_en sin cambios (${registrada}); límites ${antes.limite_atencion}/${antes.limite_resolucion} → ${despues.limite_atencion}/${despues.limite_resolucion} (= registro + 8 h / + 48 h); evento CAMBIAR_PRIORIDAD con anterior/nuevo y motivo; version ${antes.version}→${despues.version}, version_fechas ${antes.version_fechas}→${despues.version_fechas}; versión antigua → 409.`);
});

for (const ancho of [360, 1366]) {
  test(`PV07 Responsive a ${ancho} px: registro y detalle sin desbordamiento global`, async ({ page }, info) => {
    await page.setViewportSize({ width: ancho, height: ancho === 360 ? 780 : 768 });
    await ingresar(page, CUENTAS.lucia);
    const medidas = [];

    await page.goto('/nueva-solicitud.html');
    await completarFormulario(page, { ubicacion: null, descripcion: 'Corta' });
    await page.getByRole('button', { name: 'Registrar solicitud' }).click();
    await expect(page.locator('#resumen-errores')).toBeVisible();
    medidas.push(['registro', await sinDesbordeHorizontal(page)]);
    if (ancho === 360) {
      await expect(page.locator('#menu')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Menú' })).toBeVisible();
    } else {
      await expect(page.locator('#menu')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Menú' })).toBeHidden();
    }
    await captura(page, `pv07-registro-${ancho}.png`);

    await page.goto('/detalle.html?id=3');
    await expect(page.getByTestId('codigo')).toHaveText('MSU-2026-0003');
    medidas.push(['detalle', await sinDesbordeHorizontal(page)]);
    await captura(page, `pv07-detalle-${ancho}.png`);

    await page.goto('/solicitudes.html');
    await expect(page.locator('tbody tr').first()).toBeVisible();
    medidas.push(['listado', await sinDesbordeHorizontal(page)]);
    if (ancho === 360) {
      // La tabla se transforma en tarjetas: el encabezado queda oculto visualmente
      const display = await page.locator('tbody tr').first().evaluate((tr) => getComputedStyle(tr).display);
      expect(display).toBe('block');
      await page.getByRole('button', { name: 'Menú' }).click();
      await expect(page.locator('#menu')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'true');
      medidas.push(['listado con menú abierto', await sinDesbordeHorizontal(page)]);
    }
    await captura(page, `pv07-listado-${ancho}.png`);

    // Vista del supervisor con formularios de acción (la más cargada)
    await ingresar(page, CUENTAS.ana);
    await page.goto('/detalle.html?id=10');
    await expect(page.locator('#asignar-tecnico')).toBeEnabled();
    medidas.push(['detalle supervisor', await sinDesbordeHorizontal(page)]);
    await captura(page, `pv07-detalle-supervisor-${ancho}.png`);
    observar(info, medidas.map(([v, m]) => `${v}: scrollWidth ${m.scrollWidth} ≤ innerWidth ${m.innerWidth}`).join('; ') + (ancho === 360 ? '; menú contraído con botón «Menú» (aria-expanded) y tabla convertida en tarjetas.' : '; menú lateral visible.'));
  });
}

test('PV08 Navegación: lista, detalle y volver sin perder el registro', async ({ page, request }, info) => {
  await ingresar(page, CUENTAS.lucia);
  const creada = await (await request.post('/api/v1/solicitudes', {
    headers: encabezados(CUENTAS.lucia),
    data: { categoria_id: 4, ubicacion_id: 6, descripcion: 'El punto de acceso de la biblioteca reinicia cada hora.', impacto: 'MEDIO', urgencia: 'MEDIA' },
  })).json();

  await page.goto('/solicitudes.html');
  await page.locator('#filtro-estado').selectOption('REGISTRADA');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/estado=REGISTRADA/);
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByRole('link', { name: creada.codigo }).click();
  await expect(page.getByTestId('codigo')).toHaveText(creada.codigo);

  // Atrás del navegador
  await page.goBack();
  await expect(page).toHaveURL(/estado=REGISTRADA/);
  await expect(page.locator('#filtro-estado')).toHaveValue('REGISTRADA');
  await expect(page.getByRole('link', { name: creada.codigo })).toBeVisible();

  // Enlace «Volver al listado»
  await page.getByRole('link', { name: creada.codigo }).click();
  await page.getByRole('link', { name: '← Volver al listado' }).click();
  await expect(page).toHaveURL(/estado=REGISTRADA/);
  await expect(page.getByRole('link', { name: creada.codigo })).toBeVisible();

  // Paginación: página 2, detalle y volver
  await page.getByRole('button', { name: 'Limpiar' }).click();
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  const primeraDePagina2 = (await page.locator('tbody tr a').first().textContent()).trim();
  await page.locator('tbody tr a').first().click();
  await expect(page.getByTestId('codigo')).toHaveText(primeraDePagina2);
  await page.goBack();
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Página 1 de 2')).toBeVisible();

  // Recarga: el registro persiste en la API simulada
  await page.reload();
  await expect(page.getByRole('link', { name: creada.codigo })).toBeVisible();
  await captura(page, 'pv08-navegacion.png');
  observar(info, `Filtro Registrada → detalle de ${creada.codigo} → Atrás: URL ?estado=REGISTRADA, filtro y fila conservados; «Volver al listado» conserva el filtro; página 2 → detalle (${primeraDePagina2}) → Atrás vuelve a «Página 2 de 2» y otra vez Atrás a «Página 1 de 2»; tras recargar, ${creada.codigo} sigue en el listado.`);
});
