import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

import { HttpExceptionFilter } from './common/filters';
import { PermissionsGuard } from './common/guards';

import env from './config/env';

import { LibModule } from './lib';

import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { CartsModule } from './modules/carts/carts.module';
import { DataLifecycleModule } from './modules/data-lifecycle/data-lifecycle.module';
import { MediaModule } from './modules/media/media.module';
import { MenusModule } from './modules/menus/menus.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { RequestContextMiddleware } from './modules/observability/request-context.middleware';
import { OrdersModule } from './modules/orders/orders.module';
import { PlacesModule } from './modules/places/places.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [env],
    }),
    LibModule,
    ObservabilityModule,
    AuthModule,
    UsersModule,
    PlacesModule,
    MenusModule,
    CartsModule,
    DataLifecycleModule,
    OrdersModule,
    ReviewsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
