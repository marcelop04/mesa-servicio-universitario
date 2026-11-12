/**
 * Funciones de apoyo para autenticación, sesiones y validaciones comunes de Playwright.
 */
import { expect } from '@playwright/test';

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Demo12345!';

export const USUARIOS = {
  solicitante: process.env.SOLICITANTE_CORREO || 'solicitante@msu.test',
  supervisor: process.env.SUPERVISOR_CORREO || 'supervisor@msu.test',
  tecnico: process.env.TECNICO_CORREO || 'tecnico.soporte@msu.test',
  admin: process.env.ADMIN_CORREO || 'admin@msu.test'
};

/**
 * Inicia sesión en la interfaz web de MSU.
 * @param {import('@playwright/test').Page} page
 * @param {string} correo
 * @param {string} [password]
 */
export async function login(page, correo, password = DEMO_PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 });
}

/**
 * Valida que la página no tenga desborde horizontal (RNF05).
 * @param {import('@playwright/test').Page} page
 */
export async function expectSinDesbordeHorizontal(page) {
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(desborde, 'No debe haber desborde horizontal en el viewport').toBe(false);
}

