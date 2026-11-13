import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud } from '../helpers/datos.js';

test.describe('Épica 4: Conformidad y Encuesta de Satisfacción', () => {

  test('@HU12 Conformidad de solución (BDD 1) y reapertura por persistencia (BDD 2)', async ({ page }) => {
    let solicitudResuelta1;
    let solicitudResuelta2;

    await test.step('Dado que existe una solicitud en estado Resuelta que el solicitante aprueba (BDD 1)', async () => {
      solicitudResuelta1 = await prepararSolicitud('RESUELTA', {
        descripcion: 'Caso para conformidad de solución HU12 BDD 1',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitudResuelta1.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#titulo-conformidad')).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Confirmar solución' }).click();
      await expect(page.getByText('Gracias: la solicitud quedó cerrada.')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.detalle__cabecera').getByText('Cerrada')).toBeVisible();
    });

    await test.step('Y cuando existe otra solicitud resuelta donde el problema persiste y se sustenta reapertura (BDD 2)', async () => {
      solicitudResuelta2 = await prepararSolicitud('RESUELTA', {
        descripcion: 'Caso para reapertura de solicitud HU12 BDD 2',
      });
      await page.goto(`/solicitudes/${solicitudResuelta2.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#titulo-conformidad')).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: 'El problema persiste' }).click();
      const campoMotivo = page.locator('#motivo-reapertura');
      await expect(campoMotivo).toBeVisible({ timeout: 5000 });
      await campoMotivo.fill('El inconveniente con el proyector persiste tras reiniciar los equipos.');
      await page.getByRole('dialog').getByRole('button', { name: 'Reabrir' }).click();

      await expect(page.getByText('Solicitud reabierta: el técnico retomará la atención.')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.detalle__cabecera').getByText(/En atención|Asignada/)).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU13 Envío de encuesta de satisfacción única en solicitud cerrada', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud cerrada con encuesta pendiente', async () => {
      solicitud = await prepararSolicitud('CERRADA', {
        descripcion: 'Caso para envío de encuesta de satisfacción HU13',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitud.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando califica la atención recibida y envía su opinión', async () => {
      await expect(page.getByRole('heading', { name: '¿Cómo calificas la atención?' })).toBeVisible({ timeout: 10000 });
      const opcionExcelente = page.locator('.encuesta__nivel', { hasText: '5' });
      await expect(opcionExcelente).toBeVisible();
      await opcionExcelente.click();

      const comentarioEncuesta = page.locator('#encuesta-comentario');
      await expect(comentarioEncuesta).toBeVisible();
      await comentarioEncuesta.fill('Excelente servicio técnico: atención rápida y eficiente.');

      const botonEnviar = page.getByRole('button', { name: 'Enviar calificación' });
      await botonEnviar.click();
    });

    await test.step('Entonces el sistema confirma la recepción y no permite una segunda encuesta', async () => {
      await expect(page.getByText('Gracias: recibimos tu calificación.')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.encuesta__resultado')).toContainText('Calificaste con 5 de 5');

      await page.reload();
      const botonEnviar = page.getByRole('button', { name: 'Enviar calificación' });
      expect(await botonEnviar.count()).toBe(0);
      await expectSinDesbordeHorizontal(page);
    });
  });

});
