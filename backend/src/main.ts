import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { ENV } from './config/env.module.js';
import { configureApp, setupSwagger } from './setup.js';

// En local, carga backend/.env si existe. En producción las variables las
// define el hosting.
try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo .env: se usan las variables del entorno.
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  setupSwagger(app);
  app.enableShutdownHooks();
  await app.listen(app.get<Env>(ENV).PORT);
}
await bootstrap();
