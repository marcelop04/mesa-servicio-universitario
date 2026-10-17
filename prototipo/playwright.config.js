/**
 * Configuración de Playwright para las pruebas PV01–PV08 (tabla 26).
 * Responsable: Emanuel (D09).
 *
 * Levanta un servidor propio en el puerto 3011 con una base temporal
 * (.tmp/db-e2e.json) para no tocar los datos de la demostración (puerto 3001).
 * Las capturas se guardan en ../docs/pruebas/capturas/.
 */
import { defineConfig, devices } from '@playwright/test';

export const PUERTO_PRUEBAS = 3011;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['json', { outputFile: '.tmp/resultados-e2e.json' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PUERTO_PRUEBAS}`,
    viewport: { width: 1366, height: 768 },
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    testIdAttribute: 'data-prueba',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node servidor/servidor.js',
    url: `http://localhost:${PUERTO_PRUEBAS}/api/v1/demo/cuentas`,
    reuseExistingServer: false,
    env: { PUERTO: String(PUERTO_PRUEBAS), DB_ARCHIVO: '.tmp/db-e2e.json', SILENCIOSO: '1' },
  },
});
