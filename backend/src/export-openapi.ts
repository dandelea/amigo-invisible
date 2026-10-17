// Genera docs/openapi.json a partir del código, sin arrancar el servidor.
// Uso: npm run openapi (se ejecuta compilado, para tener los metadatos de los
// decoradores que tsc emite).
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { buildOpenApi, configureApp } from './setup.js';

// La exportación no consulta la base de datos (el pool no conecta hasta la
// primera consulta), pero la configuración exige una URL.
process.env.DATABASE_URL ??= 'postgres://openapi@localhost:5432/openapi';

const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  logger: false,
});
configureApp(app);
await app.init();
const out = resolve(import.meta.dirname, '../../docs/openapi.json');
writeFileSync(out, JSON.stringify(buildOpenApi(app), null, 2) + '\n');
await app.close();
console.log(`OpenAPI exportado en ${out}`);
