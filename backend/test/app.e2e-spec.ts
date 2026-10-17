import type { NestExpressApplication } from '@nestjs/platform-express';
import { createTestApp, http } from './helpers.js';

describe('App (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde ok', () => {
    return http(app).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('una ruta inexistente devuelve el error uniforme', async () => {
    const res = await http(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: expect.any(String),
    });
  });

  it('sirve Swagger con el esquema de autenticación por token', async () => {
    const res = await http(app).get('/api/docs-json').expect(200);
    expect(res.body.components.securitySchemes.token).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });
    expect(res.body.components.schemas.ErrorResponseDto).toBeDefined();
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining([
        '/api/rooms',
        '/api/invitations/{code}/participants',
        '/api/me',
        '/api/manage',
      ]),
    );
  });
});
