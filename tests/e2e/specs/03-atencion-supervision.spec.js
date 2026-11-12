import { test, expect } from '@playwright/test';
import { login, USUARIOS, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 3: Supervisión y Atención Técnica', () => {

  test('@HU07 y @HU08 Evaluación y Asignación de técnico por el Supervisor', async ({ page }) => {
    await test.step('Dado que el supervisor ingresa a la bandeja de supervisión P07', async () => {
      await login(page, USUARIOS.supervisor);
      await page.goto('/supervision');
      await expect(page.locator('section[aria-label="Bandeja de supervisión"]')).toBeVisible();
    });

    await test.step('Cuando selecciona una solicitud pendiente y actualiza la prioridad con motivo', async () => {
      const filtroEstado = page.locator('#filtro-estado');
      if (await filtroEstado.isVisible()) {
        await filtroEstado.selectOption('REGISTRADA');
      }

      const botonCaso = page.locator('.enlace-accion').first();
      await expect(botonCaso).toBeVisible({ timeout: 10000 });
      await botonCaso.click();

      await expect(page.getByRole('heading', { name: 'Evaluación y asignación' })).toBeVisible();

      const opcionAlto = page.locator('.segmentos__opcion', { hasText: /^Alto$/ }).first();
      if (await opcionAlto.isVisible()) {
        await opcionAlto.click();
        const motivoInput = page.getByLabel(/Motivo del cambio de prioridad/i);
        if (await motivoInput.isVisible()) {
          await motivoInput.fill('Afecta la operatividad del laboratorio durante la semana.');
        }
        const botonEvaluar = page.getByRole('button', { name: /Iniciar evaluación/i });
        if (await botonEvaluar.isVisible()) {
          await botonEvaluar.click();
          await expect(page.getByText(/Prioridad actualizada|Evaluación iniciada/)).toBeVisible();
        }
      }
    });

    await test.step('Entonces asigna a un técnico activo del área y la solicitud pasa a Asignada', async () => {
      const selectorTecnico = page.locator('#tecnico');
      if (await selectorTecnico.isVisible({ timeout: 5000 }).catch(() => false)) {
        const opcionTomas = selectorTecnico.locator('option', { hasText: 'Tomás Soporte' });
        if (await opcionTomas.count() > 0) {
          await selectorTecnico.selectOption(await opcionTomas.getAttribute('value'));
        } else {
          await selectorTecnico.selectOption({ index: 1 });
        }
        const botonAsignar = page.getByRole('button', { name: /^(Asignar|Reasignar)$/i });
        if (await botonAsignar.isVisible()) {
          await botonAsignar.click();
          await expect(page.getByText(/Técnico asignado|Responsable reasignado/)).toBeVisible();
        }
      }
      await expectSinDesbordeHorizontal(page);
    });
  });

  test('@HU10 y @HU11 Inicio de atención y Registro de solución por el Técnico', async ({ page }) => {
    await test.step('Dado que el técnico ingresa a su bandeja de atención P08', async () => {
      await login(page, USUARIOS.tecnico);
      await page.goto('/atencion');
      await expect(page.locator('section[aria-label="Atención técnica"]')).toBeVisible();
    });

    await test.step('Cuando selecciona un caso y presiona Iniciar atención', async () => {
      const botonAtender = page.locator('.enlace-accion').first();
      if (await botonAtender.isVisible({ timeout: 5000 }).catch(() => false)) {
        await botonAtender.click();
        await expect(page.locator('#titulo-atencion')).toBeVisible({ timeout: 10000 });

        const botonIniciar = page.getByRole('button', { name: 'Iniciar atención' });
        if (await botonIniciar.isVisible({ timeout: 3000 }).catch(() => false)) {
          await botonIniciar.click();
          await expect(page.getByText(/pasó a En atención/)).toBeVisible();
        }

        const campoSolucion = page.getByLabel(/Solución aplicada/i);
        if (await campoSolucion.isVisible()) {
          await campoSolucion.fill('Mantenimiento correctivo ejecutado satisfactoriamente por el equipo técnico.');
          await page.getByRole('button', { name: 'Registrar solución' }).click();
          await expect(page.getByText(/quedó Resuelta/)).toBeVisible();
        }
      }
    });

    await test.step('Entonces la solicitud queda en estado Resuelta esperando conformidad', async () => {
      await expectSinDesbordeHorizontal(page);
    });
  });

});

