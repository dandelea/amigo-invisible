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

  it('envía cabeceras de seguridad y CORS solo para el frontend', async () => {
    const res = await http(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    const other = await http(app)
      .get('/health')
      .set('Origin', 'https://otra-web.example')
      .expect(200);
    // Con un origen fijo, CORS responde siempre con el del frontend: el
    // navegador de otra web ve que no es el suyo y bloquea la respuesta.
    expect(other.headers['access-control-allow-origin']).not.toBe(
      'https://otra-web.example',
    );
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
