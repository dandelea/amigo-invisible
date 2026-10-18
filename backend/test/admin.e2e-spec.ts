import type { NestExpressApplication } from '@nestjs/platform-express';
import { count } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { deleteRoom, findRoom, listRooms } from '../src/admin/room-admin.js';
import { type Db, DB } from '../src/db/db.module.js';
import {
  assignments,
  pairMembers,
  pairs,
  participants,
  rooms,
  wishlists,
} from '../src/db/schema.js';
import { StorageService } from '../src/storage/storage.service.js';
import {
  auth,
  createRoom,
  createTestApp,
  files,
  http,
  join,
  resetDb,
  storedKeys,
} from './helpers.js';

describe('Borrado manual de salas (e2e)', () => {
  let app: NestExpressApplication;
  let db: Db;
  let storage: StorageService;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Db>(DB);
    storage = app.get(StorageService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  // Sala completa: participantes, pareja, lista con archivo y sorteo.
  async function fullRoom(name: string) {
    const room = await createRoom(app, { name });
    const people = [];
    for (const n of ['Ana', 'Luis', 'Marta', 'Pablo']) {
      people.push(await join(app, room.inviteCode, n));
    }
    await http(app)
      .post('/api/manage/pairs')
      .set(auth(room.manageToken))
      .send({
        participantIds: [people[0].participant.id, people[1].participant.id],
      })
      .expect(201);
    await http(app)
      .put('/api/me/wishlist/file')
      .set(auth(people[2].participantToken))
      .attach('file', files.png, 'lista.png')
      .expect(200);
    await http(app)
      .post('/api/manage/draw')
      .set(auth(room.manageToken))
      .expect(200);
    const [{ id }] = (await listRooms(db)).filter((r) => r.name === name);
    return { ...room, id, people };
  }

  const total = async (table: PgTable) => {
    const [{ value }] = await db.select({ value: count() }).from(table);
    return value;
  };

  it('lista las salas con su estado y número de participantes', async () => {
    await fullRoom('Cena de Navidad');
    await createRoom(app, { name: 'Amigos del barrio' });
    const list = await listRooms(db);
    expect(list.map((r) => [r.name, r.status, r.participants])).toEqual([
      ['Amigos del barrio', 'open', 0],
      ['Cena de Navidad', 'drawn', 4],
    ]);
    expect(JSON.stringify(list)).not.toMatch(/token|hash|invite/i);
  });

  it('borra la sala con todo lo suyo y sus archivos, sin tocar las demás', async () => {
    const a = await fullRoom('Sala A');
    const b = await fullRoom('Sala B');
    expect(await storedKeys()).toHaveLength(2);

    const result = await deleteRoom(db, storage, a.id);
    expect(result).toEqual({ files: 1 });

    expect(await findRoom(db, a.id)).toBeUndefined();
    expect(await total(rooms)).toBe(1);
    expect(await total(participants)).toBe(4);
    expect(await total(pairs)).toBe(1);
    expect(await total(pairMembers)).toBe(2);
    expect(await total(wishlists)).toBe(1);
    expect(await total(assignments)).toBe(4);
    const keys = await storedKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain(`rooms/${b.id}/`);

    // Los enlaces de la sala borrada dejan de funcionar.
    await http(app).get('/api/manage').set(auth(a.manageToken)).expect(404);
    await http(app)
      .get('/api/me')
      .set(auth(a.people[0].participantToken))
      .expect(404);
    await http(app).get('/api/manage').set(auth(b.manageToken)).expect(200);
  });

  it('borrar libera hueco para MAX_ROOMS', async () => {
    const limited = await createTestApp({ MAX_ROOMS: '1' });
    try {
      await createRoom(limited, { name: 'Única' });
      await http(limited).post('/api/rooms').send({ name: 'Otra' }).expect(503);
      const [{ id }] = await listRooms(db);
      await deleteRoom(db, storage, id);
      await createRoom(limited, { name: 'Otra' });
    } finally {
      await limited.close();
    }
  });

  it('una sala que no existe da error', async () => {
    await expect(
      deleteRoom(db, storage, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toThrow('La sala no existe');
  });
});
