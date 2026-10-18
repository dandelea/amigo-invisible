import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth/auth.service.js';
import { HttpThrottlerGuard, rateLimitOptions } from './common/rate-limit.js';
import { ENV, EnvModule } from './config/env.module.js';
import { DbModule } from './db/db.module.js';
import { AssignmentController } from './draw/assignment.controller.js';
import { DrawService } from './draw/draw.service.js';
import { HealthController } from './health/health.controller.js';
import { RealtimeGateway } from './realtime/realtime.gateway.js';
import { OrganizerController } from './organizer/organizer.controller.js';
import { OrganizerService } from './organizer/organizer.service.js';
import { MembershipService } from './rooms/membership.service.js';
import { RoomsController } from './rooms/rooms.controller.js';
import { RoomsService } from './rooms/rooms.service.js';
import { StorageService } from './storage/storage.service.js';
import { WishlistsController } from './wishlists/wishlists.controller.js';
import { WishlistsService } from './wishlists/wishlists.service.js';

@Module({
  imports: [
    EnvModule,
    ThrottlerModule.forRootAsync({
      inject: [ENV],
      useFactory: rateLimitOptions,
    }),
    DbModule,
  ],
  controllers: [
    HealthController,
    RoomsController,
    OrganizerController,
    WishlistsController,
    AssignmentController,
  ],
  providers: [
    AuthService,
    RealtimeGateway,
    RoomsService,
    MembershipService,
    OrganizerService,
    WishlistsService,
    StorageService,
    DrawService,
    { provide: APP_GUARD, useClass: HttpThrottlerGuard },
  ],
})
export class AppModule {}
