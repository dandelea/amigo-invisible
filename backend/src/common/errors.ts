import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

// Errores de negocio con código estable. El frontend elige el texto a
// mostrar a partir de `error`; `message` es solo orientativo.

// Genérico a propósito: no revela si un enlace existió, se regeneró o
// pertenecía a alguien expulsado.
export const notFound = () =>
  new NotFoundException({ error: 'NOT_FOUND', message: 'No encontrado' });

export const maxRoomsReached = () =>
  new ServiceUnavailableException({
    error: 'MAX_ROOMS_REACHED',
    message: 'Ahora mismo no se admiten más salas',
  });

export const roomFull = () =>
  new ConflictException({ error: 'ROOM_FULL', message: 'Sala llena' });

export const roomClosed = () =>
  new ConflictException({ error: 'ROOM_CLOSED', message: 'Sala cerrada' });

export const nameTaken = () =>
  new ConflictException({
    error: 'NAME_TAKEN',
    message: 'Ya hay alguien con ese nombre en la sala',
  });

// Violación de una restricción única de PostgreSQL. Drizzle envuelve el
// error del driver, así que se mira también su causa.
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (let e = error; e && typeof e === 'object';) {
    const pgError = e as {
      code?: string;
      constraint?: string;
      cause?: unknown;
    };
    if (pgError.code === '23505' && pgError.constraint === constraint) {
      return true;
    }
    e = pgError.cause;
  }
  return false;
}
