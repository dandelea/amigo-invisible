import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponseDto } from './error-response.dto.js';

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
};

// Convierte cualquier excepción en ErrorResponseDto. Los errores inesperados
// se registran sin cabeceras, cuerpo ni query, para no filtrar tokens ni
// datos personales.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const body = toErrorBody(exception);
    if (body.statusCode >= 500) {
      const route = (req.route as { path?: string } | undefined)?.path ?? '?';
      const name = exception instanceof Error ? exception.name : 'Unknown';
      this.logger.error(
        `${req.method} ${route} → ${body.statusCode} (${name})`,
      );
    }
    res.status(body.statusCode).json(body);
  }
}

export function toErrorBody(exception: unknown): ErrorResponseDto {
  if (!(exception instanceof HttpException)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'INTERNAL_ERROR',
      message: 'Error interno',
    };
  }
  const statusCode = exception.getStatus();
  const response = exception.getResponse();
  let error = DEFAULT_CODES[statusCode] ?? 'ERROR';
  let message = exception.message;
  if (typeof response === 'object' && response !== null) {
    const r = response as { error?: unknown; message?: unknown };
    if (typeof r.error === 'string' && /^[A-Z_]+$/.test(r.error)) {
      error = r.error;
    }
    if (typeof r.message === 'string') message = r.message;
    if (Array.isArray(r.message)) message = r.message.join('; ');
  }
  return { statusCode, error, message };
}
