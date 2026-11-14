import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud } from '../helpers/datos.js';

test.describe('Épica 6: Administración y Auditoría', () => {

  test('@HU20 Gestión de usuarios internos: alta de técnico y bloqueo de desactivación con carga', async ({ page }) => {
    await test.step('Dado que el administrador ingresa a la gestión de usuarios P11', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/usuarios');
      await expect(page.locator('section[aria-label="Usuarios internos"]')).toBeVisible();
    });

    await test.step('Cuando crea un nuevo técnico asignándolo a un área técnica (BDD 1)', async () => {
      const botonNuevo = page.getByRole('button', { name: 'Crear usuario' });
      await expect(botonNuevo).toBeVisible();
      await botonNuevo.click();

      const stamp = Date.now();
      const nombreTecnico = `Técnico QA ${stamp}`;
      await page.locator('#cuenta-nombre').fill(nombreTecnico);
      await page.locator('#cuenta-correo').fill(`tec.qa.${stamp}@msu.test`);
      await page.locator('#cuenta-password').fill('Inicial12345!');
      await page.locator('#cuenta-rol').selectOption('TECNICO');

      const selectArea = page.locator('#cuenta-area');
      await expect(selectArea).toBeVisible();
      await selectArea.selectOption({ index: 1 });

      await page.getByRole('button', { name: 'Crear usuario' }).click();
      await expect(page.getByText(`Se creó la cuenta de ${nombreTecnico}.`)).toBeVisible({ timeout: 10000 });
    });

    await test.step('Y cuando intenta desactivar a un técnico con solicitudes pendientes asignadas (BDD 2)', async () => {
      await page.locator('#filtro-texto').fill('Tomás Soporte');
      await page.waitForTimeout(300);

      const filaTomas = page.locator('.tabla tbody tr').filter({ hasText: 'Tomás Soporte' });
      await expect(filaTomas).toBeVisible({ timeout: 10000 });
      await filaTomas.locator('.enlace-accion', { hasText: 'Editar' }).click();

      const botonDesactivar = page.getByRole('button', { name: 'Desactivar cuenta' });
      await expect(botonDesactivar).toBeVisible({ timeout: 5000 });
      await botonDesactivar.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal).toContainText(/tiene.*casos? pendientes?.*reasignarlos antes de desactivar/i);
      const botonModalConfirmar = modal.getByRole('button', { name: 'Desactivar' });
      await expect(botonModalConfirmar).toBeDisabled();
      await modal.getByRole('button', { name: 'Cancelar' }).click();
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU21 Mantenimiento de catálogos: desactivación lógica de categoría y protección de catálogos fijos', async ({ page }) => {
    await test.step('Dado que el administrador ingresa a la configuración de catálogos P12', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/configuracion');
      await expect(page.locator('section[aria-label="Configuración y auditoría"]')).toBeVisible();
      const pestanaCatalogos = page.getByRole('tab', { name: 'Catálogos' });
      await expect(pestanaCatalogos).toBeVisible();
      await pestanaCatalogos.click();
    });

    await test.step('Cuando desactiva lógicamente una categoría editable mediante DELETE lógico (BDD 1)', async () => {
      const tarjetaCategorias = page.locator('section[aria-labelledby="tarjeta-categorias"]');
      await expect(tarjetaCategorias).toBeVisible();

      const botonDesactivar = tarjetaCategorias.getByRole('button', { name: /^Desactivar/ }).first();
      await expect(botonDesactivar).toBeVisible({ timeout: 10000 });
      await botonDesactivar.click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await modal.getByRole('button', { name: 'Desactivar' }).click();

      const botonReactivar = tarjetaCategorias.getByRole('button', { name: /^Reactivar/ }).first();
      await expect(botonReactivar).toBeVisible({ timeout: 10000 });

      // Restaurar para dejar idempotente
      await botonReactivar.click();
      const modalReactivar = page.getByRole('dialog');
      await expect(modalReactivar).toBeVisible();
      await modalReactivar.getByRole('button', { name: 'Reactivar' }).click();

      await expect(tarjetaCategorias.getByRole('button', { name: /^Desactivar/ }).first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Entonces comprueba que los estados y prioridades son catálogos fijos no desactivables (BDD 2)', async () => {
      const tarjetaEstados = page.locator('section[aria-labelledby="tarjeta-estados"]');
      await expect(tarjetaEstados).toBeVisible();
      await expect(tarjetaEstados.locator('.etiqueta--neutro', { hasText: 'Fijo' }).first()).toBeVisible();
      expect(await tarjetaEstados.getByRole('button', { name: 'Desactivar' }).count()).toBe(0);
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

  test('@HU23 Historial operativo y consulta de auditoría administrativa', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud con historial operativo en detalle (BDD 1)', async () => {
      solicitud = await prepararSolicitud('EN_ATENCION', {
        descripcion: 'Caso con historial operativo para HU23 BDD 1',
      });
      await login(page, USUARIOS.solicitante);
      await page.goto(`/solicitudes/${solicitud.id}`);
      await expect(page.locator('#titulo-detalle')).toBeVisible({ timeout: 10000 });
      const seccionHistorial = page.locator('section[aria-labelledby="titulo-historial"]');
      await expect(seccionHistorial).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.historial')).toContainText(/Registró la solicitud/);
      await expect(page.locator('.historial')).toContainText(/Inició la evaluación/);
    });

    await test.step('Cuando el administrador accede a la auditoría administrativa en P12 (BDD 2)', async () => {
      await login(page, USUARIOS.admin);
      await page.goto('/admin/configuracion');
      const pestanaAuditoria = page.getByRole('tab', { name: 'Auditoría administrativa' });
      await pestanaAuditoria.click();
      await expect(page.getByRole('heading', { name: 'Auditoría administrativa' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Entonces verifica los registros históricos y que no se expongan datos sensibles (BDD 2)', async () => {
      const tablaAuditoria = page.locator('.tabla');
      await expect(tablaAuditoria).toBeVisible();
      const contenido = await tablaAuditoria.textContent();
      expect(contenido).not.toMatch(/\$2[ab]\$|MSU_SESION/);
      await expectSinDesbordeHorizontal(page);
    });
  });

});
