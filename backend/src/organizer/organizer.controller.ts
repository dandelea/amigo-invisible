import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { CurrentRoom, OrganizerGuard } from '../auth/guards.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { UuidParam } from '../common/uuid-param.js';
import type { Room } from '../db/schema.js';
import {
  CreatePairDto,
  PairDto,
  RoomDto,
  SetPairRuleDto,
  UpdateRoomDto,
} from '../rooms/dto.js';
import { MembershipService } from '../rooms/membership.service.js';
import { TOKEN_AUTH } from '../setup.js';
import { OrganizerService } from './organizer.service.js';

const errors = { type: ErrorResponseDto };

@ApiTags('organizador')
@ApiBearerAuth(TOKEN_AUTH)
@ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND' })
@ApiConflictResponse({
  ...errors,
  description: 'ROOM_CLOSED: la sala ya se ha sorteado',
})
@ApiTooManyRequestsResponse({ ...errors, description: 'TOO_MANY_REQUESTS' })
@UseGuards(OrganizerGuard)
@Controller('manage')
export class OrganizerController {
  constructor(
    private readonly organizer: OrganizerService,
    private readonly membership: MembershipService,
  ) {}

  @Patch('room')
  @ApiOperation({
    summary: 'Edita los datos de la sala',
    description:
      'Solo cambia los campos enviados; null en giftDate o budget los borra.',
  })
  @ApiBody({ type: UpdateRoomDto })
  @ApiOkResponse({ type: RoomDto })
  @ApiBadRequestResponse({ ...errors, description: 'VALIDATION_ERROR' })
  updateRoom(
    @CurrentRoom() room: Room,
    @Body() dto: UpdateRoomDto,
  ): Promise<RoomDto> {
    return this.organizer.updateRoom(room.id, dto);
  }

  @Put('pair-rule')
  @ApiOperation({ summary: 'Activa o desactiva la regla de pareja' })
  @ApiBody({ type: SetPairRuleDto })
  @ApiOkResponse({ type: RoomDto })
  @ApiBadRequestResponse({ ...errors, description: 'VALIDATION_ERROR' })
  setPairRule(
    @CurrentRoom() room: Room,
    @Body() dto: SetPairRuleDto,
  ): Promise<RoomDto> {
    return this.organizer.setPairRule(room.id, dto.enabled);
  }

  @Post('pairs')
  @ApiOperation({ summary: 'Marca una pareja entre dos personas sin pareja' })
  @ApiBody({ type: CreatePairDto })
  @ApiCreatedResponse({ type: PairDto })
  @ApiBadRequestResponse({ ...errors, description: 'VALIDATION_ERROR' })
  @ApiConflictResponse({
    ...errors,
    description: 'ALREADY_PAIRED o ROOM_CLOSED',
  })
  createPair(
    @CurrentRoom() room: Room,
    @Body() dto: CreatePairDto,
  ): Promise<PairDto> {
    return this.organizer.createPair(room.id, dto.participantIds);
  }

  @Delete('pairs/:pairId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Deshace una pareja' })
  @ApiNoContentResponse()
  deletePair(
    @CurrentRoom() room: Room,
    @Param('pairId', UuidParam) pairId: string,
  ): Promise<void> {
    return this.organizer.deletePair(room.id, pairId);
  }

  @Delete('participants/:participantId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Expulsa a un participante (solo antes del sorteo)',
    description:
      'Borra su pareja, su lista de deseos y su archivo; su enlace deja de funcionar y sus sockets se cierran.',
  })
  @ApiNoContentResponse()
  expel(
    @CurrentRoom() room: Room,
    @Param('participantId', UuidParam) participantId: string,
  ): Promise<void> {
    return this.membership.remove(room.id, participantId);
  }
}
