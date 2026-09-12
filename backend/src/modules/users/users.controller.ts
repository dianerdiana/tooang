import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Put } from '@nestjs/common';

import { type AuthenticatedUser, PlatformRoleEnum } from '@/common/auth';
import { CurrentUser, Roles, ZodBody, ZodParam, ZodQuery } from '@/common/decorators';
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
  async getMe(@CurrentUser() actor: AuthenticatedUser) {
    const user = await this.service.getMe(actor);
    return HttpResponse.success({ message: 'Profile retrieved', data: { user } });
  }

  @Patch()
  async updateMe(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodBody(updateMeSchema) input: UpdateMeInput,
  ) {
    const user = await this.service.updateMe(actor, input);
    return HttpResponse.success({ message: 'Profile updated', data: { user } });
  }

  @Post('account-deletion-requests')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestDeletion(@CurrentUser() actor: AuthenticatedUser) {
    const data = await this.service.requestDeletion(actor);
    return HttpResponse.success({ message: 'Account deletion request accepted', data });
  }
}

@Controller('users')
@Roles(PlatformRoleEnum.Admin, PlatformRoleEnum.SuperAdmin)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async list(@ZodQuery(listUsersSchema) query: ListUsersInput) {
    const result = await this.service.list(query);
    return HttpResponse.success({
      message: 'Users retrieved',
      data: { users: result.users },
      meta: result.meta,
    });
  }

  @Get(':userId')
  async get(@ZodParam(userIdParamSchema) params: UserIdParam) {
    const user = await this.service.get(params.userId);
    return HttpResponse.success({ message: 'User retrieved', data: { user } });
  }

  @Put(':userId/platform-role')
  @Roles(PlatformRoleEnum.SuperAdmin)
  async updatePlatformRole(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodParam(userIdParamSchema) params: UserIdParam,
    @ZodBody(platformRoleSchema) input: PlatformRoleInput,
  ) {
    const user = await this.service.updatePlatformRole(actor, params.userId, input);
    return HttpResponse.success({ message: 'Platform role updated', data: { user } });
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodParam(userIdParamSchema) params: UserIdParam,
  ) {
    const data = await this.service.deactivate(actor, params.userId);
    return HttpResponse.success({ message: 'User deactivated', data });
  }
}
