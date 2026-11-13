import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';
import { prepararSolicitud } from '../helpers/datos.js';

test.describe('Épica 3: Supervisión y Atención Técnica', () => {

  test('@HU07 Evaluación y priorización de solicitudes por el Supervisor', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud en estado Registrada para evaluación', async () => {
      solicitud = await prepararSolicitud('REGISTRADA', {
        descripcion: 'Caso para evaluación de prioridad HU07',
      });
      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
      await expect(page.locator('section[aria-label="Bandeja de supervisión"]')).toBeVisible();
    });

    await test.step('Cuando el supervisor filtra por el caso y actualiza la prioridad con motivo', async () => {
      await page.locator('#filtro-q').fill(solicitud.codigo);
      const botonCaso = page.locator('.enlace-accion', { hasText: solicitud.codigo });
      await expect(botonCaso).toBeVisible({ timeout: 10000 });
      await botonCaso.click();

      await expect(page.getByRole('heading', { name: 'Evaluación y asignación' })).toBeVisible();

      // Cambiar impacto a Alto para forzar motivo de cambio de prioridad
      const opcionAlto = page.locator('.segmentos__opcion', { hasText: /^Alto$/ }).first();
      await opcionAlto.click();

      const motivoInput = page.locator('#motivo-prioridad');
      await expect(motivoInput).toBeVisible({ timeout: 5000 });
      await motivoInput.fill('Afecta la operatividad del laboratorio durante la semana académica.');

      const botonEvaluar = page.getByRole('button', { name: /Iniciar evaluación y cambiar prioridad/i });
      await botonEvaluar.click();
    });

    await test.step('Entonces el sistema confirma la evaluación y actualiza la prioridad', async () => {
      await expect(page.getByText(/Prioridad actualizada|Evaluación iniciada/)).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU08 Asignación de técnico activo por el Supervisor', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud en estado En evaluación', async () => {
      solicitud = await prepararSolicitud('EN_EVALUACION', {
        descripcion: 'Caso para asignación de técnico HU08',
      });
      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
    });

    await test.step('Cuando el supervisor selecciona el caso y asigna un técnico activo', async () => {
      await page.locator('#filtro-q').fill(solicitud.codigo);
      const botonCaso = page.locator('.enlace-accion', { hasText: solicitud.codigo });
      await expect(botonCaso).toBeVisible({ timeout: 10000 });
      await botonCaso.click();

      const selectorTecnico = page.locator('#tecnico');
      await expect(selectorTecnico).toBeVisible({ timeout: 5000 });
      await selectorTecnico.selectOption({ index: 1 });

      const botonAsignar = page.getByRole('button', { name: /^Asignar$/ });
      await botonAsignar.click();
    });

    await test.step('Entonces el sistema confirma que el técnico ha sido asignado', async () => {
      await expect(page.getByText('Técnico asignado.')).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU09 Cancelación de solicitudes con motivo obligatorio por el Supervisor', async ({ page }) => {
    let solicitud;

    await test.step('Dado que existe una solicitud activa en la bandeja de supervisión', async () => {
      solicitud = await prepararSolicitud('REGISTRADA', {
        descripcion: 'Caso para cancelación con motivo obligatorio HU09',
      });
      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
    });

    await test.step('Cuando el supervisor abre el diálogo de cancelación e ingresa el motivo obligatorio', async () => {
      await page.locator('#filtro-q').fill(solicitud.codigo);
      const botonCaso = page.locator('.enlace-accion', { hasText: solicitud.codigo });
      await expect(botonCaso).toBeVisible({ timeout: 10000 });
      await botonCaso.click();

      const botonCancelar = page.getByRole('button', { name: 'Cancelar solicitud' });
      await expect(botonCancelar).toBeVisible();
      await botonCancelar.click();

      const campoMotivo = page.locator('#motivo-cancelacion');
      await expect(campoMotivo).toBeVisible();
      await campoMotivo.fill('Solicitud duplicada y fuera de alcance institucional según normativa.');

      const botonConfirmarModal = page.getByRole('dialog').getByRole('button', { name: 'Cancelar solicitud' });
      await botonConfirmarModal.click();
    });

    await test.step('Entonces la solicitud queda cancelada y se notifica la operación', async () => {
      await expect(page.getByText(new RegExp(`La solicitud ${solicitud.codigo} quedó cancelada`))).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU10 Inicio de atención técnica por el Técnico asignado', async ({ page }) => {
    await test.step('Dado que el técnico ingresa a su bandeja de atención P08', async () => {
      await login(page, USUARIOS.tecnico);
      await page.goto('/atencion');
      await expect(page.locator('section[aria-label="Atención técnica"]')).toBeVisible();
    });

    await test.step('Cuando filtra solicitudes asignadas y presiona Iniciar atención', async () => {
      await page.locator('#atencion-estado').selectOption('ASIGNADA');
      const botonAtender = page.locator('.enlace-accion').first();
      await expect(botonAtender).toBeVisible({ timeout: 10000 });
      await botonAtender.click();

      await expect(page.locator('#titulo-atencion')).toBeVisible({ timeout: 10000 });
      const botonIniciar = page.getByRole('button', { name: 'Iniciar atención' });
      await expect(botonIniciar).toBeVisible({ timeout: 5000 });
      await botonIniciar.click();
    });

    await test.step('Entonces la solicitud pasa a estado En atención registrando primera atención', async () => {
      await expect(page.getByText('Atención iniciada: la solicitud pasó a En atención.')).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU11 Registro de solución técnica por el Técnico', async ({ page }) => {
    await test.step('Dado que el técnico atiende una solicitud en estado En atención', async () => {
      await login(page, USUARIOS.tecnico);
      await page.goto('/atencion');
      await expect(page.locator('section[aria-label="Atención técnica"]')).toBeVisible();
    });

    await test.step('Cuando describe la solución aplicada con al menos 20 caracteres y registra', async () => {
      await page.locator('#atencion-estado').selectOption('EN_ATENCION');
      const botonAtender = page.locator('.enlace-accion').first();
      await expect(botonAtender).toBeVisible({ timeout: 10000 });
      await botonAtender.click();

      await expect(page.locator('#titulo-atencion')).toBeVisible({ timeout: 10000 });
      const campoSolucion = page.locator('#solucion');
      await expect(campoSolucion).toBeVisible({ timeout: 5000 });
      await campoSolucion.fill('Mantenimiento correctivo ejecutado satisfactoriamente con reemplazo de periférico defectuoso.');

      const botonRegistrar = page.getByRole('button', { name: 'Registrar solución' });
      await botonRegistrar.click();
    });

    await test.step('Entonces la solicitud pasa a estado Resuelta esperando conformidad', async () => {
      await expect(page.getByText('Solución registrada: la solicitud quedó Resuelta.')).toBeVisible({ timeout: 10000 });
      await expectSinDesbordeHorizontal(page);
    });
  });

});
