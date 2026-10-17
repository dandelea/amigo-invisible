import { defineConfig } from 'drizzle-kit';

// Migraciones con drizzle-kit. El esquema se define en la Fase 2.
// Generar: npm run db:generate · Aplicar: npm run db:migrate
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
});
