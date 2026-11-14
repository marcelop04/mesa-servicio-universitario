import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reportes/html', open: 'never' }],
    ['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME || 'reportes/junit-e2e.xml' }]
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8081',
    channel: process.env.NAVEGADOR || 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'es-PE',
    timezoneId: 'America/Lima'
  },
  projects: [
    {
      name: 'desktop-1366',
      use: {
        viewport: { width: 1366, height: 768 }
      }
    },
    {
      name: 'mobile-360',
      use: {
        viewport: { width: 360, height: 780 }
      }
    }
  ]
});

