import { INestApplication, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from './common/error-response.dto.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import type { Env } from './config/env.js';

export const TOKEN_AUTH = 'token';

// Configuración común a main.ts, los tests e2e y la exportación de OpenAPI,
// para que los tres vean exactamente la misma aplicación.
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService<Env, true>);
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
}

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Amigo Invisible API')
    .setDescription(
      [
        'API del MVP de Amigo Invisible.',
        '',
        'Autenticación: no hay cuentas. Cada enlace secreto (gestión o personal) lleva un token aleatorio de 32 bytes en el fragmento de la URL (#), que el cliente envía en la cabecera `Authorization: Bearer <token>`. El servidor solo guarda su hash SHA-256.',
        '',
        'Errores: todas las respuestas de error usan el esquema `ErrorResponseDto`.',
        '',
        'Los eventos de WebSocket no están aquí: se documentan en el README.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'token opaco (base64url, 32 bytes)',
        description:
          'Token del enlace de gestión (organizador) o del enlace personal (participante).',
      },
      TOKEN_AUTH,
    )
    .build();
  return SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto],
  });
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api/docs', app, buildOpenApi(app));
}
