import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';

// Arranca un PostgreSQL 17 en Docker para toda la ejecución y aplica las
// mismas migraciones que en producción.
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  const databaseUrl = container.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl });
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  await pool.end();
  project.provide('databaseUrl', databaseUrl);
  return async () => {
    await container.stop();
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
