import type { NestExpressApplication } from '@nestjs/platform-express';
import { count, eq } from 'drizzle-orm';
import type { Socket } from 'socket.io-client';
import { type Db, DB } from '../src/db/db.module.js';
import { assignments, rooms } from '../src/db/schema.js';
import { ROOM_CHANGED } from '../src/realtime/realtime.gateway.js';
import {
  auth,
  connectSocket,
  createRoom,
  createTestApp,
  http,
  join,
  portOf,
  resetDb,
} from './helpers.js';

const NAMES = ['Ana', 'Luis', 'Marta', 'Pablo', 'Carla'];

describe('Sorteo (e2e)', () => {
  let app: NestExpressApplication;
  let db: Db;
  const sockets: Socket[] = [];

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

  afterEach(() => {
    sockets.splice(0).forEach((s) => s.disconnect());
  });

  async function setup(names = NAMES) {
    const room = await createRoom(app);
    const people: Record<string, Awaited<ReturnType<typeof join>>> = {};
    for (const name of names)
      people[name] = await join(app, room.inviteCode, name);
    return { ...room, people };
  }

  const draw = (manageToken: string) =>
    http(app).post('/api/manage/draw').set(auth(manageToken));
  const assignmentOf = (token: string) =>
    http(app).get('/api/me/assignment').set(auth(token));

  // Asignaciones guardadas: regalador → receptor.
  async function storedCycle(): Promise<Map<string, string>> {
    const rows = await db.select().from(assignments);
    return new Map(rows.map((r) => [r.giverId, r.receiverId]));
  }

  function expectSingleCycle(map: Map<string, string>, ids: string[]) {
    expect(map.size).toBe(ids.length);
    expect(new Set(map.values()).size).toBe(ids.length);
    let current = ids[0];
    for (let i = 1; i < ids.length; i++) {
      current = map.get(current)!;
      expect(current).not.toBe(ids[0]);
    }
    expect(map.get(current)).toBe(ids[0]);
  }

  describe('sortear', () => {
    it('crea un ciclo único, cierra la sala y cada uno ve solo lo suyo', async () => {
      const s = await setup();
      const res = await draw(s.manageToken).expect(200);
      expect(res.body).toEqual({ round: 1, seen: false });

      const ids = NAMES.map((n) => s.people[n].participant.id);
      const cycle = await storedCycle();
      expectSingleCycle(cycle, ids);

      for (const name of NAMES) {
        const me = s.people[name];
        const mine = await assignmentOf(me.participantToken).expect(200);
        expect(mine.body.receiver.id).toBe(cycle.get(me.participant.id));
        expect(mine.body).toMatchObject({ round: 1, seen: false });
      }

      const closed = await http(app)
        .post(`/api/invitations/${s.inviteCode}/participants`)
        .send({ name: 'Tarde' })
        .expect(409);
      expect(closed.body.error).toBe('ROOM_CLOSED');
    });

    it('respeta la regla de pareja', async () => {
      const s = await setup(['Ana', 'Luis', 'Marta', 'Pablo']);
      const [ana, luis, marta, pablo] = ['Ana', 'Luis', 'Marta', 'Pablo'].map(
        (n) => s.people[n].participant.id,
      );
      for (const [a, b] of [
        [ana, luis],
        [marta, pablo],
      ]) {
        await http(app)
          .post('/api/manage/pairs')
          .set(auth(s.manageToken))
          .send({ participantIds: [a, b] })
          .expect(201);
      }
      await draw(s.manageToken).expect(200);
      const cycle = await storedCycle();
      for (const [a, b] of [
        [ana, luis],
        [marta, pablo],
      ]) {
        expect(cycle.get(a)).not.toBe(b);
        expect(cycle.get(b)).not.toBe(a);
      }
    });

    it('avisa antes de sortear si no hay solución y no sortea', async () => {
      const s = await setup(['Ana', 'Luis', 'Marta']);
      await http(app)
        .post('/api/manage/pairs')
        .set(auth(s.manageToken))
        .send({
          participantIds: [
            s.people.Ana.participant.id,
            s.people.Luis.participant.id,
          ],
        })
        .expect(201);
      const view = await http(app)
        .get('/api/manage')
        .set(auth(s.manageToken))
        .expect(200);
      expect(view.body.draw.feasibility).toEqual({
        ok: false,
        code: 'NO_SOLUTION',
      });
      const res = await draw(s.manageToken).expect(409);
      expect(res.body.error).toBe('NO_SOLUTION');
      expect((await storedCycle()).size).toBe(0);

      // Con la regla desactivada sí se puede.
      await http(app)
        .put('/api/manage/pair-rule')
        .set(auth(s.manageToken))
        .send({ enabled: false })
        .expect(200);
      await draw(s.manageToken).expect(200);
    });

    it('exige al menos 3 participantes', async () => {
      const s = await setup(['Ana', 'Luis']);
      const res = await draw(s.manageToken).expect(409);
      expect(res.body.error).toBe('TOO_FEW_PARTICIPANTS');
    });

    it('un doble clic (o diez) sortea una sola vez', async () => {
      const s = await setup();
      const results = await Promise.all(
        Array.from({ length: 10 }, () => draw(s.manageToken)),
      );
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(results.every((r) => r.body.round === 1)).toBe(true);
      const [{ value }] = await db.select({ value: count() }).from(assignments);
      expect(value).toBe(NAMES.length);
      const before = await storedCycle();
      await draw(s.manageToken).expect(200);
      expect(await storedCycle()).toEqual(before);
    });

    it('sortear mientras alguien entra: todos los que están tienen asignación', async () => {
      const s = await setup(['Ana', 'Luis', 'Marta']);
      const results = await Promise.all([
        draw(s.manageToken),
        ...['Pablo', 'Carla', 'Sofía', 'Javi'].map((name) =>
          http(app)
            .post(`/api/invitations/${s.inviteCode}/participants`)
            .send({ name }),
        ),
      ]);
      expect(results[0].status).toBe(200);
      const joined = results.slice(1).filter((r) => r.status === 201).length;
      const closed = results
        .slice(1)
        .filter(
          (r) => r.status === 409 && r.body.error === 'ROOM_CLOSED',
        ).length;
      expect(joined + closed).toBe(4);
      const cycle = await storedCycle();
      expect(cycle.size).toBe(3 + joined);
    });
  });

  describe('vistos', () => {
    it('el organizador ve el contador y solo nombre y estado', async () => {
      const s = await setup();
      await draw(s.manageToken).expect(200);
      await http(app)
        .post('/api/me/assignment/seen')
        .set(auth(s.people.Ana.participantToken))
        .send({ round: 1 })
        .expect(204);
      const view = await http(app)
        .get('/api/manage')
        .set(auth(s.manageToken))
        .expect(200);
      expect(view.body.draw).toMatchObject({
        round: 1,
        seenCount: 1,
        total: 5,
      });
      expect(view.body.draw.seen).toContainEqual({ name: 'Ana', seen: true });
      expect(view.body.draw.seen).toContainEqual({ name: 'Luis', seen: false });
      for (const entry of view.body.draw.seen) {
        expect(Object.keys(entry).sort()).toEqual(['name', 'seen']);
      }
      const me = await assignmentOf(s.people.Ana.participantToken);
      expect(me.body.seen).toBe(true);
    });

    it('marcar visto una ronda que ya no es la actual no cuenta', async () => {
      const s = await setup();
      await draw(s.manageToken).expect(200);
      await http(app)
        .post('/api/manage/redraw')
        .set(auth(s.manageToken))
        .expect(200);
      await http(app)
        .post('/api/me/assignment/seen')
        .set(auth(s.people.Ana.participantToken))
        .send({ round: 1 })
        .expect(204);
      const view = await http(app).get('/api/manage').set(auth(s.manageToken));
      expect(view.body.draw.seenCount).toBe(0);
    });

    it('antes del sorteo no hay asignación', async () => {
      const s = await setup();
      const res = await assignmentOf(s.people.Ana.participantToken).expect(409);
      expect(res.body.error).toBe('NOT_DRAWN');
      await http(app)
        .post('/api/me/assignment/seen')
        .set(auth(s.people.Ana.participantToken))
        .send({ round: 1 })
        .expect(409);
    });
  });

  describe('repetir', () => {
    it('vuelve a sortear con los mismos, reinicia los vistos y sigue cerrada', async () => {
      const s = await setup();
      await draw(s.manageToken).expect(200);
      await http(app)
        .post('/api/me/assignment/seen')
        .set(auth(s.people.Ana.participantToken))
        .send({ round: 1 })
        .expect(204);
      const res = await http(app)
        .post('/api/manage/redraw')
        .set(auth(s.manageToken))
        .expect(200);
      expect(res.body.round).toBe(2);
      expectSingleCycle(
        await storedCycle(),
        NAMES.map((n) => s.people[n].participant.id),
      );
      const view = await http(app).get('/api/manage').set(auth(s.manageToken));
      expect(view.body.draw).toMatchObject({ round: 2, seenCount: 0 });
      const [room] = await db.select().from(rooms);
      expect(room.status).toBe('drawn');
    });

    it('no se puede repetir antes del primer sorteo', async () => {
      const s = await setup();
      const res = await http(app)
        .post('/api/manage/redraw')
        .set(auth(s.manageToken))
        .expect(409);
      expect(res.body.error).toBe('NOT_DRAWN');
    });

    it('repeticiones simultáneas dejan un ciclo válido', async () => {
      const s = await setup();
      await draw(s.manageToken).expect(200);
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          http(app).post('/api/manage/redraw').set(auth(s.manageToken)),
        ),
      );
      expect(results.map((r) => r.body.round).sort()).toEqual([2, 3, 4, 5, 6]);
      expectSingleCycle(
        await storedCycle(),
        NAMES.map((n) => s.people[n].participant.id),
      );
    });
  });

  describe('regenerar enlace', () => {
    it('el enlace anterior deja de valer y el nuevo ve la misma asignación', async () => {
      const s = await setup();
      await draw(s.manageToken).expect(200);
      const before = await assignmentOf(s.people.Ana.participantToken).expect(
        200,
      );
      const res = await http(app)
        .post(`/api/manage/participants/${s.people.Ana.participant.id}/token`)
        .set(auth(s.manageToken))
        .expect(200);
      expect(res.body.participantToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      await assignmentOf(s.people.Ana.participantToken).expect(404);
      await http(app)
        .get('/api/me')
        .set(auth(s.people.Ana.participantToken))
        .expect(404);
      const after = await assignmentOf(res.body.participantToken).expect(200);
      expect(after.body.receiver.id).toBe(before.body.receiver.id);
    });

    it('cierra el socket del enlace anterior', async () => {
      const s = await setup();
      const socket = connectSocket(portOf(app), {
        role: 'participant',
        token: s.people.Ana.participantToken,
      });
      sockets.push(socket);
      await new Promise<void>((resolve) => socket.once('connect', resolve));
      const closed = new Promise<string>((resolve) =>
        socket.once('disconnect', (reason) => resolve(reason)),
      );
      await http(app)
        .post(`/api/manage/participants/${s.people.Ana.participant.id}/token`)
        .set(auth(s.manageToken))
        .expect(200);
      expect(await closed).toBe('io server disconnect');
    });

    it('no se puede regenerar el de alguien de otra sala', async () => {
      const s = await setup();
      const other = await createRoom(app);
      await http(app)
        .post(`/api/manage/participants/${s.people.Ana.participant.id}/token`)
        .set(auth(other.manageToken))
        .expect(404);
      await assignmentOf(s.people.Ana.participantToken).expect(409);
    });
  });

  describe('secreto', () => {
    // Recorre todo lo que pueden pedir el organizador y cada participante y
    // comprueba que nadie recibe una asignación que no es la suya.
    it('ninguna respuesta expone asignaciones ajenas, tampoco al organizador', async () => {
      const s = await setup();
      await draw(s.manageToken).expect(200);
      const cycle = await storedCycle();
      const idToName = new Map(
        NAMES.map((n) => [s.people[n].participant.id, n]),
      );

      // Organizador: ni campos de asignación ni pares regalador → receptor.
      const org = await http(app).get('/api/manage').set(auth(s.manageToken));
      const orgJson = JSON.stringify(org.body);
      expect(orgJson).not.toMatch(/receiver|giver|assign/i);
      await assignmentOf(s.manageToken).expect(404);

      for (const name of NAMES) {
        const me = s.people[name];
        const view = await http(app)
          .get('/api/me')
          .set(auth(me.participantToken))
          .expect(200);
        expect(JSON.stringify(view.body)).not.toMatch(/receiver|giver|assign/i);
        expect(Object.keys(view.body.draw).sort()).toEqual(['round', 'seen']);

        const mine = await assignmentOf(me.participantToken).expect(200);
        const receiverId = cycle.get(me.participant.id)!;
        expect(mine.body.receiver).toMatchObject({
          id: receiverId,
          name: idToName.get(receiverId),
        });
        // Solo su receptor: ningún otro participante aparece en la respuesta.
        for (const otherId of idToName.keys()) {
          if (otherId === receiverId) continue;
          expect(JSON.stringify(mine.body)).not.toContain(otherId);
        }
      }
    });

    it('los avisos del socket por el sorteo no llevan datos', async () => {
      const s = await setup();
      const events: unknown[][] = [];
      for (const token of [s.manageToken, s.people.Ana.participantToken]) {
        const socket = connectSocket(portOf(app), {
          role: token === s.manageToken ? 'organizer' : 'participant',
          token,
        });
        sockets.push(socket);
        await new Promise<void>((resolve) => socket.once('connect', resolve));
        socket.on(ROOM_CHANGED, (...args: unknown[]) => events.push(args));
      }
      await draw(s.manageToken).expect(200);
      await http(app)
        .post('/api/manage/redraw')
        .set(auth(s.manageToken))
        .expect(200);
      await new Promise((r) => setTimeout(r, 300));
      expect(events.length).toBe(4);
      expect(events.every((args) => args.length === 0)).toBe(true);
    });
  });

  it('la sala borrada se lleva las asignaciones', async () => {
    const s = await setup();
    await draw(s.manageToken).expect(200);
    await db.delete(rooms).where(eq(rooms.inviteCode, s.inviteCode));
    expect((await storedCycle()).size).toBe(0);
  });
});
