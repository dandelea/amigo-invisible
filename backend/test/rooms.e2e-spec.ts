import type { NestExpressApplication } from '@nestjs/platform-express';
import { eq, sql } from 'drizzle-orm';
import { type Db, DB } from '../src/db/db.module.js';
import { participants, rooms } from '../src/db/schema.js';
import { hashToken } from '../src/common/tokens.js';
import { todayInSpain } from '../src/rooms/dto.js';
import { createRoom, createTestApp, http, join, resetDb } from './helpers.js';

// Ninguna respuesta debe contener hashes de tokens ni campos internos.
function expectNoSecrets(body: unknown) {
  const json = JSON.stringify(body);
  expect(json).not.toMatch(/[0-9a-f]{64}/);
  expect(json).not.toMatch(/hash|nameKey|name_key|roomId|createdAt/i);
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('Salas (e2e)', () => {
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

  describe('crear sala', () => {
    it('devuelve los enlaces, guarda los datos limpios y solo el hash del token', async () => {
      const today = todayInSpain();
      const res = await http(app)
        .post('/api/rooms')
        .send({ name: '  Cena de   Navidad ', giftDate: today, budget: 15.5 })
        .expect(201);
      expect(res.body.inviteCode).toMatch(/^[A-Za-z0-9_-]{16}$/);
      expect(res.body.manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(res.body.room).toEqual({
        name: 'Cena de Navidad',
        giftDate: today,
        budget: 15.5,
        status: 'open',
        pairRuleEnabled: true,
      });
      const [row] = await db.select().from(rooms);
      expect(row.manageTokenHash).toBe(hashToken(res.body.manageToken));
      expect(JSON.stringify(row)).not.toContain(res.body.manageToken);
      expect(row.budgetCents).toBe(1550);
    });

    it('acepta una sala solo con nombre', async () => {
      const { room } = await createRoom(app, { name: 'Amigos' });
      expect(room).toMatchObject({ giftDate: null, budget: null });
    });

    it.each([
      ['nombre corto', { name: 'ab' }],
      ['nombre largo', { name: 'a'.repeat(61) }],
      ['nombre con HTML', { name: '<b>Sala</b>' }],
      ['sin nombre', {}],
      ['fecha pasada', { name: 'Sala', giftDate: '2020-01-01' }],
      ['fecha imposible', { name: 'Sala', giftDate: '2030-02-30' }],
      ['fecha a más de 2 años', { name: 'Sala', giftDate: '2099-01-01' }],
      ['fecha con formato raro', { name: 'Sala', giftDate: '20/12/2026' }],
      ['presupuesto 0', { name: 'Sala', budget: 0 }],
      ['presupuesto excesivo', { name: 'Sala', budget: 1001 }],
      ['presupuesto con 3 decimales', { name: 'Sala', budget: 1.234 }],
      ['presupuesto como texto', { name: 'Sala', budget: '15' }],
      ['campo desconocido', { name: 'Sala', status: 'drawn' }],
    ])('rechaza %s', async (_, body) => {
      const res = await http(app).post('/api/rooms').send(body).expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.message).toEqual(expect.any(String));
    });
  });

  describe('MAX_ROOMS', () => {
    let limited: NestExpressApplication;

    beforeAll(async () => {
      limited = await createTestApp({ MAX_ROOMS: '2' });
    });

    afterAll(async () => {
      await limited.close();
    });

    it('al llegar al tope no deja crear más salas', async () => {
      await http(limited)
        .get('/api/rooms/availability')
        .expect({ canCreateRoom: true });
      await createRoom(limited);
      await createRoom(limited);
      await http(limited)
        .get('/api/rooms/availability')
        .expect({ canCreateRoom: false });
      const res = await http(limited)
        .post('/api/rooms')
        .send({ name: 'Una más' })
        .expect(503);
      expect(res.body.error).toBe('MAX_ROOMS_REACHED');
    });
  });

  describe('invitación y unirse', () => {
    it('muestra el resumen público con los nombres en orden de llegada', async () => {
      const { inviteCode } = await createRoom(app);
      await join(app, inviteCode, 'Ana');
      await join(app, inviteCode, 'Luis');
      const res = await http(app)
        .get(`/api/invitations/${inviteCode}`)
        .expect(200);
      expect(res.body).toMatchObject({
        participantCount: 2,
        maxParticipants: 30,
        participantNames: ['Ana', 'Luis'],
        cannotJoinReason: null,
      });
      expectNoSecrets(res.body);
    });

    it.each(['AAAAAAAAAAAAAAAA', 'corto', '../../etc/passwd'])(
      'un código inexistente o mal formado da 404: %s',
      async (code) => {
        const res = await http(app).get(
          `/api/invitations/${encodeURIComponent(code)}`,
        );
        expect(res.status).toBe(404);
        expect(res.body.error).toBe('NOT_FOUND');
      },
    );

    it('unirse devuelve el token personal y limpia el nombre', async () => {
      const { inviteCode } = await createRoom(app);
      const body = await join(app, inviteCode, '  Luis   M. ');
      expect(body.participant.name).toBe('Luis M.');
      expect(body.participantToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const [row] = await db.select().from(participants);
      expect(row.tokenHash).toBe(hashToken(body.participantToken));
      expectNoSecrets(body.participant);
    });

    it.each(['ana', 'ANA', 'Aná', ' Ana '])(
      'rechaza «%s» si ya hay una Ana',
      async (name) => {
        const { inviteCode } = await createRoom(app);
        await join(app, inviteCode, 'Ana');
        const res = await http(app)
          .post(`/api/invitations/${inviteCode}/participants`)
          .send({ name })
          .expect(409);
        expect(res.body.error).toBe('NAME_TAKEN');
      },
    );

    it('«Peña» y «Pena» son nombres distintos', async () => {
      const { inviteCode } = await createRoom(app);
      await join(app, inviteCode, 'Peña');
      await join(app, inviteCode, 'Pena');
    });

    it('el mismo nombre vale en salas distintas', async () => {
      const a = await createRoom(app);
      const b = await createRoom(app);
      await join(app, a.inviteCode, 'Ana');
      await join(app, b.inviteCode, 'Ana');
    });

    it.each(['', '   ', 'Ana!', '<img src=x>', 'a'.repeat(31)])(
      'rechaza el nombre inválido «%s»',
      async (name) => {
        const { inviteCode } = await createRoom(app);
        const res = await http(app)
          .post(`/api/invitations/${inviteCode}/participants`)
          .send({ name })
          .expect(400);
        expect(res.body.error).toBe('VALIDATION_ERROR');
      },
    );

    it('con 30 participantes la sala está llena', async () => {
      const { inviteCode } = await createRoom(app);
      for (let i = 1; i <= 30; i++) await join(app, inviteCode, `Persona ${i}`);
      const res = await http(app)
        .post(`/api/invitations/${inviteCode}/participants`)
        .send({ name: 'Una más' })
        .expect(409);
      expect(res.body.error).toBe('ROOM_FULL');
      const summary = await http(app).get(`/api/invitations/${inviteCode}`);
      expect(summary.body).toMatchObject({
        participantCount: 30,
        participantNames: [],
        cannotJoinReason: 'ROOM_FULL',
      });
    });

    it('una sala sorteada está cerrada a nuevos participantes', async () => {
      const { inviteCode } = await createRoom(app);
      await join(app, inviteCode, 'Ana');
      await db.update(rooms).set({ status: 'drawn' });
      const res = await http(app)
        .post(`/api/invitations/${inviteCode}/participants`)
        .send({ name: 'Luis' })
        .expect(409);
      expect(res.body.error).toBe('ROOM_CLOSED');
      const summary = await http(app).get(`/api/invitations/${inviteCode}`);
      expect(summary.body).toMatchObject({
        participantNames: [],
        cannotJoinReason: 'ROOM_CLOSED',
      });
    });
  });

  describe('permisos', () => {
    async function setup() {
      const room = await createRoom(app);
      const ana = await join(app, room.inviteCode, 'Ana');
      await join(app, room.inviteCode, 'Luis');
      return { ...room, ana };
    }

    it('el participante ve la sala, a sí mismo y la lista', async () => {
      const { ana } = await setup();
      const res = await http(app)
        .get('/api/me')
        .set(auth(ana.participantToken))
        .expect(200);
      expect(res.body.me).toEqual(ana.participant);
      expect(
        res.body.participants.map((p: { name: string }) => p.name),
      ).toEqual(['Ana', 'Luis']);
      expect(res.body.room.name).toBe('Cena de Navidad');
      expectNoSecrets(res.body);
    });

    it('el organizador ve la sala, la invitación y la lista', async () => {
      const { manageToken, inviteCode } = await setup();
      const res = await http(app)
        .get('/api/manage')
        .set(auth(manageToken))
        .expect(200);
      expect(res.body.inviteCode).toBe(inviteCode);
      expect(res.body.participants).toHaveLength(2);
      expectNoSecrets(res.body);
    });

    it.each([
      ['sin cabecera', undefined],
      ['token mal formado', 'Bearer abc'],
      ['token inexistente', `Bearer ${'A'.repeat(43)}`],
      ['esquema distinto', `Basic ${'A'.repeat(43)}`],
    ])('%s da el 404 genérico', async (_, header) => {
      for (const path of ['/api/me', '/api/manage']) {
        const req = http(app).get(path);
        if (header) req.set('Authorization', header);
        const res = await req.expect(404);
        expect(res.body).toEqual({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'No encontrado',
        });
      }
    });

    it('un token de participante no sirve para gestionar, ni al revés', async () => {
      const { manageToken, ana } = await setup();
      await http(app)
        .get('/api/manage')
        .set(auth(ana.participantToken))
        .expect(404);
      await http(app).get('/api/me').set(auth(manageToken)).expect(404);
    });

    it('al borrar la sala se borra todo en cascada y los enlaces dejan de valer', async () => {
      const { manageToken, ana } = await setup();
      await db.delete(rooms);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(participants);
      expect(count).toBe(0);
      await http(app)
        .get('/api/me')
        .set(auth(ana.participantToken))
        .expect(404);
      await http(app).get('/api/manage').set(auth(manageToken)).expect(404);
    });

    it('el participante borrado deja de tener acceso', async () => {
      const { ana } = await setup();
      await db
        .delete(participants)
        .where(eq(participants.id, ana.participant.id));
      await http(app)
        .get('/api/me')
        .set(auth(ana.participantToken))
        .expect(404);
    });
  });
});
