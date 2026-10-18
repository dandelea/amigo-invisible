import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import type { Env } from '../config/env.js';
import { InjectEnv } from '../config/env.module.js';
import { type Db, InjectDb } from '../db/db.module.js';
import {
  pairs,
  participants,
  rooms,
  wishlists,
  type Pair,
  type Participant,
  type Room,
  type Wishlist,
} from '../db/schema.js';
import {
  isUniqueViolation,
  maxRoomsReached,
  nameTaken,
  notFound,
  roomClosed,
  roomFull,
} from '../common/errors.js';
import { nameKey } from '../common/names.js';
import {
  generateInviteCode,
  generateToken,
  hashToken,
  INVITE_CODE_PATTERN,
} from '../common/tokens.js';
import { MAX_PARTICIPANTS } from '../draw/draw.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type {
  CreateRoomDto,
  CreateRoomResponseDto,
  InvitationDto,
  JoinRoomResponseDto,
  OrganizerViewDto,
  PairDto,
  ParticipantDto,
  ParticipantViewDto,
  RoomDto,
  WishlistDto,
} from './dto.js';

// Clave del bloqueo consultivo que serializa la creación de salas, para que
// dos creaciones simultáneas no superen MAX_ROOMS.
const ROOM_CREATION_LOCK = 727_001;

@Injectable()
export class RoomsService {
  constructor(
    @InjectDb() private readonly db: Db,
    @InjectEnv() private readonly env: Env,
    private readonly realtime: RealtimeGateway,
  ) {}

  async canCreateRoom(): Promise<boolean> {
    const [{ value }] = await this.db.select({ value: count() }).from(rooms);
    return value < this.env.MAX_ROOMS;
  }

  async create(dto: CreateRoomDto): Promise<CreateRoomResponseDto> {
    const manageToken = generateToken();
    const room = await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(${ROOM_CREATION_LOCK})`,
      );
      const [{ value }] = await tx.select({ value: count() }).from(rooms);
      if (value >= this.env.MAX_ROOMS) {
        throw maxRoomsReached();
      }
      const [created] = await tx
        .insert(rooms)
        .values({
          name: dto.name,
          giftDate: dto.giftDate ?? null,
          budgetCents: dto.budget == null ? null : Math.round(dto.budget * 100),
          inviteCode: generateInviteCode(),
          manageTokenHash: hashToken(manageToken),
        })
        .returning();
      return created;
    });
    return { room: toRoomDto(room), inviteCode: room.inviteCode, manageToken };
  }

  async invitation(code: string): Promise<InvitationDto> {
    const room = await this.roomByInviteCode(code);
    const list = await this.participantsOf(room.id);
    const cannotJoinReason =
      room.status !== 'open'
        ? 'ROOM_CLOSED'
        : list.length >= MAX_PARTICIPANTS
          ? 'ROOM_FULL'
          : null;
    return {
      room: toRoomDto(room),
      participantCount: list.length,
      maxParticipants: MAX_PARTICIPANTS,
      participantNames: cannotJoinReason ? [] : list.map((p) => p.name),
      cannotJoinReason,
    };
  }

  // Unirse: la fila de la sala se bloquea durante la transacción, así que
  // las entradas simultáneas se procesan de una en una y no superan el tope
  // ni entran en una sala que se está sorteando.
  async join(code: string, name: string): Promise<JoinRoomResponseDto> {
    if (!INVITE_CODE_PATTERN.test(code)) throw notFound();
    const participantToken = generateToken();
    const key = nameKey(name);
    try {
      const participant = await this.db.transaction(async (tx) => {
        const [room] = await tx
          .select()
          .from(rooms)
          .where(eq(rooms.inviteCode, code))
          .for('update');
        if (!room) throw notFound();
        if (room.status !== 'open') throw roomClosed();
        const [{ value }] = await tx
          .select({ value: count() })
          .from(participants)
          .where(eq(participants.roomId, room.id));
        if (value >= MAX_PARTICIPANTS) throw roomFull();
        const [existing] = await tx
          .select({ id: participants.id })
          .from(participants)
          .where(
            and(
              eq(participants.roomId, room.id),
              eq(participants.nameKey, key),
            ),
          );
        if (existing) throw nameTaken();
        const [created] = await tx
          .insert(participants)
          .values({
            roomId: room.id,
            name,
            nameKey: key,
            tokenHash: hashToken(participantToken),
          })
          .returning();
        return created;
      });
      this.realtime.notifyRoomChanged(participant.roomId);
      return { participant: toParticipantDto(participant), participantToken };
    } catch (error) {
      // Respaldo de la restricción única por si la comprobación previa falla.
      if (isUniqueViolation(error, 'participants_room_name_key')) {
        throw nameTaken();
      }
      throw error;
    }
  }

  async participantView(
    room: Room,
    me: Participant,
  ): Promise<ParticipantViewDto> {
    const [list, wishlistRows, pairRows] = await Promise.all([
      this.participantsOf(room.id),
      this.db
        .select({ wishlist: wishlists })
        .from(wishlists)
        .innerJoin(participants, eq(participants.id, wishlists.participantId))
        .where(eq(participants.roomId, room.id)),
      this.pairsOf(room.id),
    ]);
    const byParticipant = new Map(
      wishlistRows.map(({ wishlist }) => [wishlist.participantId, wishlist]),
    );
    return {
      room: toRoomDto(room),
      me: toParticipantDto(me),
      participants: list.map((p) => ({
        id: p.id,
        name: p.name,
        wishlist: toWishlistDto(byParticipant.get(p.id)),
      })),
      pairs: pairRows.map(toPairDto),
      maxParticipants: MAX_PARTICIPANTS,
    };
  }

  async organizerView(room: Room): Promise<OrganizerViewDto> {
    const [list, pairRows] = await Promise.all([
      this.participantsOf(room.id),
      this.pairsOf(room.id),
    ]);
    return {
      room: toRoomDto(room),
      inviteCode: room.inviteCode,
      participants: list.map(toParticipantDto),
      pairs: pairRows.map(toPairDto),
      maxParticipants: MAX_PARTICIPANTS,
    };
  }

  private pairsOf(roomId: string): Promise<Pair[]> {
    return this.db
      .select()
      .from(pairs)
      .where(eq(pairs.roomId, roomId))
      .orderBy(asc(pairs.createdAt), asc(pairs.id));
  }

  private async roomByInviteCode(code: string): Promise<Room> {
    if (!INVITE_CODE_PATTERN.test(code)) throw notFound();
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.inviteCode, code))
      .limit(1);
    if (!room) throw notFound();
    return room;
  }

  private participantsOf(roomId: string): Promise<Participant[]> {
    return this.db
      .select()
      .from(participants)
      .where(eq(participants.roomId, roomId))
      .orderBy(asc(participants.createdAt), asc(participants.id));
  }
}

// Las respuestas se construyen campo a campo: nunca se devuelven filas de
// la base de datos tal cual, para no exponer hashes ni ids internos.
export function toRoomDto(room: Room): RoomDto {
  return {
    name: room.name,
    giftDate: room.giftDate,
    budget: room.budgetCents == null ? null : room.budgetCents / 100,
    status: room.status,
    pairRuleEnabled: room.pairRuleEnabled,
  };
}

function toParticipantDto(p: Participant): ParticipantDto {
  return { id: p.id, name: p.name };
}

export function toPairDto(p: Pair): PairDto {
  return { id: p.id, participantIds: [p.participantAId, p.participantBId] };
}

// La clave del archivo en el almacenamiento nunca sale del backend.
export function toWishlistDto(w: Wishlist | undefined): WishlistDto | null {
  if (!w) return null;
  return {
    kind: w.kind,
    url: w.kind === 'link' ? w.url : null,
    fileName: w.kind === 'file' ? w.fileName : null,
    fileType: w.kind === 'file' ? w.fileType : null,
    fileSize: w.kind === 'file' ? w.fileSize : null,
  };
}
