import { Controller, Delete, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';

import type { AuthenticatedUser } from '@/common/auth';
import { CurrentUser, ZodBody, ZodParam } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { PlaceMembersService } from './place-members.service';
import {
  type PlaceIdParam,
  placeIdParamSchema,
  type PlaceMemberParam,
  placeMemberParamSchema,
  type PlaceMemberRoleInput,
  placeMemberRoleSchema,
} from './places.schema';

@Controller('places/:placeId/members')
export class PlaceMembersController {
  constructor(private readonly service: PlaceMembersService) {}

  @Get()
  async list(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
  ) {
    const members = await this.service.list(actor, params.placeId);
    return HttpResponse.success({ message: 'Place members retrieved', data: { members } });
  }

  @Put(':userId')
  async setRole(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodParam(placeMemberParamSchema) params: PlaceMemberParam,
    @ZodBody(placeMemberRoleSchema) input: PlaceMemberRoleInput,
  ) {
    const member = await this.service.setRole(actor, params.placeId, params.userId, input.role);
    return HttpResponse.success({ message: 'Place membership updated', data: { member } });
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodParam(placeMemberParamSchema) params: PlaceMemberParam,
  ) {
    const member = await this.service.revoke(actor, params.placeId, params.userId);
    return HttpResponse.success({ message: 'Place membership revoked', data: { member } });
  }
}
