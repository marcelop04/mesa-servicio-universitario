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
      const total = await filas.count();
      expect(total).toBeGreaterThanOrEqual(1);
    });

    await test.step('Entonces visualiza las cuentas sin desplazamiento horizontal de página', async () => {
      await expect(page.locator('.tabla')).toContainText(/Administrador|Supervisor|Técnico/);
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU21 Mantenimiento y consulta de catálogos del sistema por el Administrador', async ({ page }) => {
    await test.step('Dado que el administrador ingresa a la configuración del sistema P12', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/configuracion');
      await expect(page.locator('section[aria-label="Configuración y auditoría"]')).toBeVisible();
    });

    await test.step('Cuando examina la sección de Catálogos', async () => {
      const pestanaCatalogos = page.getByRole('tab', { name: 'Catálogos' });
      await expect(pestanaCatalogos).toBeVisible();
      await pestanaCatalogos.click();
    });

    await test.step('Entonces se presentan los catálogos de áreas, categorías, ubicaciones y prioridades', async () => {
      await expect(page.getByRole('heading', { name: 'Áreas' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Categorías' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Ubicaciones' })).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU22 Versionado y consulta de políticas de atención', async ({ page }) => {
    await test.step('Dado que el administrador accede a las políticas de plazos', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/configuracion');
      const pestanaPoliticas = page.getByRole('tab', { name: 'Políticas de plazos' });
      await pestanaPoliticas.click();
      await expect(page.getByRole('heading', { name: /^Versión vigente: v\d+/ })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando crea y modifica plazos para publicar una nueva versión', async () => {
      const botonNueva = page.getByRole('button', { name: 'Nueva versión' });
      await expect(botonNueva).toBeVisible();
      await botonNueva.click();

      await expect(page.getByRole('heading', { name: /Nueva versión \d+/ })).toBeVisible();

      // Modificar el plazo de resolución de Baja para que sea diferente de la versión vigente
      const inputBajaResolucion = page.locator('#politica-BAJA-horas_resolucion');
      const actual = Number(await inputBajaResolucion.inputValue());
      await inputBajaResolucion.fill(String(actual + 24));

      const botonRevisar = page.getByRole('button', { name: 'Revisar y publicar' });
      await botonRevisar.click();

      const modalConfirmacion = page.getByRole('dialog');
      await expect(modalConfirmacion).toBeVisible();
      await modalConfirmacion.getByRole('button', { name: 'Publicar' }).click();
    });

    await test.step('Entonces se publica la nueva versión incrementada y queda registrada como vigente', async () => {
      await expect(page.getByText(/Se publicó la versión \d+\. Rige para las solicitudes nuevas desde ahora\./)).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: /^Versión vigente: v\d+/ })).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU23 Registro y consulta de auditoría administrativa', async ({ page }) => {
    await test.step('Dado que el administrador accede a la sección de auditoría', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/configuracion');
    });

    await test.step('Cuando navega a la pestaña de Auditoría administrativa', async () => {
      const pestanaAuditoria = page.getByRole('tab', { name: 'Auditoría administrativa' });
      await pestanaAuditoria.click();
      await expect(page.getByRole('heading', { name: 'Auditoría administrativa' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Entonces verifica los registros históricos y que no se expongan datos sensibles', async () => {
      const tablaAuditoria = page.locator('.tabla');
      await expect(tablaAuditoria).toBeVisible();
      const contenido = await tablaAuditoria.textContent();
      expect(contenido).not.toMatch(/\$2[ab]\$|MSU_SESION/);
      await expectSinDesbordeHorizontal(page);
    });
  });

});
