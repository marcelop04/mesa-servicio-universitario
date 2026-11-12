import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud } from '../helpers/datos.js';

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
      const codigo = texto?.match(/MSU-\d{4}-\d{4}/)?.[0];
      expect(codigo).toBeDefined();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU05 Consulta de Mis Solicitudes con filtros y visualización de detalle', async ({ page }) => {
    await test.step('Dado que el solicitante accede a la bandeja de mis solicitudes', async () => {
      await login(page, USUARIOS.solicitante);
      await page.goto('/solicitudes');
      await expect(page.getByRole('heading', { name: 'Mis solicitudes' })).toBeVisible();
    });

    await test.step('Cuando visualiza el listado de casos registrados y selecciona uno', async () => {
      const enlaceSolicitud = page.locator('.tabla a[href^="/solicitudes/"]').first();
      await expect(enlaceSolicitud).toBeVisible({ timeout: 10000 });
      await enlaceSolicitud.click();
    });

    await test.step('Entonces ingresa a la pantalla de detalle P06 sin desplazamiento horizontal', async () => {
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU06 Agregar comentario en el seguimiento de una solicitud activa', async ({ page }) => {
    let solicitudActiva;

    await test.step('Dado que existe una solicitud activa preparada para el solicitante', async () => {
      solicitudActiva = await prepararSolicitud('REGISTRADA', {
        descripcion: 'Caso activo para verificación de comentarios HU06',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitudActiva.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando redacta y envía un comentario de seguimiento', async () => {
      const areaComentario = page.locator('#nuevo-comentario');
      await expect(areaComentario).toBeVisible({ timeout: 5000 });
      await areaComentario.fill('Aporte de seguimiento automatizado con Playwright E2E.');
      await page.getByRole('button', { name: 'Comentar' }).click();
    });

    await test.step('Entonces el comentario aparece publicado en la sección de comentarios', async () => {
      await expect(page.getByText('Aporte de seguimiento automatizado con Playwright E2E.')).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU24 Visualización del historial de transiciones y eventos operativos', async ({ page }) => {
    let solicitudConHistorial;

    await test.step('Dado que existe una solicitud con múltiples transiciones operativas', async () => {
      solicitudConHistorial = await prepararSolicitud('EN_ATENCION', {
        descripcion: 'Caso con historial para verificación HU24',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitudConHistorial.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando revisa la sección del historial de la solicitud', async () => {
      const seccionHistorial = page.locator('section[aria-labelledby="titulo-historial"]');
      await expect(seccionHistorial).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#titulo-historial')).toHaveText('Historial');
    });

    await test.step('Entonces visualiza los eventos operativos con actor, acción, fecha y cambios', async () => {
      const eventos = page.locator('.historial__evento');
      await expect(eventos.first()).toBeVisible({ timeout: 5000 });
      const totalEventos = await eventos.count();
      expect(totalEventos).toBeGreaterThanOrEqual(3);

      // Comprobar que contiene las transiciones registradas
      await expect(page.locator('.historial')).toContainText(/Registró la solicitud/);
      await expect(page.locator('.historial')).toContainText(/Inició la evaluación/);
      await expect(page.locator('.historial')).toContainText(/Asignó un técnico/);
      await expect(page.locator('.historial')).toContainText(/Inició la atención/);
      await expectSinDesbordeHorizontal(page);
    });
  });

});
