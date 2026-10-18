import { defineConfig, devices } from '@playwright/test';

// Tests e2e de navegador con el Chrome instalado en el sistema (no se
// descargan navegadores). Necesitan PostgreSQL y S3 locales arrancados:
// `docker compose up -d` y backend/.env. Si backend y frontend ya están en
// marcha se reutilizan; si no, se compilan y arrancan.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  globalTeardown: './e2e/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    locale: 'es-ES',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'móvil', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  webServer: [
    {
      command: 'npm run build && npm run start:prod',
      cwd: './backend',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run build && npx vite preview --port 5173 --strictPort',
      cwd: './frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
