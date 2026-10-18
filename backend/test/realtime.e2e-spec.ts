import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Socket } from 'socket.io-client';
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

function connected(socket: Socket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });
}

function rejected(socket: Socket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once('connect', () => reject(new Error('se conectó')));
    socket.once('connect_error', (err) => resolve(err.message));
  });
}

// Recoge los eventos room:changed con sus argumentos.
function record(socket: Socket): unknown[][] {
  const events: unknown[][] = [];
  socket.on(ROOM_CHANGED, (...args: unknown[]) => events.push(args));
  return events;
}

const settle = () => new Promise((r) => setTimeout(r, 300));

describe('Tiempo real (e2e)', () => {
  let app: NestExpressApplication;
  let port: number;
  const sockets: Socket[] = [];

  const open = (auth: Record<string, unknown>) => {
    const socket = connectSocket(port, auth);
    sockets.push(socket);
    return socket;
  };

  beforeAll(async () => {
    app = await createTestApp();
    port = portOf(app);
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

  it.each([
    ['sin credenciales', {}],
    ['rol desconocido', { role: 'admin', token: 'A'.repeat(43) }],
    ['token inválido', { role: 'organizer', token: 'A'.repeat(43) }],
    ['token mal formado', { role: 'participant', token: 'abc' }],
  ])('rechaza la conexión %s', async (_, auth) => {
    expect(await rejected(open(auth))).toBe('NOT_FOUND');
  });

  it('organizador y participantes reciben room:changed, sin datos, cuando alguien entra', async () => {
    const { inviteCode, manageToken } = await createRoom(app);
    const ana = await join(app, inviteCode, 'Ana');

    const organizer = open({ role: 'organizer', token: manageToken });
    const participant = open({
      role: 'participant',
      token: ana.participantToken,
    });
    await Promise.all([connected(organizer), connected(participant)]);
    const organizerEvents = record(organizer);
    const participantEvents = record(participant);

    await join(app, inviteCode, 'Luis');
    await settle();

    expect(organizerEvents).toEqual([[]]);
    expect(participantEvents).toEqual([[]]);
  });

  it('los cambios de una sala no llegan a otra', async () => {
    const a = await createRoom(app);
    const b = await createRoom(app);
    const other = open({ role: 'organizer', token: b.manageToken });
    await connected(other);
    const events = record(other);

    await join(app, a.inviteCode, 'Ana');
    await settle();

    expect(events).toEqual([]);
  });

  it('al expulsar a alguien se cierra su socket y los demás reciben el aviso', async () => {
    const { inviteCode, manageToken } = await createRoom(app);
    const ana = await join(app, inviteCode, 'Ana');
    const luis = await join(app, inviteCode, 'Luis');

    const anaSocket = open({
      role: 'participant',
      token: ana.participantToken,
    });
    const luisSocket = open({
      role: 'participant',
      token: luis.participantToken,
    });
    await Promise.all([connected(anaSocket), connected(luisSocket)]);
    const luisEvents = record(luisSocket);
    const anaDisconnected = new Promise<string>((resolve) =>
      anaSocket.once('disconnect', (reason) => resolve(reason)),
    );

    await http(app)
      .delete(`/api/manage/participants/${ana.participant.id}`)
      .set(auth(manageToken))
      .expect(204);

    expect(await anaDisconnected).toBe('io server disconnect');
    await settle();
    expect(luisEvents).toEqual([[]]);
    expect(luisSocket.connected).toBe(true);
  });

  it('marcar una pareja avisa a la sala', async () => {
    const { inviteCode, manageToken } = await createRoom(app);
    const ana = await join(app, inviteCode, 'Ana');
    const luis = await join(app, inviteCode, 'Luis');
    const socket = open({ role: 'participant', token: ana.participantToken });
    await connected(socket);
    const events = record(socket);
    await http(app)
      .post('/api/manage/pairs')
      .set(auth(manageToken))
      .send({ participantIds: [ana.participant.id, luis.participant.id] })
      .expect(201);
    await settle();
    expect(events).toEqual([[]]);
  });

  it('un participante que ya no existe no puede conectarse', async () => {
    const { inviteCode } = await createRoom(app);
    const ana = await join(app, inviteCode, 'Ana');
    await resetDb(app);
    expect(
      await rejected(
        open({ role: 'participant', token: ana.participantToken }),
      ),
    ).toBe('NOT_FOUND');
  });
});
