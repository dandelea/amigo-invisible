import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

export class HealthDto {
  @ApiProperty({ type: String, enum: ['ok'], example: 'ok' })
  status: 'ok';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Comprueba que el servidor está despierto',
    description:
      'El frontend lo consulta al arrancar para mostrar “Despertando el servidor” mientras Render arranca.',
  })
  @ApiOkResponse({ type: HealthDto })
  check(): HealthDto {
    return { status: 'ok' };
  }
}
