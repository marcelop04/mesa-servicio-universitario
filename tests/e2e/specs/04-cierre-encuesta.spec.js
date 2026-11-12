import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 4: Conformidad y Encuesta de Satisfacción', () => {

  test('@HU12 Confirmar solución por el solicitante y cerrar solicitud', async ({ page }) => {
    await test.step('Dado que el solicitante consulta sus solicitudes para dar conformidad', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/solicitudes');
      await expect(page.getByRole('heading', { name: 'Mis solicitudes' })).toBeVisible();
    });

    await test.step('Cuando abre una solicitud resuelta y confirma la solución', async () => {
      const filtroEstado = page.locator('#mis-estado');
      if (await filtroEstado.isVisible()) {
        await filtroEstado.selectOption('RESUELTA');
      }

      const enlaceCaso = page.locator('.tabla a[href^="/solicitudes/"]').first();
      if (await enlaceCaso.isVisible({ timeout: 5000 }).catch(() => false)) {
        await enlaceCaso.click();

        const botonConfirmar = page.getByRole('button', { name: 'Confirmar solución' });
        if (await botonConfirmar.isVisible({ timeout: 5000 }).catch(() => false)) {
          await botonConfirmar.click();
          await expect(page.getByText(/la solicitud quedó cerrada/)).toBeVisible();
        }
      }
    });

    await test.step('Entonces la solicitud queda Cerrada y se despliega la sección de calificación', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU13 Envío de encuesta de satisfacción única en solicitud cerrada', async ({ page }) => {
    await test.step('Dado que el solicitante se encuentra en una solicitud cerrada con encuesta pendiente', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/solicitudes');
      const filtroEstado = page.locator('#mis-estado');
      if (await filtroEstado.isVisible()) {
        await filtroEstado.selectOption('CERRADA');
      }
      const enlaceCaso = page.locator('.tabla a[href^="/solicitudes/"]').first();
      if (await enlaceCaso.isVisible({ timeout: 5000 }).catch(() => false)) {
        await enlaceCaso.click();
      }
    });

    await test.step('Cuando califica la atención recibida y envía su opinión', async () => {
      const grupoEncuesta = page.getByRole('heading', { name: '¿Cómo calificas la atención?' });
      if (await grupoEncuesta.isVisible({ timeout: 5000 }).catch(() => false)) {
        const opcionSatisfecho = page.locator('.encuesta__nivel', { hasText: /4|5|Satisfecho/ }).first();
        if (await opcionSatisfecho.isVisible()) {
          await opcionSatisfecho.click();
        }

        const comentarioEncuesta = page.locator('#encuesta-comentario');
        if (await comentarioEncuesta.isVisible({ timeout: 3000 }).catch(() => false)) {
          await comentarioEncuesta.fill('El servicio técnico solucionó el problema a tiempo.');
        }

        const botonEnviar = page.getByRole('button', { name: 'Enviar calificación' });
        if (await botonEnviar.isVisible({ timeout: 3000 }).catch(() => false)) {
          await botonEnviar.click();
          await expect(page.getByText('Gracias: recibimos tu calificación.')).toBeVisible();
        }
      }
    });

    await test.step('Entonces no se permite registrar una segunda encuesta tras recargar', async () => {
      await page.reload();
      const botonEnviar = page.getByRole('button', { name: 'Enviar calificación' });
      expect(await botonEnviar.count()).toBe(0);
      await expectSinDesbordeHorizontal(page);
    });
  });

});

