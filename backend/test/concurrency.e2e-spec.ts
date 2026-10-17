import type { NestExpressApplication } from '@nestjs/platform-express';
import { count, eq } from 'drizzle-orm';
import { type Db, DB } from '../src/db/db.module.js';
import { participants, rooms } from '../src/db/schema.js';
import { createRoom, createTestApp, http, join, resetDb } from './helpers.js';

// Peticiones simultáneas: el tope de 30, los nombres únicos y MAX_ROOMS se
// comprueban dentro de transacciones con bloqueo, así que nunca se superan.

const tally = (statuses: { body: { error?: string }; status: number }[]) => {
  const result: Record<string, number> = {};
  for (const res of statuses) {
    const key =
      res.status === 201 ? 'ok' : (res.body.error ?? String(res.status));
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
};

describe('Concurrencia (e2e)', () => {
  let app: NestExpressApplication;
  let db: Db;

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Db>(DB);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  const joinAll = (inviteCode: string, names: string[]) =>
    Promise.all(
      names.map((name) =>
        http(app)
          .post(`/api/invitations/${inviteCode}/participants`)
          .send({ name }),
      ),
    );

  const participantCount = async () => {
    const [{ value }] = await db.select({ value: count() }).from(participants);
    return value;
  };

  it('31 entradas simultáneas en una sala vacía: entran 30', async () => {
    const { inviteCode } = await createRoom(app);
    const names = Array.from({ length: 31 }, (_, i) => `Persona ${i + 1}`);
    expect(tally(await joinAll(inviteCode, names))).toEqual({
      ok: 30,
      ROOM_FULL: 1,
    });
    expect(await participantCount()).toBe(30);
  });

  it('5 entradas simultáneas con la sala a 29: entra 1', async () => {
    const { inviteCode } = await createRoom(app);
    for (let i = 1; i <= 29; i++) await join(app, inviteCode, `Persona ${i}`);
    const names = ['Ana', 'Luis', 'Marta', 'Pablo', 'Carla'];
    expect(tally(await joinAll(inviteCode, names))).toEqual({
      ok: 1,
      ROOM_FULL: 4,
    });
    expect(await participantCount()).toBe(30);
  });

  it('10 entradas simultáneas con el mismo nombre: entra 1', async () => {
    const { inviteCode } = await createRoom(app);
    const names = [
      'Ana',
      'ana',
      'ANA',
      'Aná',
      'Ana',
      'ana',
      'Ána',
      'ANA',
      'Ana',
      'aNa',
    ];
    expect(tally(await joinAll(inviteCode, names))).toEqual({
      ok: 1,
      NAME_TAKEN: 9,
    });
  });

  it('entradas simultáneas mientras la sala se cierra: no entra nadie después', async () => {
    const { inviteCode } = await createRoom(app);
    const closing = db
      .update(rooms)
      .set({ status: 'drawn' })
      .where(eq(rooms.inviteCode, inviteCode));
    const results = await Promise.all([
      closing,
      ...Array.from({ length: 5 }, (_, i) =>
        http(app)
          .post(`/api/invitations/${inviteCode}/participants`)
          .send({ name: `Persona ${i}` }),
      ),
    ]);
    const joins = results.slice(1) as {
      status: number;
      body: { error?: string };
    }[];
    // Cada entrada o bien entró antes del cierre o bien recibió ROOM_CLOSED.
    for (const res of joins) {
      expect([201, 409]).toContain(res.status);
      if (res.status === 409) expect(res.body.error).toBe('ROOM_CLOSED');
    }
    const okCount = joins.filter((r) => r.status === 201).length;
    expect(await participantCount()).toBe(okCount);
  });

  describe('MAX_ROOMS', () => {
    let limited: NestExpressApplication;

    beforeAll(async () => {
      limited = await createTestApp({ MAX_ROOMS: '3' });
    });

    afterAll(async () => {
      await limited.close();
    });

    it('10 creaciones simultáneas con MAX_ROOMS=3: se crean 3', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          http(limited)
            .post('/api/rooms')
            .send({ name: `Sala ${i + 1}` }),
        ),
      );
      expect(tally(results)).toEqual({ ok: 3, MAX_ROOMS_REACHED: 7 });
      const [{ value }] = await db.select({ value: count() }).from(rooms);
      expect(value).toBe(3);
    });
  });
});
