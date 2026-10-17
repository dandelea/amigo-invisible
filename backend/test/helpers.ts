import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { type Db, DB } from '../src/db/db.module.js';
import { configureApp, setupSwagger } from '../src/setup.js';

// Límites altos por defecto: cada test que los necesite los baja.
const TEST_ENV = {
  NODE_ENV: 'test',
  MAX_ROOMS: '1000',
  RATE_LIMIT_PER_MINUTE: '100000',
  RATE_LIMIT_CREATE_ROOM_PER_HOUR: '100000',
  RATE_LIMIT_JOIN_PER_MINUTE: '100000',
};

export async function createTestApp(
  env: Record<string, string> = {},
): Promise<NestExpressApplication> {
  Object.assign(process.env, TEST_ENV, env);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  setupSwagger(app);
  // Escucha en un puerto libre: supertest reutiliza el servidor (en vez de
  // abrir uno por petición) y los sockets pueden conectarse.
  await app.listen(0, '127.0.0.1');
  return app;
}

export const portOf = (app: NestExpressApplication): number =>
  (app.getHttpServer().address() as { port: number }).port;

export async function resetDb(app: NestExpressApplication): Promise<void> {
  await app.get<Db>(DB).execute(sql`truncate table rooms cascade`);
}

export const http = (app: NestExpressApplication) =>
  request(app.getHttpServer());

export async function createRoom(
  app: NestExpressApplication,
  body: Record<string, unknown> = { name: 'Cena de Navidad' },
) {
  const res = await http(app).post('/api/rooms').send(body).expect(201);
  return res.body as {
    inviteCode: string;
    manageToken: string;
    room: Record<string, unknown>;
  };
}

export async function join(
  app: NestExpressApplication,
  inviteCode: string,
  name: string,
) {
  const res = await http(app)
    .post(`/api/invitations/${inviteCode}/participants`)
    .send({ name })
    .expect(201);
  return res.body as {
    participantToken: string;
    participant: { id: string; name: string };
  };
}

// Conecta un cliente de Socket.IO a una app que escucha en un puerto.
export function connectSocket(
  port: number,
  auth: Record<string, unknown>,
): Socket {
  return io(`http://127.0.0.1:${port}/rooms`, {
    auth,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
}
