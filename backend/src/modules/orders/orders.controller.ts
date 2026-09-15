import { Controller, Get, HttpCode, HttpStatus, Patch, Post, Res } from '@nestjs/common';

import type { Response } from 'express';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import {
  CurrentActor,
  RequirePermissions,
  ZodBody,
  ZodHeader,
  ZodParam,
  ZodQuery,
} from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { OrderQueriesService } from './order-queries.service';
import { OrderTransitionsService } from './order-transitions.service';
import {
  type CheckoutInput,
  checkoutSchema,
  type IdempotencyKey,
  idempotencyKeySchema,
  type ListMyOrdersInput,
  listMyOrdersSchema,
  type MyOrderStatusInput,
  myOrderStatusSchema,
  type OrderIdParam,
  orderIdParamSchema,
} from './orders.schema';
import { OrdersService } from './orders.service';

@Controller('me/orders')
export class OrdersController {
  constructor(
    private readonly service: OrdersService,
    private readonly queries: OrderQueriesService,
    private readonly transitions: OrderTransitionsService,
  ) {}

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

  @Get()
  @RequirePermissions(PERMISSION.ORDER_READ)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodQuery(listMyOrdersSchema) query: ListMyOrdersInput,
  ) {
    const result = await this.queries.listOwn(actor, query);
    return HttpResponse.success({
      message: 'Orders retrieved',
      data: { orders: result.orders },
      meta: result.meta,
    });
  }

  @Get(':orderId')
  @RequirePermissions(PERMISSION.ORDER_READ)
  async get(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(orderIdParamSchema) params: OrderIdParam,
  ) {
    const order = await this.queries.getOwn(actor, params.orderId);
    return HttpResponse.success({ message: 'Order retrieved', data: { order } });
  }

  @Patch(':orderId/status')
  @RequirePermissions(PERMISSION.ORDER_CANCEL)
  async updateStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(orderIdParamSchema) params: OrderIdParam,
    @ZodBody(myOrderStatusSchema) input: MyOrderStatusInput,
  ) {
    const order = await this.transitions.transitionOwn(actor, params.orderId, input);
    return HttpResponse.success({ message: 'Order status updated', data: { order } });
  }
}
