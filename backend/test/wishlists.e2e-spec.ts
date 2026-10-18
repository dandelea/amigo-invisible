import type { NestExpressApplication } from '@nestjs/platform-express';
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

describe('Listas de deseos (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  async function setup() {
    const room = await createRoom(app);
    const ana = await join(app, room.inviteCode, 'Ana');
    const luis = await join(app, room.inviteCode, 'Luis');
    return { room, ana, luis };
  }

  const wishlistOf = async (viewerToken: string, name: string) => {
    const res = await http(app)
      .get('/api/me')
      .set(auth(viewerToken))
      .expect(200);
    return res.body.participants.find((p: { name: string }) => p.name === name)
      .wishlist;
  };

  const upload = (token: string, buf: Buffer, name: string) =>
    http(app)
      .put('/api/me/wishlist/file')
      .set(auth(token))
      .attach('file', buf, name);

  describe('enlace', () => {
    it('guarda un enlace https que ven todos', async () => {
      const { ana, luis } = await setup();
      const res = await http(app)
        .put('/api/me/wishlist/link')
        .set(auth(ana.participantToken))
        .send({ url: 'https://ejemplo.com/mi-lista?x=1' })
        .expect(200);
      expect(res.body).toEqual({
        kind: 'link',
        url: 'https://ejemplo.com/mi-lista?x=1',
        fileName: null,
        fileType: null,
        fileSize: null,
      });
      expect(await wishlistOf(luis.participantToken, 'Ana')).toEqual(res.body);
      expect(await wishlistOf(luis.participantToken, 'Luis')).toBeNull();
    });

    it.each([
      'http://ejemplo.com',
      'javascript:alert(1)',
      'ftp://ejemplo.com/lista',
      'https://usuario:clave@ejemplo.com',
      'https://localhost',
      'no es un enlace',
      `https://ejemplo.com/${'a'.repeat(2000)}`,
    ])('rechaza «%s»', async (url) => {
      const { ana } = await setup();
      const res = await http(app)
        .put('/api/me/wishlist/link')
        .set(auth(ana.participantToken))
        .send({ url })
        .expect(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('archivo', () => {
    it('sube un PNG, lo guarda bajo la sala y no expone la clave', async () => {
      const { ana, luis } = await setup();
      const res = await upload(
        ana.participantToken,
        files.png,
        '../mis regalos.png',
      ).expect(200);
      expect(res.body).toEqual({
        kind: 'file',
        url: null,
        fileName: 'mis regalos.png',
        fileType: 'PNG',
        fileSize: files.png.length,
      });
      const keys = await storedKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatch(
        new RegExp(
          `^rooms/[0-9a-f-]{36}/${ana.participant.id}/[0-9a-f]{16}\\.png$`,
        ),
      );
      const seen = await http(app)
        .get('/api/me')
        .set(auth(luis.participantToken));
      expect(JSON.stringify(seen.body)).not.toContain(keys[0]);
    });

    it('corrige la extensión según el tipo real', async () => {
      const { ana } = await setup();
      const res = await upload(
        ana.participantToken,
        files.pdf,
        'lista.png',
      ).expect(200);
      expect(res.body).toMatchObject({
        fileName: 'lista.pdf',
        fileType: 'PDF',
      });
    });

    it('rechaza un archivo que no es lo que dice su extensión', async () => {
      const { ana } = await setup();
      const res = await upload(
        ana.participantToken,
        files.fakePng,
        'foto.png',
      ).expect(415);
      expect(res.body.error).toBe('UNSUPPORTED_FILE_TYPE');
      expect(await storedKeys()).toEqual([]);
    });

    it('acepta 5 MB justos y rechaza 5 MB y un byte', async () => {
      const { ana } = await setup();
      const fiveMb = Buffer.alloc(5 * 1024 * 1024);
      files.png.copy(fiveMb);
      await upload(ana.participantToken, fiveMb, 'grande.png').expect(200);
      const tooBig = Buffer.alloc(5 * 1024 * 1024 + 1);
      files.png.copy(tooBig);
      const res = await upload(
        ana.participantToken,
        tooBig,
        'enorme.png',
      ).expect(413);
      expect(res.body).toMatchObject({
        error: 'FILE_TOO_LARGE',
        message: 'El archivo pesa más de 5 MB',
      });
    });

    it('sin archivo responde FILE_REQUIRED', async () => {
      const { ana } = await setup();
      const res = await http(app)
        .put('/api/me/wishlist/file')
        .set(auth(ana.participantToken))
        .expect(400);
      expect(res.body.error).toBe('FILE_REQUIRED');
    });
  });

  describe('un único elemento', () => {
    it('subir un archivo nuevo borra el anterior', async () => {
      const { ana } = await setup();
      await upload(ana.participantToken, files.png, 'a.png').expect(200);
      const [first] = await storedKeys();
      await upload(ana.participantToken, files.pdf, 'b.pdf').expect(200);
      const keys = await storedKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).not.toBe(first);
      expect(keys[0]).toMatch(/\.pdf$/);
    });

    it('guardar un enlace borra el archivo anterior', async () => {
      const { ana } = await setup();
      await upload(ana.participantToken, files.png, 'a.png').expect(200);
      await http(app)
        .put('/api/me/wishlist/link')
        .set(auth(ana.participantToken))
        .send({ url: 'https://ejemplo.com' })
        .expect(200);
      expect(await storedKeys()).toEqual([]);
    });

    it('quitar la lista borra el archivo', async () => {
      const { ana, luis } = await setup();
      await upload(ana.participantToken, files.png, 'a.png').expect(200);
      await http(app)
        .delete('/api/me/wishlist')
        .set(auth(ana.participantToken))
        .expect(204);
      expect(await storedKeys()).toEqual([]);
      expect(await wishlistOf(luis.participantToken, 'Ana')).toBeNull();
      // Quitar sin tener lista no falla.
      await http(app)
        .delete('/api/me/wishlist')
        .set(auth(ana.participantToken))
        .expect(204);
    });
  });

  describe('descarga', () => {
    it('da una URL firmada que descarga el archivo como adjunto', async () => {
      const { ana, luis } = await setup();
      await upload(ana.participantToken, files.png, 'mis regalos ñ.png').expect(
        200,
      );
      const res = await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .set(auth(luis.participantToken))
        .expect(200);
      expect(res.body.expiresInSeconds).toBe(300);
      const download = await fetch(res.body.url);
      expect(download.status).toBe(200);
      expect(Buffer.from(await download.arrayBuffer())).toEqual(files.png);
      expect(download.headers.get('content-disposition')).toMatch(
        /^attachment; filename="mis regalos _.png"; filename\*=UTF-8''mis%20regalos%20%C3%B1\.png$/,
      );
    });

    it('la URL firmada no vale si se altera', async () => {
      const { ana, luis } = await setup();
      await upload(ana.participantToken, files.png, 'a.png').expect(200);
      const { body } = await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .set(auth(luis.participantToken));
      const tampered = body.url.replace(
        /X-Amz-Signature=[0-9a-f]+/,
        `X-Amz-Signature=${'0'.repeat(64)}`,
      );
      expect((await fetch(tampered)).status).toBe(403);
    });

    it('alguien de otra sala no puede pedir la descarga', async () => {
      const { ana } = await setup();
      await upload(ana.participantToken, files.png, 'a.png').expect(200);
      const other = await createRoom(app);
      const stranger = await join(app, other.inviteCode, 'Sofía');
      await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .set(auth(stranger.participantToken))
        .expect(404);
      // Ni el organizador de otra sala, ni sin token.
      await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .set(auth(other.manageToken))
        .expect(404);
      await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .expect(404);
    });

    it('si la lista es un enlace o no hay lista, no hay descarga', async () => {
      const { ana, luis } = await setup();
      await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .set(auth(luis.participantToken))
        .expect(404);
      await http(app)
        .put('/api/me/wishlist/link')
        .set(auth(ana.participantToken))
        .send({ url: 'https://ejemplo.com' });
      await http(app)
        .get(`/api/wishlists/${ana.participant.id}/file`)
        .set(auth(luis.participantToken))
        .expect(404);
    });
  });

  describe('límite de subidas', () => {
    let limited: NestExpressApplication;

    beforeAll(async () => {
      limited = await createTestApp({ RATE_LIMIT_UPLOAD_PER_HOUR: '2' });
    });

    afterAll(async () => {
      await limited.close();
    });

    it('limita las subidas por IP', async () => {
      const room = await createRoom(limited);
      const ana = await join(limited, room.inviteCode, 'Ana');
      const send = () =>
        http(limited)
          .put('/api/me/wishlist/file')
          .set(auth(ana.participantToken))
          .set('X-Forwarded-For', '10.9.9.9')
          .attach('file', files.png, 'a.png');
      await send().expect(200);
      await send().expect(200);
      await send().expect(429);
    });
  });
});
