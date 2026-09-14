import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody, ZodParam, ZodQuery } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import {
  type ListUsersInput,
  listUsersSchema,
  type PlatformRoleInput,
  platformRoleSchema,
  type UpdateMeInput,
  updateMeSchema,
  type UserIdParam,
  userIdParamSchema,
} from './users.schema';
import { UsersService } from './users.service';

@Controller('me')
export class MeController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSION.PROFILE_READ)
  async getMe(@CurrentActor() actor: AuthenticatedActor) {
    const user = await this.service.getMe(actor);
    return HttpResponse.success({ message: 'Profile retrieved', data: { user } });
  }

  @Patch()
  @RequirePermissions(PERMISSION.PROFILE_UPDATE)
  async updateMe(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodBody(updateMeSchema) input: UpdateMeInput,
  ) {
    const user = await this.service.updateMe(actor, input);
    return HttpResponse.success({ message: 'Profile updated', data: { user } });
  }

  @Post('account-deletion-requests')
  @RequirePermissions(PERMISSION.ACCOUNT_DELETION_REQUEST)
  @HttpCode(HttpStatus.ACCEPTED)
  async requestDeletion(@CurrentActor() actor: AuthenticatedActor) {
    const data = await this.service.requestDeletion(actor);
    return HttpResponse.success({ message: 'Account deletion request accepted', data });
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSION.USER_READ)
  async list(@ZodQuery(listUsersSchema) query: ListUsersInput) {
    const result = await this.service.list(query);
    return HttpResponse.success({
      message: 'Users retrieved',
      data: { users: result.users },
      meta: result.meta,
    });
  }

  @Get(':userId')
  @RequirePermissions(PERMISSION.USER_READ)
  async get(@ZodParam(userIdParamSchema) params: UserIdParam) {
    const user = await this.service.get(params.userId);
    return HttpResponse.success({ message: 'User retrieved', data: { user } });
  }

  @Put(':userId/platform-role')
  @RequirePermissions(PERMISSION.PLATFORM_ROLE_UPDATE)
  async updatePlatformRole(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(userIdParamSchema) params: UserIdParam,
    @ZodBody(platformRoleSchema) input: PlatformRoleInput,
  ) {
    const user = await this.service.updatePlatformRole(actor, params.userId, input);
    return HttpResponse.success({ message: 'Platform role updated', data: { user } });
  }

  @Delete(':userId')
  @RequirePermissions(PERMISSION.USER_DEACTIVATE)
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(userIdParamSchema) params: UserIdParam,
  ) {
    const data = await this.service.deactivate(actor, params.userId);
    return HttpResponse.success({ message: 'User deactivated', data });
  }
}
