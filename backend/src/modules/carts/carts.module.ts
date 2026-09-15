import { Module } from '@nestjs/common';

import { CartsController } from './carts.controller';
import { CartsRepository } from './carts.repository';
import { CartsService } from './carts.service';

@Module({
  controllers: [CartsController],
  providers: [CartsRepository, CartsService],
  exports: [CartsService],
})
export class CartsModule {}
