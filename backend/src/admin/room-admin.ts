import { count, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/db.module.js';
import { participants, rooms } from '../db/schema.js';
import type { StorageService } from '../storage/storage.service.js';

// Administración local de salas, solo para el script `npm run rooms` (no hay
// endpoint público). La aplicación nunca borra salas por su cuenta.

export interface RoomSummary {
  id: string;
  name: string;
  status: 'open' | 'drawn';
  participants: number;
  createdAt: Date;
}

export async function listRooms(db: Db): Promise<RoomSummary[]> {
  return db
    .select({
      id: rooms.id,
      name: rooms.name,
      status: rooms.status,
      participants: count(participants.id),
      createdAt: rooms.createdAt,
    })
    .from(rooms)
    .leftJoin(participants, eq(participants.roomId, rooms.id))
    .groupBy(rooms.id)
    .orderBy(desc(rooms.createdAt));
}

export async function findRoom(
  db: Db,
  roomId: string,
): Promise<RoomSummary | undefined> {
  return (await listRooms(db)).find((r) => r.id === roomId);
}

// Borra una sala: primero sus archivos del almacenamiento (todo lo que hay
// bajo rooms/<id>/) y después la fila de la sala, que arrastra en cascada
// participantes, parejas, listas, tokens y asignaciones. Si el borrado de
// archivos falla, la sala sigue intacta y se puede volver a intentar.
export async function deleteRoom(
  db: Db,
  storage: StorageService,
  roomId: string,
): Promise<{ files: number }> {
  const files = await storage.deletePrefix(`rooms/${roomId}/`);
  const deleted = await db
    .delete(rooms)
    .where(eq(rooms.id, roomId))
    .returning({ id: rooms.id });
  if (deleted.length === 0) throw new Error('La sala no existe');
  return { files };
}
