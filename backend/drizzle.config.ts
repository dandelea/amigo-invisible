import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo .env: se usa DATABASE_URL del entorno.
}

// Migraciones con drizzle-kit a partir de src/db/schema.ts.
// Generar: npm run db:generate · Aplicar: npm run db:migrate
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
});
