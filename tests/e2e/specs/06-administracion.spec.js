import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 6: Administración y Auditoría', () => {

  test('@HU20 Gestión de usuarios internos por el Administrador', async ({ page }) => {
    await test.step('Dado que el administrador ingresa a la gestión de usuarios P11', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/usuarios');
      await expect(page.locator('section[aria-label="Usuarios internos"]')).toBeVisible();
    });

    await test.step('Cuando consulta la tabla de cuentas y roles internos', async () => {
      const filas = page.locator('.tabla tbody tr');
      await expect(filas.first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Entonces visualiza las cuentas sin desplazamiento horizontal de página', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU21, @HU22 y @HU23 Configuración de Catálogos, Políticas y Auditoría', async ({ page }) => {
    await test.step('Dado que el administrador ingresa a la pantalla de configuración P12', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/configuracion');
      await expect(page.locator('section[aria-label="Configuración y auditoría"]')).toBeVisible();
    });

    await test.step('Cuando navega a la pestaña de Políticas de plazos (HU22)', async () => {
      const pestanaPoliticas = page.getByRole('tab', { name: 'Políticas de plazos' });
      await pestanaPoliticas.click();
      await expect(page.getByRole('heading', { name: /^Versión vigente: v\d+/ })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Y cuando navega a la pestaña de Auditoría administrativa (HU23)', async () => {
      const pestanaAuditoria = page.getByRole('tab', { name: 'Auditoría administrativa' });
      await pestanaAuditoria.click();
      await expect(page.getByRole('heading', { name: 'Auditoría administrativa' })).toBeVisible();

      const tablaAuditoria = page.locator('.tabla');
      await expect(tablaAuditoria).toBeVisible();
      const contenido = await tablaAuditoria.textContent();
      expect(contenido).not.toMatch(/\$2[ab]\$|MSU_SESION/);
    });

    await test.step('Entonces las pantallas administrativas operan correctamente y cumplen RNF05', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

});

