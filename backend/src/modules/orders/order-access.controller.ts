import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import {
  CurrentActor,
  Public,
  RequireAnyPermission,
  RequirePermissions,
  ZodBody,
  ZodParam,
  ZodQuery,
} from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { AuthRateLimit } from '@/modules/auth/auth-rate-limit';
import { AuthRateLimitGuard } from '@/modules/auth/auth-rate-limit.guard';

import { OrderQueriesService } from './order-queries.service';
import { OrderTransitionsService } from './order-transitions.service';
import { OrderVerificationService } from './order-verification.service';
import {
  type ListGlobalOrdersInput,
  listGlobalOrdersSchema,
  type ListPlaceOrdersInput,
  listPlaceOrdersSchema,
  type OperationalOrderStatusInput,
  operationalOrderStatusSchema,
  type OrderIdParam,
  orderIdParamSchema,
  type PlaceOrderCodeParam,
  placeOrderCodeParamSchema,
  type PlaceOrderParam,
  placeOrderParamSchema,
} from './orders.schema';

@Controller('places/:placeId/orders')
export class PlaceOrdersController {
  constructor(
    private readonly queries: OrderQueriesService,
    private readonly transitions: OrderTransitionsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSION.ORDER_READ)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeOrderParamSchema.pick({ placeId: true })) params: { placeId: string },
    @ZodQuery(listPlaceOrdersSchema) query: ListPlaceOrdersInput,
  ) {
    const result = await this.queries.listForPlace(actor, params.placeId, query);
    return HttpResponse.success({
      message: 'Orders retrieved',
      data: { orders: result.orders },
      meta: result.meta,
    });
  }

  @Get('by-code/:orderCode')
  @RequirePermissions(PERMISSION.ORDER_READ)
  @AuthRateLimit('order-code-lookup')
  @UseGuards(AuthRateLimitGuard)
  async getByCode(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeOrderCodeParamSchema) params: PlaceOrderCodeParam,
  ) {
    const order = await this.queries.getForPlaceByCode(actor, params.placeId, params.orderCode);
    return HttpResponse.success({ message: 'Order retrieved', data: { order } });
  }

  @Get(':orderId')
  @RequirePermissions(PERMISSION.ORDER_READ)
  async get(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeOrderParamSchema) params: PlaceOrderParam,
  ) {
    const order = await this.queries.getForPlace(actor, params.placeId, params.orderId);
    return HttpResponse.success({ message: 'Order retrieved', data: { order } });
  }

  @Patch(':orderId/status')
  @RequireAnyPermission(
    PERMISSION.ORDER_CANCEL,
    PERMISSION.ORDER_CONFIRM,
    PERMISSION.ORDER_PREPARE,
    PERMISSION.ORDER_READY,
    PERMISSION.ORDER_COMPLETE,
  )
  async updateStatus(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeOrderParamSchema) params: PlaceOrderParam,
    @ZodBody(operationalOrderStatusSchema) input: OperationalOrderStatusInput,
  ) {
    const order = await this.transitions.transitionForPlace(
      actor,
      params.placeId,
      params.orderId,
      input,
    );
    return HttpResponse.success({ message: 'Order status updated', data: { order } });
  }
}

@Controller('orders')
export class GlobalOrdersController {
  constructor(private readonly queries: OrderQueriesService) {}

  @Get()
  @RequirePermissions(PERMISSION.ORDER_READ)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodQuery(listGlobalOrdersSchema) query: ListGlobalOrdersInput,
  ) {
    const result = await this.queries.listGlobal(actor, query);
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
    const order = await this.queries.getGlobal(actor, params.orderId);
    return HttpResponse.success({ message: 'Order retrieved', data: { order } });
  }
}

@Controller('order-verifications')
export class OrderVerificationsController {
  constructor(private readonly verification: OrderVerificationService) {}

  @Get(':token')
  @Public()
  @AuthRateLimit('order-verification')
  @UseGuards(AuthRateLimitGuard)
  async verify(@Param('token') token: string) {
    const orderVerification = await this.verification.verify(token);
    return HttpResponse.success({
      message: 'Order verification retrieved',
      data: { orderVerification },
    });
  }
}
