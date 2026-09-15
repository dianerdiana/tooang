import { Module } from '@nestjs/common';

import { OrderCodeService } from './order-code.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService, OrderCodeService],
})
export class OrdersModule {}
