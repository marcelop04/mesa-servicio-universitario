import { test, expect } from '@playwright/test';
import { login, USUARIOS, DEMO_PASSWORD, expectSinDesbordeHorizontal } from '../helpers/auth.js';

test.describe('Épica 1: Identidad y Acceso', () => {

  test('@HU01 Registro público de nuevo solicitante', async ({ page }) => {
    const timestamp = Date.now();
    const nuevoCorreo = `estudiante.${timestamp}@unmsm.edu.pe`;

    await test.step('Dado que un estudiante no registrado ingresa a la pantalla de registro', async () => {
      await page.goto('/registro');
      await expect(page.getByRole('heading', { name: /Crear una cuenta/i })).toBeVisible();
    });

    await test.step('Cuando completa el formulario con datos válidos y confirma su contraseña', async () => {
      await page.getByLabel(/^Nombre completo/).fill('Estudiante QA Automatizado');
      await page.getByLabel(/^Correo institucional/).fill(nuevoCorreo);
      await page.getByLabel(/^Vínculo/).selectOption('ESTUDIANTE');
      await page.getByLabel(/^Contraseña/).fill(DEMO_PASSWORD);
      await page.getByLabel(/^Confirmar contraseña/).fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: 'Crear cuenta' }).click();
    });

    await test.step('Entonces el sistema confirma la creación y redirige al inicio de sesión', async () => {
      await expect(page.getByText('Cuenta creada. Ingresa tu contraseña para continuar.')).toBeVisible({ timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test('@HU02 Inicio de sesión exitoso y rechazo de credenciales inválidas', async ({ page, context }) => {
    await test.step('Dado que un usuario intenta iniciar sesión con credenciales erróneas', async () => {
      await page.goto('/login');
      await page.getByLabel('Correo institucional').fill(USUARIOS.solicitante);
      await page.getByLabel('Contraseña', { exact: true }).fill('ClaveTotalmenteErronea!');
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    });

    await test.step('Cuando el servidor valida las credenciales', async () => {
      await expect(page.getByText('Correo o contraseña incorrectos.')).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });

    await test.step('Entonces con credenciales válidas inicia sesión y recibe la cookie HttpOnly MSU_SESION', async () => {
      await page.getByLabel('Contraseña', { exact: true }).fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: 'Iniciar sesión' }).click();
      await page.waitForURL((u) => !u.pathname.startsWith('/login'));

      const cookies = await context.cookies();
      const jwtCookie = cookies.find((c) => c.name === 'MSU_SESION');
      expect(jwtCookie, 'La cookie de sesión MSU_SESION debe existir').toBeDefined();
      expect(jwtCookie?.httpOnly, 'La cookie MSU_SESION debe ser HttpOnly').toBe(true);

      const accesibleJs = await page.evaluate(() => document.cookie.includes('MSU_SESION'));
      expect(accesibleJs, 'MSU_SESION no debe ser accesible desde JavaScript del cliente').toBe(false);
    });
  });

  test('@HU03 Consulta de perfil institucional del solicitante', async ({ page }) => {
    await test.step('Dado que el solicitante tiene una sesión activa', async () => {
      await login(page, USUARIOS.solicitante);
    });

    await test.step('Cuando navega a la pantalla de perfil', async () => {
      await page.goto('/perfil');
      await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
    });

    await test.step('Entonces observa sus datos personales y la opción de cambiar contraseña', async () => {
      await expect(page.getByRole('heading', { name: 'Cambiar contraseña' })).toBeVisible();
      await expectSinDesbordeHorizontal(page);
    });
  });

});

