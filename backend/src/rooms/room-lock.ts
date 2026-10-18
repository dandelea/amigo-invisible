import { eq } from 'drizzle-orm';
import { notFound, roomClosed } from '../common/errors.js';
import type { Tx } from '../db/db.module.js';
import { rooms, type Room } from '../db/schema.js';

// Bloquea la fila de la sala hasta el final de la transacción y comprueba
// que sigue abierta. Las modificaciones de la sala (parejas, regla, datos,
// salir, expulsar…) pasan por aquí, así que se aplican de una en una y
// nunca después del sorteo.
export async function lockOpenRoom(tx: Tx, roomId: string): Promise<Room> {
  const room = await lockRoom(tx, roomId);
  if (room.status !== 'open') throw roomClosed();
  return room;
}

// Bloquea la fila de la sala sin exigir que esté abierta: para lo que se
// puede hacer también después del sorteo (la lista de deseos).
export async function lockRoom(tx: Tx, roomId: string): Promise<Room> {
  const [room] = await tx
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .for('update');
  if (!room) throw notFound();
  return room;
}
