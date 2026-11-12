import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 5: Notificaciones, Alertas y Dashboard', () => {

  test('@HU15 Detección y visualización de alertas tempranas de plazos (80% y vencidas)', async ({ page }) => {
    await test.step('Dado que el supervisor consulta una solicitud que superó el plazo establecido', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
      await expect(page.locator('section[aria-label="Bandeja de supervisión"]')).toBeVisible();

      // Consultar caso vencido en la bandeja de supervisión
      await page.locator('#filtro-q').fill('MSU-CARG-1911');
      const filaVencida = page.locator('.tabla tbody tr').first();
      await expect(filaVencida.getByText('Vencida')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cuando el técnico responsable consulta su centro de notificaciones', async () => {
      await page.context().clearCookies();
      await login(page, 'tecnico.servicios@msu.test');
      await page.goto('/notificaciones');
      await expect(page.locator('section[aria-label="Centro de notificaciones"]')).toBeVisible();
    });

    await test.step('Entonces se presentan los avisos generados por alerta o vencimiento de plazo', async () => {
      const avisoAlerta = page.locator('.avisos').getByText(/Plazo vencido|Plazo al 80 %/).first();
      await expect(avisoAlerta).toBeVisible({ timeout: 10000 });

      const textoAlerta = page.locator('.aviso__texto').filter({ hasText: /superó el plazo|consumió el 80 %/ }).first();
      await expect(textoAlerta).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU16 Centro de notificaciones internas y marcado de lectura', async ({ page }) => {
    await test.step('Dado que el supervisor ingresa al centro de notificaciones P09', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/notificaciones');
      await expect(page.locator('section[aria-label="Centro de notificaciones"]')).toBeVisible();
    });

    await test.step('Cuando revisa sus avisos y presiona Marcar todos como leídos', async () => {
      const botonMarcarTodas = page.getByRole('button', { name: /Marcar todos como leídos/i });
      await expect(botonMarcarTodas).toBeVisible({ timeout: 5000 });
      if (!await botonMarcarTodas.isDisabled()) {
        await botonMarcarTodas.click();
      }
    });

    await test.step('Entonces todos los avisos se encuentran leídos y el botón queda inactivo', async () => {
      const botonMarcarTodas = page.getByRole('button', { name: /Marcar todos como leídos/i });
      await expect(botonMarcarTodas).toBeDisabled();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU17 Visualización de indicadores operativos y tiempos de atención en Dashboard', async ({ page }) => {
    await test.step('Dado que el supervisor ingresa al dashboard P10', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/dashboard');
      await expect(page.locator('section[aria-label="Dashboard"]')).toBeVisible();
    });

    await test.step('Cuando visualiza las tarjetas de conteos consolidados', async () => {
      const cifras = page.locator('.cifras').first();
      await expect(cifras).toBeVisible({ timeout: 10000 });
      await expect(cifras).toContainText('Registradas');
      await expect(cifras).toContainText('Pendientes');
      await expect(cifras).toContainText('Solucionadas');
    });

    await test.step('Entonces se presentan los datos y el periodo analizado de Lima', async () => {
      await expect(page.locator('.pagina__nota')).toContainText(/Solicitudes registradas/);
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU18 Visualización de distribuciones por categoría, área y estado', async ({ page }) => {
    await test.step('Dado que el supervisor consulta el dashboard operativo', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/dashboard');
      await expect(page.locator('section[aria-label="Dashboard"]')).toBeVisible();
    });

    await test.step('Cuando visualiza las secciones de gráficos de barras', async () => {
      const graficos = page.locator('.grafico');
      await expect(graficos.first()).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('heading', { name: /^Por categoría$/i })).toBeVisible();
    });

    await test.step('Entonces las barras horizontales reflejan los conteos sin desborde', async () => {
      const barraFila = page.locator('.barras__fila').first();
      await expect(barraFila).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU19 Exportación de solicitudes a archivo CSV con descarga y validación', async ({ page }) => {
    await test.step('Dado que el supervisor se encuentra en el dashboard', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/dashboard');
      await expect(page.locator('section[aria-label="Dashboard"]')).toBeVisible();
    });

    await test.step('Cuando presiona el enlace de Exportar CSV e intercepta la descarga', async () => {
      const enlaceExportar = page.getByRole('link', { name: /Exportar CSV/i });
      await expect(enlaceExportar).toBeVisible({ timeout: 10000 });

      const descargaPromise = page.waitForEvent('download');
      await enlaceExportar.click();
      const descarga = await descargaPromise;

      expect(descarga.suggestedFilename()).toMatch(/^solicitudes(-\d{4}-\d{2}-\d{2})?\.csv$/);

      // Leer contenido real del CSV descargado
      const flujo = await descarga.createReadStream();
      const partes = [];
      for await (const parte of flujo) partes.push(parte);
      const textoCsv = Buffer.concat(partes).toString('utf-8');

      // Validar cabecera y registros reales
      expect(textoCsv).toContain('Código;Categoría;Área;Ubicación;Prioridad;Estado;Responsable;Plazo');
      expect(textoCsv).toMatch(/MSU-\d{4}-\d{4}|MSU-CARG-\d{4}/);
    });

    await test.step('Entonces el archivo CSV es válido y el layout cumple RNF05', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

});
