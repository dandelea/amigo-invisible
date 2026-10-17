import {
  type OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service.js';

// Tiempo real con Socket.IO. Los eventos solo avisan y no llevan datos: al
// recibir `room:changed` (o al reconectar), el cliente vuelve a pedir el
// estado por HTTP, que ya filtra lo que puede ver cada rol. Así ningún
// evento puede filtrar datos ajenos.
//
// El cliente se conecta al namespace /rooms con
// `auth: { role: 'organizer' | 'participant', token }`. El token va en el
// handshake, nunca en la URL.

export const ROOM_CHANGED = 'room:changed';

export const roomChannel = (roomId: string) => `room:${roomId}`;
export const participantChannel = (participantId: string) =>
  `participant:${participantId}`;

export interface SocketData {
  role: 'organizer' | 'participant';
  roomId: string;
  participantId?: string;
}

@WebSocketGateway({ namespace: '/rooms' })
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer() private readonly server: Namespace;

  constructor(private readonly auth: AuthService) {}

  afterInit(server: Namespace): void {
    // Un middleware que rechaza la conexión hace que el cliente reciba
    // `connect_error` y no reintente solo con un token inválido.
    server.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        () => next(new Error('NOT_FOUND')),
      );
    });
  }

  notifyRoomChanged(roomId: string): void {
    this.server.to(roomChannel(roomId)).emit(ROOM_CHANGED);
  }

  private async authenticate(socket: Socket): Promise<void> {
    const { role, token } = (socket.handshake.auth ?? {}) as Record<
      string,
      unknown
    >;
    let data: SocketData;
    if (role === 'organizer') {
      const room = await this.auth.roomByManageToken(token);
      if (!room) throw new Error('NOT_FOUND');
      data = { role, roomId: room.id };
    } else if (role === 'participant') {
      const found = await this.auth.participantByToken(token);
      if (!found) throw new Error('NOT_FOUND');
      data = {
        role,
        roomId: found.room.id,
        participantId: found.participant.id,
      };
    } else {
      throw new Error('NOT_FOUND');
    }
    socket.data = data;
    await socket.join(roomChannel(data.roomId));
    if (data.participantId) {
      await socket.join(participantChannel(data.participantId));
    }
  }
}
