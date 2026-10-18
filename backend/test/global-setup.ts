import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { GenericContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';

export const S3_TEST_KEY = 'testkey';
export const S3_TEST_SECRET = 'testsecret12345';

// Arranca un PostgreSQL 17 y un servidor S3 (VersityGW, como sustituto
// local de R2) en Docker para toda la ejecución, y aplica las mismas
// migraciones que en producción.
export default async function setup(project: TestProject) {
  const [postgres, s3] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').start(),
    new GenericContainer('versity/versitygw:v1.9.0')
      .withEnvironment({
        ROOT_ACCESS_KEY: S3_TEST_KEY,
        ROOT_SECRET_KEY: S3_TEST_SECRET,
      })
      .withEntrypoint(['sh', '-c'])
      .withCommand(['mkdir -p /data && versitygw --port :7070 posix /data'])
      .withExposedPorts(7070)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
  ]);
  const databaseUrl = postgres.getConnectionUri();
  const pool = new Pool({ connectionString: databaseUrl });
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  await pool.end();
  project.provide('databaseUrl', databaseUrl);
  project.provide(
    's3Endpoint',
    `http://${s3.getHost()}:${s3.getMappedPort(7070)}`,
  );
  return async () => {
    await Promise.all([postgres.stop(), s3.stop()]);
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    s3Endpoint: string;
  }
}
