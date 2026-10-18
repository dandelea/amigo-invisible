import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import {
  CurrentParticipant,
  CurrentRoom,
  OrganizerGuard,
  ParticipantGuard,
} from '../auth/guards.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { RateLimit } from '../common/rate-limit.js';
import type { Participant, Room } from '../db/schema.js';
import { TOKEN_AUTH } from '../setup.js';
import {
  AvailabilityDto,
  CreateRoomDto,
  CreateRoomResponseDto,
  InvitationDto,
  JoinRoomDto,
  JoinRoomResponseDto,
  OrganizerViewDto,
  ParticipantViewDto,
} from './dto.js';
import { MembershipService } from './membership.service.js';
import { RoomsService } from './rooms.service.js';

const errors = { type: ErrorResponseDto };

@ApiTags('salas')
@ApiTooManyRequestsResponse({ ...errors, description: 'TOO_MANY_REQUESTS' })
@Controller()
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly membership: MembershipService,
  ) {}

  @Get('rooms/availability')
  @ApiOperation({
    summary: 'Indica si se pueden crear salas',
    description:
      'El inicio muestra “Ahora mismo no se admiten más salas” si es false.',
  })
  @ApiOkResponse({ type: AvailabilityDto })
  async availability(): Promise<AvailabilityDto> {
    return { canCreateRoom: await this.rooms.canCreateRoom() };
  }

  @Post('rooms')
  @RateLimit('createRoom')
  @ApiOperation({
    summary: 'Crea una sala',
    description:
      'Devuelve el código de invitación y el token de gestión, que no se vuelve a mostrar.',
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiCreatedResponse({ type: CreateRoomResponseDto })
  @ApiBadRequestResponse({ ...errors, description: 'VALIDATION_ERROR' })
  @ApiServiceUnavailableResponse({
    ...errors,
    description: 'MAX_ROOMS_REACHED',
  })
  create(@Body() dto: CreateRoomDto): Promise<CreateRoomResponseDto> {
    return this.rooms.create(dto);
  }

  @Get('invitations/:code')
  @ApiOperation({
    summary: 'Resumen público de una sala para el enlace de invitación',
  })
  @ApiParam({ name: 'code', description: 'Código de invitación' })
  @ApiOkResponse({ type: InvitationDto })
  @ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND' })
  invitation(@Param('code') code: string): Promise<InvitationDto> {
    return this.rooms.invitation(code);
  }

  @Post('invitations/:code/participants')
  @HttpCode(201)
  @RateLimit('join')
  @ApiOperation({
    summary: 'Se une a una sala con un nombre',
    description:
      'Devuelve el token del enlace personal, que no se vuelve a mostrar.',
  })
  @ApiParam({ name: 'code', description: 'Código de invitación' })
  @ApiBody({ type: JoinRoomDto })
  @ApiCreatedResponse({ type: JoinRoomResponseDto })
  @ApiBadRequestResponse({ ...errors, description: 'VALIDATION_ERROR' })
  @ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND' })
  @ApiConflictResponse({
    ...errors,
    description: 'ROOM_FULL, ROOM_CLOSED o NAME_TAKEN',
  })
  join(
    @Param('code') code: string,
    @Body() dto: JoinRoomDto,
  ): Promise<JoinRoomResponseDto> {
    return this.rooms.join(code, dto.name);
  }

  @Get('me')
  @UseGuards(ParticipantGuard)
  @ApiBearerAuth(TOKEN_AUTH)
  @ApiOperation({
    summary: 'Estado de la sala para el participante',
    description: 'Requiere el token del enlace personal.',
  })
  @ApiOkResponse({ type: ParticipantViewDto })
  @ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND (token inválido)' })
  me(
    @CurrentRoom() room: Room,
    @CurrentParticipant() me: Participant,
  ): Promise<ParticipantViewDto> {
    return this.rooms.participantView(room, me);
  }

  @Delete('me')
  @HttpCode(204)
  @UseGuards(ParticipantGuard)
  @ApiBearerAuth(TOKEN_AUTH)
  @ApiOperation({
    summary: 'Sale de la sala (solo antes del sorteo)',
    description:
      'Borra su pareja y su lista de deseos; su nombre queda libre y su enlace deja de funcionar.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND (token inválido)' })
  @ApiConflictResponse({ ...errors, description: 'ROOM_CLOSED' })
  leave(@CurrentParticipant() me: Participant): Promise<void> {
    return this.membership.remove(me.roomId, me.id);
  }

  @Get('manage')
  @UseGuards(OrganizerGuard)
  @ApiBearerAuth(TOKEN_AUTH)
  @ApiOperation({
    summary: 'Estado de la sala para el organizador',
    description: 'Requiere el token del enlace de gestión.',
  })
  @ApiOkResponse({ type: OrganizerViewDto })
  @ApiNotFoundResponse({ ...errors, description: 'NOT_FOUND (token inválido)' })
  manage(@CurrentRoom() room: Room): Promise<OrganizerViewDto> {
    return this.rooms.organizerView(room);
  }
}
