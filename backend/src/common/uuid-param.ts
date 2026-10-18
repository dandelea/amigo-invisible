import { ParseUUIDPipe } from '@nestjs/common';
import { notFound } from './errors.js';

// Un id de la URL que no es un UUID se trata como «no encontrado», igual que
// uno que no existe.
export const UuidParam = new ParseUUIDPipe({ exceptionFactory: notFound });
