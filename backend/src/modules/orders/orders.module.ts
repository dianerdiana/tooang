import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PlacesModule } from '@/modules/places/places.module';

import {
  GlobalOrdersController,
  OrderVerificationsController,
  PlaceOrdersController,
} from './order-access.controller';
import { OrderCodeService } from './order-code.service';
import { OrderExpiryService } from './order-expiry.service';
import { OrderExpiryWorker } from './order-expiry.worker';
import { OrderQueriesService } from './order-queries.service';
import { OrderTransitionsService } from './order-transitions.service';
import { OrderVerificationService } from './order-verification.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuditModule, AuthModule, PlacesModule],
  controllers: [
    OrdersController,
    PlaceOrdersController,
    GlobalOrdersController,
    OrderVerificationsController,
  ],
  providers: [
    OrdersRepository,
    OrdersService,
    OrderCodeService,
    OrderQueriesService,
    OrderTransitionsService,
    OrderVerificationService,
    OrderExpiryService,
    OrderExpiryWorker,
  ],
})
export class OrdersModule {}
