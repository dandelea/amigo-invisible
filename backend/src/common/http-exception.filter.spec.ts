import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { toErrorBody } from './http-exception.filter.js';

describe('toErrorBody', () => {
  it('usa el código por defecto del estado HTTP', () => {
    expect(toErrorBody(new NotFoundException('No encontrado'))).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: 'No encontrado',
    });
  });

  it('respeta un código de error propio', () => {
    const ex = new ConflictException({
      error: 'ROOM_FULL',
      message: 'Sala llena',
    });
    expect(toErrorBody(ex)).toEqual({
      statusCode: 409,
      error: 'ROOM_FULL',
      message: 'Sala llena',
    });
  });

  it('conserva los errores por campo', () => {
    const ex = new BadRequestException({
      error: 'VALIDATION_ERROR',
      message: ['El presupuesto máximo es 1000 €'],
      fields: { budget: 'El presupuesto máximo es 1000 €' },
    });
    expect(toErrorBody(ex)).toEqual({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: 'El presupuesto máximo es 1000 €',
      fields: { budget: 'El presupuesto máximo es 1000 €' },
    });
  });

  it('une los mensajes de validación', () => {
    const ex = new BadRequestException(['nombre vacío', 'fecha inválida']);
    expect(toErrorBody(ex).message).toBe('nombre vacío; fecha inválida');
  });

  it('oculta el detalle de los errores inesperados', () => {
    expect(toErrorBody(new Error('secreto interno'))).toEqual({
      statusCode: 500,
      error: 'INTERNAL_ERROR',
      message: 'Error interno',
    });
  });
});
