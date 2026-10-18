/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { securityHeaders } from './security-headers.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:3000';
  return {
    plugins: [react(), tailwindcss(), securityHeaders(apiUrl)],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
