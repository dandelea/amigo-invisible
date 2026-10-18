import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { cannotDraw, notDrawn, notFound } from '../common/errors.js';
import { generateToken, hashToken } from '../common/tokens.js';
import { type Db, InjectDb, type Tx } from '../db/db.module.js';
import {
  assignments,
  pairs,
  participants,
  rooms,
  wishlists,
  type Participant,
  type Room,
} from '../db/schema.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import type {
  AssignmentDto,
  NewParticipantTokenDto,
  ParticipantDrawDto,
} from '../rooms/dto.js';
import { toWishlistDto } from '../rooms/rooms.service.js';
import { checkDrawFeasibility, cycleToAssignments, drawCycle } from './draw.js';

// Sorteo en la base de datos. Todo pasa con la fila de la sala bloqueada,
// así que un doble clic, un sorteo mientras alguien entra o dos repeticiones
// simultáneas se procesan de una en una.
@Injectable()
export class DrawService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Primer sorteo. Es idempotente: si la sala ya está sorteada, no hace nada
  // y devuelve la ronda actual (un doble clic no sortea dos veces).
  async draw(roomId: string): Promise<ParticipantDrawDto> {
    const result = await this.db.transaction(async (tx) => {
      const room = await this.lockRoom(tx, roomId);
      if (room.status === 'drawn')
        return { round: room.drawRound, changed: false };
      await this.assign(tx, room);
      await tx
        .update(rooms)
        .set({ status: 'drawn', drawRound: 1, updatedAt: new Date() })
        .where(eq(rooms.id, roomId));
      return { round: 1, changed: true };
    });
    if (result.changed) this.realtime.notifyRoomChanged(roomId);
    return { round: result.round, seen: false };
  }

  // Repetir el sorteo: mismos participantes (tras el primer sorteo ya no se
  // puede entrar, salir ni cambiar parejas). Borra el resultado anterior y
  // reinicia los «vistos». La sala sigue cerrada.
  async redraw(roomId: string): Promise<ParticipantDrawDto> {
    const round = await this.db.transaction(async (tx) => {
      const room = await this.lockRoom(tx, roomId);
      if (room.status !== 'drawn') throw notDrawn();
      await tx.delete(assignments).where(eq(assignments.roomId, roomId));
      await this.assign(tx, room);
      const next = room.drawRound + 1;
      await tx
        .update(rooms)
        .set({ drawRound: next, updatedAt: new Date() })
        .where(eq(rooms.id, roomId));
      return next;
    });
    this.realtime.notifyRoomChanged(roomId);
    return { round, seen: false };
  }

  // Nuevo enlace personal para un participante (antes o después del
  // sorteo). El anterior deja de funcionar y sus sockets se cierran. El
  // organizador conoce el nuevo enlace: riesgo aceptado en el MVP.
  async regenerateToken(
    roomId: string,
    participantId: string,
  ): Promise<NewParticipantTokenDto> {
    const participantToken = generateToken();
    const updated = await this.db.transaction(async (tx) => {
      await this.lockRoom(tx, roomId);
      return tx
        .update(participants)
        .set({ tokenHash: hashToken(participantToken) })
        .where(
          and(
            eq(participants.id, participantId),
            eq(participants.roomId, roomId),
          ),
        )
        .returning({ id: participants.id });
    });
    if (updated.length === 0) throw notFound();
    this.realtime.disconnectParticipant(participantId);
    return { participantToken };
  }

  // La asignación propia del participante, con la lista de deseos de la
  // persona a la que regala. Es la única forma de ver una asignación.
  async assignmentOf(room: Room, me: Participant): Promise<AssignmentDto> {
    if (room.status !== 'drawn') throw notDrawn();
    const [row] = await this.db
      .select({ receiver: participants, wishlist: wishlists })
      .from(assignments)
      .innerJoin(participants, eq(participants.id, assignments.receiverId))
      .leftJoin(wishlists, eq(wishlists.participantId, participants.id))
      .where(eq(assignments.giverId, me.id))
      .limit(1);
    if (!row) throw notDrawn();
    return {
      receiver: {
        id: row.receiver.id,
        name: row.receiver.name,
        wishlist: toWishlistDto(row.wishlist ?? undefined),
      },
      round: room.drawRound,
      seen: me.seenAt !== null,
    };
  }

  // El cliente confirma que ha visto su resultado (al terminar la ruleta o
  // al abrirlo) e indica de qué ronda. Solo cuenta la primera vez y solo si
  // esa ronda sigue siendo la actual: si el organizador acaba de repetir el
  // sorteo, el resultado nuevo todavía no se ha visto.
  async markSeen(room: Room, me: Participant, round: number): Promise<void> {
    if (room.status !== 'drawn') throw notDrawn();
    const updated = await this.db
      .update(participants)
      .set({ seenAt: new Date() })
      .where(
        and(
          eq(participants.id, me.id),
          isNull(participants.seenAt),
          sql`exists (select 1 from ${rooms} where ${rooms.id} = ${room.id} and ${rooms.drawRound} = ${round})`,
        ),
      )
      .returning({ id: participants.id });
    if (updated.length > 0) this.realtime.notifyRoomChanged(room.id);
  }

  private async lockRoom(tx: Tx, roomId: string): Promise<Room> {
    const [room] = await tx
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .for('update');
    if (!room) throw notFound();
    return room;
  }

  // Sortea con los participantes y parejas actuales, guarda el ciclo y
  // reinicia los «vistos».
  private async assign(tx: Tx, room: Room): Promise<void> {
    const list = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.roomId, room.id))
      .orderBy(asc(participants.createdAt), asc(participants.id));
    const pairRows = await tx
      .select({ a: pairs.participantAId, b: pairs.participantBId })
      .from(pairs)
      .where(eq(pairs.roomId, room.id));
    const input = {
      participantIds: list.map((p) => p.id),
      pairs: pairRows.map((p) => [p.a, p.b] as const),
      pairRuleEnabled: room.pairRuleEnabled,
    };
    const feasibility = checkDrawFeasibility(input);
    if (!feasibility.ok) throw cannotDraw(feasibility.code);
    const cycle = drawCycle(input);
    await tx.insert(assignments).values(
      [...cycleToAssignments(cycle)].map(([giverId, receiverId]) => ({
        giverId,
        receiverId,
        roomId: room.id,
      })),
    );
    await tx
      .update(participants)
      .set({ seenAt: null })
      .where(eq(participants.roomId, room.id));
  }
}
