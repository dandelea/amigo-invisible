import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { notFound } from '../common/errors.js';
import { type Db, InjectDb } from '../db/db.module.js';
import { participants, wishlists } from '../db/schema.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { StorageService } from '../storage/storage.service.js';
import { lockOpenRoom } from './room-lock.js';

@Injectable()
export class MembershipService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly storage: StorageService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Expulsar (organizador) o salir (participante), solo antes del sorteo.
  // Borra al participante; la base de datos borra en cascada su pareja y su
  // lista. Después se borra su archivo, se cierran sus sockets (su enlace ya
  // no vale) y se avisa a la sala. Su nombre queda libre.
  async remove(roomId: string, participantId: string): Promise<void> {
    const fileKey = await this.db.transaction(async (tx) => {
      await lockOpenRoom(tx, roomId);
      const [wishlist] = await tx
        .select({ fileKey: wishlists.fileKey })
        .from(wishlists)
        .where(eq(wishlists.participantId, participantId));
      const deleted = await tx
        .delete(participants)
        .where(
          and(
            eq(participants.id, participantId),
            eq(participants.roomId, roomId),
          ),
        )
        .returning({ id: participants.id });
      if (deleted.length === 0) throw notFound();
      return wishlist?.fileKey ?? null;
    });
    await this.storage.deleteQuietly(fileKey);
    this.realtime.disconnectParticipant(participantId);
    this.realtime.notifyRoomChanged(roomId);
  }
}
