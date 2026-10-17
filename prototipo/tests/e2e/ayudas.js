/**
 * Utilidades compartidas por las pruebas de extremo a extremo.
 * Responsable: Emanuel (D09).
 */
import { expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

export const CAPTURAS = fileURLToPath(new URL('../../../docs/pruebas/capturas/', import.meta.url));
mkdirSync(CAPTURAS, { recursive: true });

export const CUENTAS = {
  lucia: { id: 1, correo: 'lucia.ramos@demo.edu.pe', nombre: 'Lucía Ramos Quispe', rol: 'Solicitante' },
  jorge: { id: 2, correo: 'jorge.mendoza@demo.edu.pe', nombre: 'Jorge Mendoza Salas', rol: 'Solicitante' },
  sofia: { id: 3, correo: 'sofia.leon@demo.edu.pe', nombre: 'Sofía León Aguirre', rol: 'Solicitante' },
  carla: { id: 4, correo: 'carla.huaman@demo.edu.pe', nombre: 'Carla Huamán Torres', rol: 'Técnico' },
  ana: { id: 9, correo: 'ana.castillo@demo.edu.pe', nombre: 'Ana Castillo Vera', rol: 'Supervisor' },
  luis: { id: 10, correo: 'luis.gutierrez@demo.edu.pe', nombre: 'Luis Gutiérrez Pinto', rol: 'Administrador' },
};

export const HORA = 3600 * 1000;

export function captura(page, nombre, opciones = {}) {
  return page.screenshot({ path: path.join(CAPTURAS, nombre), fullPage: true, ...opciones });
}

/** Registra en el reporte JSON lo que realmente se observó. */
export function observar(testInfo, texto) {
  testInfo.annotations.push({ type: 'observado', description: texto });
}

export async function restablecer(request, base = '') {
  const r = await request.post(`${base}/api/v1/demo/restablecer`);
  expect(r.status()).toBe(200);
}

/** Acceso simulado por la interfaz (PR01). */
export async function ingresar(page, cuenta, base = '') {
  await page.goto(`${base}/index.html`);
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${base}/index.html`);
  await page.locator(`input[name="correo"][value="${cuenta.correo}"]`).check();
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(/(solicitudes|catalogos)\.html/);
  await expect(page.getByTestId('usuario-actual')).toContainText(cuenta.nombre);
}

export function encabezados(cuenta) {
  return { 'X-Usuario-Id': String(cuenta.id) };
}

/** Completa el formulario de nueva solicitud con datos válidos (o los indicados). */
export async function completarFormulario(page, datos = {}) {
  const {
    categoria = 'Proyector y audio', ubicacion = 'Pabellón A — Aula 203',
    descripcion = 'El proyector del aula 203 se apaga a los cinco minutos de encenderlo durante la clase.',
    impacto = 'medio', urgencia = 'media',
  } = datos;
  await expect(page.locator('#campo-categoria')).toBeEnabled();
  if (categoria) await page.locator('#campo-categoria').selectOption({ label: categoria });
  if (ubicacion) await page.locator('#campo-ubicacion').selectOption({ label: ubicacion });
  await page.locator('#campo-descripcion').fill(descripcion);
  if (impacto) await page.locator(`#impacto-${impacto}`).check();
  if (urgencia) await page.locator(`#urgencia-${urgencia}`).check();
}

/** Comprueba que la página no tenga desplazamiento horizontal (RNF05). */
export async function sinDesbordeHorizontal(page) {
  const medidas = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(medidas.scrollWidth, `scrollWidth ${medidas.scrollWidth} > innerWidth ${medidas.innerWidth}`).toBeLessThanOrEqual(medidas.innerWidth);
  return medidas;
}
