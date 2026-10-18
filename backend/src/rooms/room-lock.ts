import { eq } from 'drizzle-orm';
import { notFound, roomClosed } from '../common/errors.js';
import type { Tx } from '../db/db.module.js';
import { rooms, type Room } from '../db/schema.js';

// Bloquea la fila de la sala hasta el final de la transacción y comprueba
// que sigue abierta. Todas las modificaciones (unirse, parejas, deseos,
// salir…) pasan por aquí, así que se aplican de una en una y nunca después
// del sorteo.
export async function lockOpenRoom(tx: Tx, roomId: string): Promise<Room> {
  const [room] = await tx
    .select()
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .for('update');
  if (!room) throw notFound();
  if (room.status !== 'open') throw roomClosed();
  return room;
}
