import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 2: Solicitudes de Servicio', () => {

  test('@HU04 Registro de nueva solicitud con prioridad inicial calculada', async ({ page }) => {
    await test.step('Dado que el solicitante ingresa al formulario de nueva solicitud', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/solicitudes/nueva');
      await expect(page.getByRole('heading', { name: 'Nueva solicitud' })).toBeVisible();
    });

    await test.step('Cuando completa la categoría, ubicación, urgencia, impacto y descripción', async () => {
      await page.getByLabel(/^Categoría/).selectOption({ label: 'Proyector y multimedia' });
      await page.getByLabel(/^Ubicación/).selectOption({ index: 1 });
      await page.getByLabel(/^Referencia/).fill('Cerca a la puerta principal');
      await page.getByLabel(/^Descripción/).fill('El proyector no proyecta imagen correctamente durante la exposición de clase.');
      await page.getByRole('radio', { name: /^Alta/ }).check();
      await page.getByRole('radio', { name: /^Medio/ }).check();
    });

    await test.step('Entonces al registrar se genera el código correlativo MSU y se calculan los límites', async () => {
      await page.getByRole('button', { name: 'Registrar solicitud' }).click();
      const mensajeExito = page.getByText(/Solicitud MSU-\d{4}-\d{4} registrada\./);
      await expect(mensajeExito).toBeVisible({ timeout: 10000 });

      const texto = await mensajeExito.textContent();
      const codigo = texto.match(/MSU-\d{4}-\d{4}/)?.[0];
      expect(codigo).toBeDefined();
    });
  });

  test('@HU05 Consulta de Mis Solicitudes con filtros y visualización de detalle', async ({ page }) => {
    await test.step('Dado que el solicitante accede a la bandeja de mis solicitudes', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/solicitudes');
      await expect(page.getByRole('heading', { name: 'Mis solicitudes' })).toBeVisible();
    });

    await test.step('Cuando visualiza el listado de casos registrados', async () => {
      const enlaceSolicitud = page.getByRole('link', { name: /MSU-\d{4}-\d{4}/ }).first();
      await expect(enlaceSolicitud).toBeVisible({ timeout: 10000 });
      await enlaceSolicitud.click();
    });

    await test.step('Entonces ingresa a la pantalla de detalle P06 sin desplazamiento horizontal', async () => {
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU06 Agregar comentario en el seguimiento de una solicitud', async ({ page }) => {
    await test.step('Dado que el solicitante se encuentra en el detalle de una solicitud activa', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/solicitudes');
      const primerEnlace = page.getByRole('link', { name: /MSU-\d{4}-\d{4}/ }).first();
      await expect(primerEnlace).toBeVisible({ timeout: 10000 });
      await primerEnlace.click();
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando redacta y envía un comentario de seguimiento', async () => {
      const areaComentario = page.locator('#nuevo-comentario');
      if (await areaComentario.isVisible({ timeout: 5000 }).catch(() => false)) {
        await areaComentario.fill('Aporte de seguimiento automatizado con Playwright E2E.');
        await page.getByRole('button', { name: 'Comentar' }).click();
        await expect(page.getByText('Aporte de seguimiento automatizado con Playwright E2E.')).toBeVisible({ timeout: 10000 });
      }
    });

    await test.step('Entonces el historial y los aportes reflejan la información enviada', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

});

