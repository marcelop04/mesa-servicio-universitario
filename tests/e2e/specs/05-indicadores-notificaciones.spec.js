import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud, obtenerCasoConAlerta } from '../helpers/datos.js';

test.describe('Épica 5: Notificaciones, Alertas y Dashboard', () => {

  test('@HU15 Detección y visualización de alertas tempranas de plazos (80% y vencidas)', async ({ page }) => {
    const codigoAlerta = 'MSU-2026-0006';

    await test.step('Dado que el supervisor consulta una solicitud que alcanzó alerta temprana de plazo', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
      await expect(page.locator('section[aria-label="Bandeja de supervisión"]')).toBeVisible();

      // Consultar caso con alerta o vencido en la bandeja de supervisión
      await page.locator('#filtro-q').fill(codigoAlerta);
      const fila = page.locator('.tabla tbody tr').filter({ hasText: codigoAlerta });
      await expect(fila).toBeVisible({ timeout: 10000 });
      await expect(fila.getByText(/Vencida|Plazo al 80 %/)).toBeVisible();
    });

    await test.step('Cuando el técnico responsable consulta su centro de notificaciones', async () => {
      await login(page, 'tecnico.servicios@msu.test');
      await page.goto('/notificaciones');
      await expect(page.locator('section[aria-label="Centro de notificaciones"]')).toBeVisible();
    });

    await test.step('Entonces se presenta el aviso generado para esa solicitud específica', async () => {
      const avisoEspecifico = page.locator('.aviso').filter({ hasText: codigoAlerta }).filter({ hasText: /Plazo vencido|Plazo al 80 %/ });
      await expect(avisoEspecifico.first()).toBeVisible({ timeout: 10000 });
      await expect(avisoEspecifico.first().locator('.aviso__texto')).toContainText(new RegExp(`La solicitud ${codigoAlerta} (superó el plazo|consumió el 80 %)`));

      // Comprobar que el enlace navega al detalle de esa misma solicitud
      const enlaceDetalle = avisoEspecifico.first().getByRole('link', { name: new RegExp(`Ver ${codigoAlerta}`) });
      await expect(enlaceDetalle).toBeVisible();
      await enlaceDetalle.click();

      await expect(page.getByRole('heading', { name: codigoAlerta })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/Vencida|Plazo al 80 %/)).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU16 Centro de notificaciones internas y marcado de lectura', async ({ page }) => {
    // Generar dos solicitudes para garantizar avisos no leídos concurrentes sin depender del estado previo
    const nueva1 = await prepararSolicitud('REGISTRADA', { descripcion: `Solicitud QA Notificaciones 1 ${Date.now()}` });
    const nueva2 = await prepararSolicitud('REGISTRADA', { descripcion: `Solicitud QA Notificaciones 2 ${Date.now()}` });

    await test.step('Dado que el supervisor ingresa al centro de notificaciones P09', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/notificaciones');
      await expect(page.locator('section[aria-label="Centro de notificaciones"]')).toBeVisible();
    });

    await test.step('Cuando localiza un aviso no leído y lo marca individualmente', async () => {
      const aviso1 = page.locator('.aviso').filter({ hasText: nueva1.codigo });
      await expect(aviso1).toBeVisible({ timeout: 10000 });
      await expect(aviso1.locator('.aviso__punto')).toHaveText('No leído');

      // Marcar individualmente como leído
      const botonMarcarIndividual = aviso1.getByRole('button', { name: 'Marcar como leído' });
      await expect(botonMarcarIndividual).toBeVisible();
      await botonMarcarIndividual.click();

      // Comprobar que el indicador 'No leído' desaparece
      await expect(aviso1.locator('.aviso__punto')).not.toBeVisible({ timeout: 5000 });
    });

    await test.step('Y cuando presiona Marcar todos como leídos para purgar pendientes', async () => {
      const botonMarcarTodas = page.getByRole('button', { name: /Marcar todos como leídos/i });
      await expect(botonMarcarTodas).toBeEnabled({ timeout: 5000 });
      await botonMarcarTodas.click();

      // Comprobar que el botón queda deshabilitado al no haber más pendientes
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
