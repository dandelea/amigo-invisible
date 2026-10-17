import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

// Adaptador de Socket.IO con el mismo origen CORS que la API. Los clientes
// no envían datos por el socket, así que el tamaño máximo de mensaje es
// pequeño.
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin },
      maxHttpBufferSize: 10_000,
    } as ServerOptions);
  }
}
