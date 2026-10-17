import type { NestExpressApplication } from '@nestjs/platform-express';
import { createRoom, createTestApp, http, resetDb } from './helpers.js';

describe('Límite de peticiones (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp({
      RATE_LIMIT_PER_MINUTE: '20',
      RATE_LIMIT_CREATE_ROOM_PER_HOUR: '2',
      RATE_LIMIT_JOIN_PER_MINUTE: '2',
      TRUST_PROXY: '1',
    });
    await resetDb(app);
  });

  afterAll(async () => {
    await app.close();
  });

  // Cada test usa su propia IP (vía X-Forwarded-For, con trust proxy) para
  // no compartir contadores.
  const from = (ip: string) => ({ 'X-Forwarded-For': ip });

  it('crear sala tiene su propio límite por IP', async () => {
    for (let i = 0; i < 2; i++) {
      await http(app)
        .post('/api/rooms')
        .set(from('10.0.0.1'))
        .send({ name: `Sala ${i}` })
        .expect(201);
    }
    const res = await http(app)
      .post('/api/rooms')
      .set(from('10.0.0.1'))
      .send({ name: 'Otra' })
      .expect(429);
    expect(res.body.error).toBe('TOO_MANY_REQUESTS');
    expect(res.body.message).toMatch(/Demasiadas peticiones/);
    // Otra IP no se ve afectada.
    await http(app)
      .post('/api/rooms')
      .set(from('10.0.0.2'))
      .send({ name: 'Sala B' })
      .expect(201);
  });

  it('unirse tiene su propio límite por IP', async () => {
    const { inviteCode } = await createRoom(app);
    const url = `/api/invitations/${inviteCode}/participants`;
    await http(app)
      .post(url)
      .set(from('10.0.1.1'))
      .send({ name: 'Ana' })
      .expect(201);
    await http(app)
      .post(url)
      .set(from('10.0.1.1'))
      .send({ name: 'Luis' })
      .expect(201);
    await http(app)
      .post(url)
      .set(from('10.0.1.1'))
      .send({ name: 'Marta' })
      .expect(429);
  });

  it('el límite general cubre el resto de rutas', async () => {
    for (let i = 0; i < 20; i++) {
      await http(app).get('/health').set(from('10.0.2.1')).expect(200);
    }
    await http(app).get('/health').set(from('10.0.2.1')).expect(429);
    await http(app).get('/health').set(from('10.0.2.2')).expect(200);
  });
});
