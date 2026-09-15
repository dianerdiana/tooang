import { Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';

import type { Response } from 'express';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody, ZodHeader } from '@/common/decorators';

import {
  type CheckoutInput,
  checkoutSchema,
  type IdempotencyKey,
  idempotencyKeySchema,
} from './orders.schema';
import { OrdersService } from './orders.service';

@Controller('me/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSION.ORDER_CHECKOUT)
  async checkout(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodHeader('idempotency-key', idempotencyKeySchema) idempotencyKey: IdempotencyKey,
    @ZodBody(checkoutSchema) input: CheckoutInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.checkout(actor, idempotencyKey, input);
    response.status(result.status);
    return result.body;
  }
}
