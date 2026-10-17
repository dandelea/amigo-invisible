import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type Db, InjectDb } from '../db/db.module.js';
import {
  participants,
  rooms,
  type Participant,
  type Room,
} from '../db/schema.js';
import { hashesMatch, hashToken, isWellFormedToken } from '../common/tokens.js';

// Resuelve los tokens secretos. La búsqueda es por hash (nunca por el token)
// y el resultado se confirma con una comparación en tiempo constante.
@Injectable()
export class AuthService {
  constructor(@InjectDb() private readonly db: Db) {}

  async roomByManageToken(token: unknown): Promise<Room | null> {
    if (typeof token !== 'string' || !isWellFormedToken(token)) return null;
    const hash = hashToken(token);
    const [room] = await this.db
      .select()
      .from(rooms)
      .where(eq(rooms.manageTokenHash, hash))
      .limit(1);
    return room && hashesMatch(room.manageTokenHash, hash) ? room : null;
  }

  async participantByToken(
    token: unknown,
  ): Promise<{ participant: Participant; room: Room } | null> {
    if (typeof token !== 'string' || !isWellFormedToken(token)) return null;
    const hash = hashToken(token);
    const [row] = await this.db
      .select({ participant: participants, room: rooms })
      .from(participants)
      .innerJoin(rooms, eq(rooms.id, participants.roomId))
      .where(eq(participants.tokenHash, hash))
      .limit(1);
    return row && hashesMatch(row.participant.tokenHash, hash) ? row : null;
  }
}
