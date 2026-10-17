import {
  BadRequestException,
  INestApplication,
  RequestMethod,
  ValidationPipe,
  type ValidationError,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ErrorResponseDto } from './common/error-response.dto.js';
import { HttpExceptionFilter } from './common/http-exception.filter.js';
import type { Env } from './config/env.js';
import { ENV } from './config/env.module.js';
import { CorsIoAdapter } from './realtime/cors-io.adapter.js';

export const TOKEN_AUTH = 'token';

// Errores de validación: un mensaje en español por campo, con código
// VALIDATION_ERROR.
function validationErrors(errors: ValidationError[]): BadRequestException {
  const messages = errors.flatMap((e) =>
    e.constraints
      ? Object.values(e.constraints)
      : [`El campo ${e.property} no es válido`],
  );
  return new BadRequestException({
    error: 'VALIDATION_ERROR',
    message: messages,
  });
}

// Configuración común a main.ts, los tests e2e y la exportación de OpenAPI,
// para que los tres vean exactamente la misma aplicación.
export function configureApp(app: NestExpressApplication): void {
  const env = app.get<Env>(ENV);
  app.set('trust proxy', env.TRUST_PROXY);
  app.enableCors({ origin: env.CORS_ORIGIN });
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationErrors,
    }),
  );
  app.useWebSocketAdapter(new CorsIoAdapter(app, env.CORS_ORIGIN));
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
