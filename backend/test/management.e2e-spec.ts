import type { NestExpressApplication } from '@nestjs/platform-express';
import { count } from 'drizzle-orm';
import { type Db, DB } from '../src/db/db.module.js';
import { pairMembers, pairs, rooms } from '../src/db/schema.js';
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

describe('Gestión de la sala (e2e)', () => {
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

  // Sala con organizador y cuatro participantes.
  async function setup() {
    const room = await createRoom(app);
    const people = {
      ana: await join(app, room.inviteCode, 'Ana'),
      luis: await join(app, room.inviteCode, 'Luis'),
      marta: await join(app, room.inviteCode, 'Marta'),
      pablo: await join(app, room.inviteCode, 'Pablo'),
    };
    const id = (k: keyof typeof people) => people[k].participant.id;
    const asOrganizer = (req: ReturnType<ReturnType<typeof http>['get']>) =>
      req.set(auth(room.manageToken));
    return { ...room, people, id, asOrganizer };
  }

  const manage = (token: string) =>
    http(app).get('/api/manage').set(auth(token));
  const me = (token: string) => http(app).get('/api/me').set(auth(token));

  describe('parejas', () => {
    it('marca y deshace una pareja, y todos la ven', async () => {
      const s = await setup();
      const res = await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('luis'), s.id('ana')] })
        .expect(201);
      expect(res.body.participantIds.sort()).toEqual(
        [s.id('ana'), s.id('luis')].sort(),
      );

      const view = await me(s.people.marta.participantToken).expect(200);
      expect(view.body.pairs).toEqual([res.body]);
      expect((await manage(s.manageToken)).body.pairs).toEqual([res.body]);

      await http(app)
        .delete(`/api/manage/pairs/${res.body.id}`)
        .set(auth(s.manageToken))
        .expect(204);
      expect((await manage(s.manageToken)).body.pairs).toEqual([]);
    });

    it('nadie puede estar en dos parejas', async () => {
      const s = await setup();
      await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('ana'), s.id('luis')] })
        .expect(201);
      for (const other of ['marta', 'pablo'] as const) {
        for (const paired of ['ana', 'luis'] as const) {
          const res = await http(app)
            .post('/api/manage/pairs')
            .set(auth(s.manageToken))
            .send({ participantIds: [s.id(paired), s.id(other)] })
            .expect(409);
          expect(res.body.error).toBe('ALREADY_PAIRED');
        }
      }
    });

    it('no se puede emparejar a alguien consigo mismo ni de otra sala', async () => {
      const s = await setup();
      const other = await createRoom(app);
      const stranger = await join(app, other.inviteCode, 'Sofía');
      const same = await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('ana'), s.id('ana')] })
        .expect(400);
      expect(same.body.error).toBe('VALIDATION_ERROR');
      await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('ana'), stranger.participant.id] })
        .expect(404);
    });

    it.each([
      [
        'una sola persona',
        { participantIds: ['00000000-0000-4000-8000-000000000000'] },
      ],
      [
        'tres personas',
        {
          participantIds: Array(3).fill('00000000-0000-4000-8000-000000000000'),
        },
      ],
      ['ids que no son UUID', { participantIds: ['a', 'b'] }],
      ['sin cuerpo', {}],
    ])('rechaza %s', async (_, body) => {
      const s = await setup();
      const res = await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send(body)
        .expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('deshacer una pareja de otra sala da 404', async () => {
      const a = await setup();
      const pair = await http(app)
        .post('/api/manage/pairs')
        .set(auth(a.manageToken))
        .send({ participantIds: [a.id('ana'), a.id('luis')] })
        .expect(201);
      const b = await createRoom(app);
      await http(app)
        .delete(`/api/manage/pairs/${pair.body.id}`)
        .set(auth(b.manageToken))
        .expect(404);
      await http(app)
        .delete('/api/manage/pairs/no-es-un-uuid')
        .set(auth(a.manageToken))
        .expect(404);
    });

    it('parejas simultáneas con la misma persona: solo se crea una', async () => {
      // La persona compartida es la de id mediano, así queda como
      // participant_a en unas parejas y como participant_b en otras.
      const room = await createRoom(app);
      const ids: string[] = [];
      for (let n = 1; n <= 21; n++) {
        const name = `P${n}`;
        ids.push((await join(app, room.inviteCode, name)).participant.id);
      }
      ids.sort();
      const hub = ids[10];
      const others = ids.filter((id) => id !== hub);
      for (let round = 0; round < 10; round++) {
        await db.delete(pairs);
        const results = await Promise.all(
          others.map((other) =>
            http(app)
              .post('/api/manage/pairs')
              .set(auth(room.manageToken))
              .send({ participantIds: [hub, other] }),
          ),
        );
        expect(results.filter((r) => r.status === 201)).toHaveLength(1);
        expect(
          results.filter((r) => r.body.error === 'ALREADY_PAIRED'),
        ).toHaveLength(others.length - 1);
        const [{ value }] = await db.select({ value: count() }).from(pairs);
        expect(value).toBe(1);
      }
    });
  });

  it('la base de datos impide que alguien esté en dos parejas', async () => {
    const s = await setup();
    const roomId = (await db.select({ id: rooms.id }).from(rooms).limit(1))[0]
      .id;
    const [ana, luis, marta] = [s.id('ana'), s.id('luis'), s.id('marta')];
    const insertPair = (a: string, b: string) =>
      db.transaction(async (tx) => {
        const [x, y] = [a, b].sort();
        const [pair] = await tx
          .insert(pairs)
          .values({ roomId, participantAId: x, participantBId: y })
          .returning();
        await tx.insert(pairMembers).values([
          { participantId: x, pairId: pair.id },
          { participantId: y, pairId: pair.id },
        ]);
      });
    await insertPair(ana, luis);
    await expect(insertPair(ana, marta)).rejects.toThrow();
    const [{ value }] = await db.select({ value: count() }).from(pairs);
    expect(value).toBe(1);
  });

  describe('regla de pareja y datos de la sala', () => {
    it('activa y desactiva la regla', async () => {
      const s = await setup();
      const off = await http(app)
        .put('/api/manage/pair-rule')
        .set(auth(s.manageToken))
        .send({ enabled: false })
        .expect(200);
      expect(off.body.pairRuleEnabled).toBe(false);
      expect(
        (await me(s.people.ana.participantToken)).body.room.pairRuleEnabled,
      ).toBe(false);
      await http(app)
        .put('/api/manage/pair-rule')
        .set(auth(s.manageToken))
        .send({ enabled: 'sí' })
        .expect(400);
    });

    it('edita solo los campos enviados y null borra la fecha o el presupuesto', async () => {
      const s = await setup();
      await http(app)
        .patch('/api/manage/room')
        .set(auth(s.manageToken))
        .send({ budget: 20 })
        .expect(200);
      const res = await http(app)
        .patch('/api/manage/room')
        .set(auth(s.manageToken))
        .send({ name: '  Cena   2026 ', budget: null })
        .expect(200);
      expect(res.body).toMatchObject({
        name: 'Cena 2026',
        budget: null,
        giftDate: null,
      });
      expect((await me(s.people.ana.participantToken)).body.room.name).toBe(
        'Cena 2026',
      );
    });

    it.each([
      ['nombre vacío', { name: '' }],
      ['nombre null', { name: null }],
      ['fecha pasada', { giftDate: '2020-01-01' }],
      ['presupuesto inválido', { budget: 0 }],
      ['campo desconocido', { status: 'drawn' }],
    ])('rechaza %s', async (_, body) => {
      const s = await setup();
      const res = await http(app)
        .patch('/api/manage/room')
        .set(auth(s.manageToken))
        .send(body)
        .expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('expulsar y salir', () => {
    it('expulsar borra la pareja, la lista y el archivo; el enlace deja de valer', async () => {
      const s = await setup();
      await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('ana'), s.id('luis')] })
        .expect(201);
      await http(app)
        .put('/api/me/wishlist/file')
        .set(auth(s.people.ana.participantToken))
        .attach('file', files.png, 'lista.png')
        .expect(200);
      expect(await storedKeys()).toHaveLength(1);

      await http(app)
        .delete(`/api/manage/participants/${s.id('ana')}`)
        .set(auth(s.manageToken))
        .expect(204);

      await me(s.people.ana.participantToken).expect(404);
      const view = (await manage(s.manageToken)).body;
      expect(view.participants.map((p: { name: string }) => p.name)).toEqual([
        'Luis',
        'Marta',
        'Pablo',
      ]);
      expect(view.pairs).toEqual([]);
      expect(await storedKeys()).toEqual([]);
    });

    it('el expulsado puede volver con el mismo nombre (limitación aceptada)', async () => {
      const s = await setup();
      await http(app)
        .delete(`/api/manage/participants/${s.id('ana')}`)
        .set(auth(s.manageToken))
        .expect(204);
      await join(app, s.inviteCode, 'Ana');
    });

    it('no se puede expulsar a alguien de otra sala', async () => {
      const s = await setup();
      const other = await createRoom(app);
      await http(app)
        .delete(`/api/manage/participants/${s.id('ana')}`)
        .set(auth(other.manageToken))
        .expect(404);
      await me(s.people.ana.participantToken).expect(200);
    });

    it('salir libera el nombre y borra la pareja', async () => {
      const s = await setup();
      await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('marta'), s.id('pablo')] })
        .expect(201);
      await http(app)
        .delete('/api/me')
        .set(auth(s.people.marta.participantToken))
        .expect(204);
      await me(s.people.marta.participantToken).expect(404);
      expect((await manage(s.manageToken)).body.pairs).toEqual([]);
      await join(app, s.inviteCode, 'marta');
    });
  });

  describe('después del sorteo', () => {
    it('no se puede cambiar la sala, las parejas ni quién participa', async () => {
      const s = await setup();
      const pair = await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({ participantIds: [s.id('ana'), s.id('luis')] })
        .expect(201);
      await db.update(rooms).set({ status: 'drawn' });

      const org = auth(s.manageToken);
      const ana = auth(s.people.ana.participantToken);
      const attempts = [
        http(app).patch('/api/manage/room').set(org).send({ name: 'Otra' }),
        http(app)
          .put('/api/manage/pair-rule')
          .set(org)
          .send({ enabled: false }),
        http(app)
          .post('/api/manage/pairs')
          .set(org)
          .send({ participantIds: [s.id('marta'), s.id('pablo')] }),
        http(app).delete(`/api/manage/pairs/${pair.body.id}`).set(org),
        http(app)
          .delete(`/api/manage/participants/${s.id('marta')}`)
          .set(org),
        http(app).delete('/api/me').set(ana),
      ];
      for (const res of await Promise.all(attempts)) {
        expect(res.status).toBe(409);
        expect(res.body.error).toBe('ROOM_CLOSED');
      }
    });

    it('la lista de deseos se puede crear, cambiar y quitar', async () => {
      const s = await setup();
      await db.update(rooms).set({ status: 'drawn' });
      const ana = auth(s.people.ana.participantToken);
      await http(app)
        .put('/api/me/wishlist/link')
        .set(ana)
        .send({ url: 'https://ejemplo.com' })
        .expect(200);
      await http(app)
        .put('/api/me/wishlist/file')
        .set(ana)
        .attach('file', files.png, 'a.png')
        .expect(200);
      expect(await storedKeys()).toHaveLength(1);
      const seen = await http(app)
        .get('/api/me')
        .set(auth(s.people.luis.participantToken));
      expect(
        seen.body.participants.find((p: { name: string }) => p.name === 'Ana')
          .wishlist.kind,
      ).toBe('file');
      await http(app).delete('/api/me/wishlist').set(ana).expect(204);
      expect(await storedKeys()).toEqual([]);
    });
  });

  it('un participante no puede usar las rutas del organizador', async () => {
    const s = await setup();
    await http(app)
      .delete(`/api/manage/participants/${s.id('luis')}`)
      .set(auth(s.people.ana.participantToken))
      .expect(404);
    await http(app)
      .post('/api/manage/pairs')
      .set(auth(s.people.ana.participantToken))
      .send({ participantIds: [s.id('ana'), s.id('luis')] })
      .expect(404);
  });
});
