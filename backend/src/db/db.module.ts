import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Env } from '../config/env.js';
import { ENV } from '../config/env.module.js';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export const DB = Symbol('DB');
const POOL = Symbol('POOL');

// Inyecta la base de datos con @InjectDb().
export const InjectDb = () => Inject(DB);

@Injectable()
class PoolCloser implements OnApplicationShutdown {
  constructor(@Inject(POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: POOL,
      inject: [ENV],
      // El pool no conecta hasta la primera consulta. Pocas conexiones,
      // porque la capa gratuita de Neon limita las simultáneas.
      useFactory: (env: Env) =>
        new Pool({
          connectionString: env.DATABASE_URL,
          max: 5,
        }),
    },
    {
      provide: DB,
      inject: [POOL],
      useFactory: (pool: Pool): Db => drizzle(pool, { schema }),
    },
    PoolCloser,
  ],
  exports: [DB],
})
export class DbModule {}
