import { defineConfig } from 'vitest/config';

// Tests de integración contra un PostgreSQL real (Testcontainers). Los
// archivos se ejecutan de uno en uno porque comparten la base de datos.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup-env.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
