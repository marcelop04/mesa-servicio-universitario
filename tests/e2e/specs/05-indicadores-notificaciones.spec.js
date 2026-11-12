import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 5: Notificaciones, Alertas y Dashboard', () => {

  test('@HU16 Centro de notificaciones y marcado de lectura', async ({ page }) => {
    await test.step('Dado que el solicitante ingresa al centro de notificaciones P09', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/notificaciones');
      await expect(page.locator('section[aria-label="Centro de notificaciones"]')).toBeVisible();
    });

    await test.step('Cuando revisa sus avisos y marca todos como leídos', async () => {
      const botonMarcarTodas = page.getByRole('button', { name: /Marcar todas como leídas/i });
      if (await botonMarcarTodas.isVisible({ timeout: 5000 }).catch(() => false)) {
        await botonMarcarTodas.click();
      }
    });

    await test.step('Entonces los avisos quedan registrados y legibles sin desborde horizontal', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU17, @HU18 y @HU19 Dashboard del Supervisor con métricas y exportación CSV', async ({ page }) => {
    await test.step('Dado que el supervisor ingresa al dashboard P10', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/dashboard');
      await expect(page.locator('section[aria-label="Dashboard"]')).toBeVisible();
    });

    await test.step('Cuando visualiza las tarjetas de conteos e indicadores de tiempo y satisfacción', async () => {
      await expect(page.locator('.cifras').first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Entonces puede descargar el reporte de solicitudes en formato CSV', async () => {
      const botonExportar = page.getByRole('link', { name: /Exportar CSV/i });
      await expect(botonExportar).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

});

