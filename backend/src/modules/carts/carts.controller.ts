import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody, ZodParam } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import {
  type AddCartItemInput,
  addCartItemSchema,
  type CartItemParam,
  cartItemParamSchema,
  type CartPlaceParam,
  cartPlaceParamSchema,
  type UpdateCartItemInput,
  updateCartItemSchema,
} from './carts.schema';
import { CartsService } from './carts.service';

@Controller('me/carts/:placeId')
@RequirePermissions(PERMISSION.CART_MANAGE)
export class CartsController {
  constructor(private readonly service: CartsService) {}

  @Get()
  async get(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(cartPlaceParamSchema) params: CartPlaceParam,
  ) {
    const cart = await this.service.get(actor, params.placeId);
    return HttpResponse.success({ message: 'Cart retrieved', data: { cart } });
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  async add(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(cartPlaceParamSchema) params: CartPlaceParam,
    @ZodBody(addCartItemSchema) input: AddCartItemInput,
  ) {
    const cart = await this.service.add(actor, params.placeId, input);
    return HttpResponse.success({ message: 'Cart item added', data: { cart } });
  }

  @Patch('items/:menuItemId')
  async update(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(cartItemParamSchema) params: CartItemParam,
    @ZodBody(updateCartItemSchema) input: UpdateCartItemInput,
  ) {
    const cart = await this.service.update(actor, params.placeId, params.menuItemId, input);
    return HttpResponse.success({ message: 'Cart item updated', data: { cart } });
  }

  @Delete('items/:menuItemId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(cartItemParamSchema) params: CartItemParam,
  ) {
    const cart = await this.service.remove(actor, params.placeId, params.menuItemId);
    return HttpResponse.success({ message: 'Cart item removed', data: { cart } });
  }
}
