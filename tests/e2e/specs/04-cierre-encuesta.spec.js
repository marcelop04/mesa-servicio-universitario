import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud } from '../helpers/datos.js';

test.describe('Épica 4: Conformidad y Encuesta de Satisfacción', () => {

  test('@HU12 Confirmar solución por el solicitante y cerrar solicitud', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud en estado Resuelta para el solicitante', async () => {
      solicitud = await prepararSolicitud('RESUELTA', {
        descripcion: 'Caso para confirmar solución HU12',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitud.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando el solicitante abre el caso y presiona Confirmar solución', async () => {
      await expect(page.locator('#titulo-conformidad')).toBeVisible({ timeout: 10000 });
      const botonConfirmar = page.getByRole('button', { name: 'Confirmar solución' });
      await expect(botonConfirmar).toBeVisible();
      await botonConfirmar.click();
    });

    await test.step('Entonces la solicitud queda Cerrada y se despliega la encuesta', async () => {
      await expect(page.getByText('Gracias: la solicitud quedó cerrada.')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.detalle__cabecera').getByText('Cerrada')).toBeVisible();
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

  test('@HU14 Reapertura de solicitud por el Solicitante ante persistencia del problema', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud en estado Resuelta que presenta fallas persistentes', async () => {
      solicitud = await prepararSolicitud('RESUELTA', {
        descripcion: 'Caso para reapertura de solicitud HU14',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitud.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando el solicitante presiona El problema persiste y sustenta con motivo obligatorio', async () => {
      await expect(page.locator('#titulo-conformidad')).toBeVisible({ timeout: 10000 });
      const botonReabrirModal = page.getByRole('button', { name: 'El problema persiste' });
      await expect(botonReabrirModal).toBeVisible();
      await botonReabrirModal.click();

      const campoMotivo = page.locator('#motivo-reapertura');
      await expect(campoMotivo).toBeVisible({ timeout: 5000 });
      await campoMotivo.fill('El inconveniente con el proyector persiste tras reiniciar los equipos en el laboratorio.');

      const botonConfirmarReapertura = page.getByRole('dialog').getByRole('button', { name: 'Reabrir' });
      await botonConfirmarReapertura.click();
    });

    await test.step('Entonces la solicitud se reabre retornando a atención técnica', async () => {
      await expect(page.getByText('Solicitud reabierta: el técnico retomará la atención.')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.detalle__cabecera').getByText(/En atención|Asignada/)).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

});
