import { type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Env } from '../config/env.js';

// Límite de peticiones por IP. Hay un límite general para toda la API y
// límites más estrictos que solo se aplican a las rutas marcadas con
// @RateLimit(). Los valores salen de las variables de entorno.

type NamedLimit = 'createRoom' | 'join' | 'upload';

const RATE_LIMIT_KEY = 'rateLimit';

export const RateLimit = (name: NamedLimit) =>
  SetMetadata(RATE_LIMIT_KEY, name);

const isMarked = (ctx: ExecutionContext, name: NamedLimit) =>
  Reflect.getMetadata(RATE_LIMIT_KEY, ctx.getHandler()) === name;

export function rateLimitOptions(env: Env): ThrottlerModuleOptions {
  return {
    errorMessage:
      'Demasiadas peticiones. Espera un momento y vuelve a intentarlo.',
    throttlers: [
      {
        name: 'default',
        ttl: 60_000,
        limit: env.RATE_LIMIT_PER_MINUTE,
      },
      {
        name: 'createRoom',
        ttl: 3_600_000,
        limit: env.RATE_LIMIT_CREATE_ROOM_PER_HOUR,
        skipIf: (ctx) => !isMarked(ctx, 'createRoom'),
      },
      {
        name: 'join',
        ttl: 60_000,
        limit: env.RATE_LIMIT_JOIN_PER_MINUTE,
        skipIf: (ctx) => !isMarked(ctx, 'join'),
      },
      {
        name: 'upload',
        ttl: 3_600_000,
        limit: env.RATE_LIMIT_UPLOAD_PER_HOUR,
        skipIf: (ctx) => !isMarked(ctx, 'upload'),
      },
    ],
  };
}

// Solo limita peticiones HTTP: las reconexiones de WebSocket no cuentan.
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected shouldSkip(ctx: ExecutionContext): Promise<boolean> {
    return Promise.resolve(ctx.getType() !== 'http');
  }
}
