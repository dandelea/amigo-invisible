import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Formato único de error de toda la API.
export class ErrorResponseDto {
  @ApiProperty({ type: Number, example: 404 })
  statusCode: number;

  @ApiProperty({
    type: String,
    example: 'NOT_FOUND',
    description: 'Código estable para que el cliente elija el texto a mostrar.',
  })
  error: string;

  @ApiProperty({ type: String, example: 'No encontrado' })
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { budget: 'El presupuesto máximo es 1000 €' },
    description:
      'Solo con VALIDATION_ERROR: el primer error de cada campo, para mostrarlo junto a él.',
  })
  fields?: Record<string, string>;
}
