// Script local de administración de salas. No hay endpoint público: solo lo
// ejecuta quien tiene acceso a la base de datos y al almacenamiento.
//
//   npm run rooms -- list
//   npm run rooms -- delete <id de la sala>          (pide confirmación)
//   npm run rooms -- delete <id de la sala> --yes    (sin preguntar)
//
// Usa las variables de backend/.env (o del entorno). Para producción, apunta
// DATABASE_URL y S3_* a Neon y R2.
import { createInterface } from 'node:readline/promises';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { deleteRoom, findRoom, listRooms } from '../admin/room-admin.js';
import { validateEnv } from '../config/env.js';
import * as schema from '../db/schema.js';
import { StorageService } from '../storage/storage.service.js';

try {
  process.loadEnvFile('.env');
} catch {
  // Sin archivo .env: se usan las variables del entorno.
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main(args: string[]): Promise<number> {
  const env = validateEnv(process.env);
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  const db = drizzle(pool, { schema });
  const storage = new StorageService(env);
  try {
    const [command, roomId] = args;
    if (command === 'list') {
      const list = await listRooms(db);
      if (list.length === 0) console.log('No hay salas.');
      for (const r of list) {
        const estado = r.status === 'open' ? 'abierta' : 'sorteada';
        console.log(
          `${r.id}  ${r.createdAt.toISOString().slice(0, 10)}  ${estado.padEnd(8)}  ${String(r.participants).padStart(2)} part.  ${r.name}`,
        );
      }
      console.log(`Total: ${list.length} de ${env.MAX_ROOMS} (MAX_ROOMS).`);
      return 0;
    }
    if (command === 'delete' && roomId && UUID.test(roomId)) {
      const room = await findRoom(db, roomId);
      if (!room) {
        console.error('No existe ninguna sala con ese id.');
        return 1;
      }
      console.log(
        `Sala «${room.name}» (${room.participants} participantes, ${room.status === 'open' ? 'abierta' : 'sorteada'}).`,
      );
      console.log(
        'Se borrarán la sala, sus participantes, parejas, listas, enlaces, el sorteo y sus archivos. No se puede deshacer.',
      );
      if (!args.includes('--yes')) {
        const rl = createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        const answer = await rl.question(
          'Escribe el nombre de la sala para confirmar: ',
        );
        rl.close();
        if (answer.trim() !== room.name) {
          console.log('El nombre no coincide: no se ha borrado nada.');
          return 1;
        }
      }
      const { files } = await deleteRoom(db, storage, roomId);
      console.log(
        `Sala borrada (${files} archivo(s) eliminados del almacenamiento).`,
      );
      return 0;
    }
    console.error(
      'Uso: npm run rooms -- list | npm run rooms -- delete <id de la sala> [--yes]',
    );
    return 1;
  } finally {
    await pool.end();
  }
}

process.exitCode = await main(process.argv.slice(2));
