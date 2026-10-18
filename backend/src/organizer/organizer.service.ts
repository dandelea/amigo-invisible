import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import {
  alreadyPaired,
  isUniqueViolation,
  notFound,
  samePerson,
} from '../common/errors.js';
import { type Db, InjectDb } from '../db/db.module.js';
import { pairMembers, pairs, participants, rooms } from '../db/schema.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type { PairDto, RoomDto, UpdateRoomDto } from '../rooms/dto.js';
import { lockOpenRoom } from '../rooms/room-lock.js';
import { toPairDto, toRoomDto } from '../rooms/rooms.service.js';

// Acciones del organizador. Todas bloquean la sala, exigen que siga abierta
// y avisan a la sala al terminar.
@Injectable()
export class OrganizerService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly realtime: RealtimeGateway,
  ) {}

  async updateRoom(roomId: string, dto: UpdateRoomDto): Promise<RoomDto> {
    const room = await this.db.transaction(async (tx) => {
      await lockOpenRoom(tx, roomId);
      const changes: Partial<typeof rooms.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (dto.name !== undefined) changes.name = dto.name;
      if (dto.giftDate !== undefined) changes.giftDate = dto.giftDate;
      if (dto.budget !== undefined) {
        changes.budgetCents =
          dto.budget === null ? null : Math.round(dto.budget * 100);
      }
      const [updated] = await tx
        .update(rooms)
        .set(changes)
        .where(eq(rooms.id, roomId))
        .returning();
      return updated;
    });
    this.realtime.notifyRoomChanged(roomId);
    return toRoomDto(room);
  }

  async setPairRule(roomId: string, enabled: boolean): Promise<RoomDto> {
    const room = await this.db.transaction(async (tx) => {
      await lockOpenRoom(tx, roomId);
      const [updated] = await tx
        .update(rooms)
        .set({ pairRuleEnabled: enabled, updatedAt: new Date() })
        .where(eq(rooms.id, roomId))
        .returning();
      return updated;
    });
    this.realtime.notifyRoomChanged(roomId);
    return toRoomDto(room);
  }

  // Con la sala bloqueada, dos parejas simultáneas que compartan a alguien
  // se procesan de una en una y la segunda recibe ALREADY_PAIRED. Además,
  // la clave primaria de pair_members lo impide en la propia base de datos.
  async createPair(roomId: string, ids: string[]): Promise<PairDto> {
    const [a, b] = [...ids].sort();
    if (a === b) throw samePerson();
    try {
      const pair = await this.db.transaction(async (tx) => {
        await lockOpenRoom(tx, roomId);
        const members = await tx
          .select({ id: participants.id })
          .from(participants)
          .where(
            and(
              eq(participants.roomId, roomId),
              inArray(participants.id, [a, b]),
            ),
          );
        if (members.length !== 2) throw notFound();
        const [existing] = await tx
          .select({ id: pairMembers.participantId })
          .from(pairMembers)
          .where(inArray(pairMembers.participantId, [a, b]))
          .limit(1);
        if (existing) throw alreadyPaired();
        const [created] = await tx
          .insert(pairs)
          .values({ roomId, participantAId: a, participantBId: b })
          .returning();
        await tx.insert(pairMembers).values([
          { participantId: a, pairId: created.id },
          { participantId: b, pairId: created.id },
        ]);
        return created;
      });
      this.realtime.notifyRoomChanged(roomId);
      return toPairDto(pair);
    } catch (error) {
      // Respaldo en la base de datos: alguien ya está en otra pareja.
      if (isUniqueViolation(error, 'pair_members_pkey')) throw alreadyPaired();
      throw error;
    }
  }

  async deletePair(roomId: string, pairId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await lockOpenRoom(tx, roomId);
      const deleted = await tx
        .delete(pairs)
        .where(and(eq(pairs.id, pairId), eq(pairs.roomId, roomId)))
        .returning({ id: pairs.id });
      if (deleted.length === 0) throw notFound();
    });
    this.realtime.notifyRoomChanged(roomId);
  }
}
