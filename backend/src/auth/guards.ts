import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Participant, Room } from '../db/schema.js';
import { notFound } from '../common/errors.js';
import { AuthService } from './auth.service.js';

// Los tokens llegan en `Authorization: Bearer <token>`. Un token ausente,
// mal formado o inválido devuelve siempre el mismo 404 genérico.

interface AuthedRequest extends Request {
  room?: Room;
  participant?: Participant;
}

function bearerToken(req: Request): string | null {
  const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '');
  return match ? match[1] : null;
}

@Injectable()
export class OrganizerGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const room = await this.auth.roomByManageToken(bearerToken(req));
    if (!room) throw notFound();
    req.room = room;
    return true;
  }
}

@Injectable()
export class ParticipantGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const found = await this.auth.participantByToken(bearerToken(req));
    if (!found) throw notFound();
    req.room = found.room;
    req.participant = found.participant;
    return true;
  }
}

export const CurrentRoom = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Room =>
    ctx.switchToHttp().getRequest<AuthedRequest>().room!,
);

export const CurrentParticipant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Participant =>
    ctx.switchToHttp().getRequest<AuthedRequest>().participant!,
);
