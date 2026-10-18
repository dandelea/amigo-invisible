import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
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

export const alreadyPaired = () =>
  new ConflictException({
    error: 'ALREADY_PAIRED',
    message: 'Alguna de esas personas ya tiene pareja',
  });

export const samePerson = () =>
  new BadRequestException({
    error: 'VALIDATION_ERROR',
    message: 'Elige a dos personas distintas',
  });

export const fileRequired = () =>
  new BadRequestException({
    error: 'FILE_REQUIRED',
    message: 'Falta el archivo',
  });

export const unsupportedFileType = () =>
  new UnsupportedMediaTypeException({
    error: 'UNSUPPORTED_FILE_TYPE',
    message: 'Solo se admiten PDF, JPEG, PNG o WebP',
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

// Violación de una clave foránea (p. ej. el participante se borró mientras
// se guardaba su lista).
export function isForeignKeyViolation(error: unknown): boolean {
  for (let e = error; e && typeof e === 'object';) {
    const pgError = e as { code?: string; cause?: unknown };
    if (pgError.code === '23503') return true;
    e = pgError.cause;
  }
  return false;
}
