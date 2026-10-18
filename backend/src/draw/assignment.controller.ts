import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentParticipant,
  CurrentRoom,
  ParticipantGuard,
} from '../auth/guards.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import type { Participant, Room } from '../db/schema.js';
import { AssignmentDto, MarkSeenDto } from '../rooms/dto.js';
import { TOKEN_AUTH } from '../setup.js';
import { DrawService } from './draw.service.js';

const errors = { type: ErrorResponseDto };

// La asignación de cada participante, solo con su propio token. No hay
// ninguna ruta que reciba un id de participante: no se puede pedir la de
// otra persona.
@ApiTags('sorteo')
@ApiBearerAuth(TOKEN_AUTH)
@ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND (token inválido)' })
@ApiConflictResponse({ ...errors, description: 'NOT_DRAWN' })
@UseGuards(ParticipantGuard)
@Controller('me/assignment')
export class AssignmentController {
  constructor(private readonly draws: DrawService) {}

  @Get()
  @ApiOperation({
    summary: 'A quién le toca regalar al participante',
    description:
      'Devuelve solo la asignación propia, con la lista de deseos de la persona.',
  })
  @ApiOkResponse({ type: AssignmentDto })
  assignment(
    @CurrentRoom() room: Room,
    @CurrentParticipant() me: Participant,
  ): Promise<AssignmentDto> {
    return this.draws.assignmentOf(room, me);
  }

  @Post('seen')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Marca el resultado como visto',
    description:
      'Se llama al terminar la ruleta o al abrir el resultado. Solo cuenta si la ronda indicada es la actual.',
  })
  @ApiBody({ type: MarkSeenDto })
  @ApiNoContentResponse()
  markSeen(
    @CurrentRoom() room: Room,
    @CurrentParticipant() me: Participant,
    @Body() dto: MarkSeenDto,
  ): Promise<void> {
    return this.draws.markSeen(room, me, dto.round);
  }
}
