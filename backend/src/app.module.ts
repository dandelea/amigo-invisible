import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth/auth.service.js';
import { HttpThrottlerGuard, rateLimitOptions } from './common/rate-limit.js';
import { ENV, EnvModule } from './config/env.module.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { RealtimeGateway } from './realtime/realtime.gateway.js';
import { RoomsController } from './rooms/rooms.controller.js';
import { RoomsService } from './rooms/rooms.service.js';

@Module({
  imports: [
    EnvModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: rateLimitOptions,
    }),
    DbModule,
  ],
  controllers: [HealthController, RoomsController],
  providers: [
    AuthService,
    RealtimeGateway,
    RoomsService,
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
})
export class AppModule {}
