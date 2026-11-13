import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud, autenticarApi } from '../helpers/datos.js';

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

  test('@HU14 Cálculo y congelamiento de plazos de atención y resolución según política vigente', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud registrada para el solicitante', async () => {
      solicitud = await prepararSolicitud('REGISTRADA', {
        urgencia: 'ALTA',
        impacto: 'MEDIO',
        descripcion: 'Verificación de cálculo de plazos congelados HU14',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitud.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando revisa el panel de Fechas y plazos en el detalle P06', async () => {
      const panelPlazos = page.locator('section[aria-labelledby="titulo-plazos"]');
      await expect(panelPlazos).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#titulo-plazos')).toHaveText('Fechas y plazos');
    });

    await test.step('Entonces comprueba los límites de atención y resolución calculados en horas corridas', async () => {
      const panelPlazos = page.locator('section[aria-labelledby="titulo-plazos"]');
      await expect(panelPlazos).toContainText('Límite de primera atención');
      await expect(panelPlazos).toContainText('Límite de resolución');
      await expect(panelPlazos.locator('.campo__ayuda')).toContainText(/Horas corridas desde el registro, según la política v\d+\. Hora de Lima\./);
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU24 Reglas comunes de autorización por propiedad y concurrencia optimista', async ({ page }) => {
    let idAjena = null;

    await test.step('Dado que existe una solicitud creada por otro solicitante (BDD 1)', async () => {
      const stamp = Date.now();
      const correoOtro = `ajeno.${stamp}@msu.test`;
      const baseUrl = process.env.BASE_URL || 'http://localhost:8081';
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/v1`;

      const regRes = await fetch(`${apiUrl}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `Otro Solicitante ${stamp}`,
          correo: correoOtro,
          password: 'Password123!',
          vinculo: 'ESTUDIANTE',
        }),
      });

      if (regRes.ok) {
        const sesionOtro = await autenticarApi(correoOtro, 'Password123!');
        const solRes = await fetch(`${apiUrl}/solicitudes`, {
          method: 'POST',
          headers: sesionOtro.headers,
          body: JSON.stringify({
            categoria_id: 1,
            ubicacion_id: 1,
            descripcion: `Solicitud ajena privada ${stamp}`,
            urgencia: 'BAJA',
            impacto: 'BAJO',
          }),
        });
        if (solRes.ok) {
          const s = await solRes.json();
          idAjena = s.id;
        }
      }
    });

    await test.step('Cuando el solicitante intenta acceder directamente a la solicitud ajena (BDD 1)', async () => {
      await login(page, USUARIOS.solicitante);
      if (idAjena) {
        await page.goto(`/solicitudes/${idAjena}`);
        const mensajeError = page.locator('.mensaje--error');
        await expect(mensajeError).toBeVisible({ timeout: 5000 });
        await expect(mensajeError).toContainText(/No se pudo abrir la solicitud|No tiene permiso/i);
        await expect(page.locator('#titulo-detalle')).not.toBeVisible();
      }
    });

    await test.step('Y comprueba la detección de conflicto de versión ante edición concurrente (BDD 2)', async () => {
      const solicitudConcurrente = await prepararSolicitud('REGISTRADA', {
        descripcion: 'Caso para prueba de concurrencia optimista HU24',
      });

      await page.route('**/api/v1/solicitudes/*/evaluacion', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              codigo: 'CONFLICTO_VERSION',
              mensaje: 'Otro usuario modificó estos datos o la operación entra en conflicto. Recargue y revise el cambio.',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
      await page.locator('#filtro-q').fill(solicitudConcurrente.codigo);
      const botonCaso = page.locator('.enlace-accion', { hasText: solicitudConcurrente.codigo });
      await expect(botonCaso).toBeVisible({ timeout: 10000 });
      await botonCaso.click();

      await expect(page.getByRole('heading', { name: 'Evaluación y asignación' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Iniciar evaluación' }).click();
      await expect(page.locator('.mensaje--aviso')).toContainText(/Otro usuario modificó estos datos|conflicto/i);
      await expectSinDesbordeHorizontal(page);
    });
  });

});
