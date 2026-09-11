import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';

import { UserRoleEnum, type UserTokenPayload } from '@/common/auth';
import { CurrentUser, Roles, ZodBody, ZodParam, ZodQuery } from '@/common/decorators';

import {
  type AssignRoleInput,
  assignRoleSchema,
  type ListUsersInput,
  listUsersSchema,
  type RevokeRoleParams,
  revokeRoleParamsSchema,
  type UpdateMeInput,
  updateMeSchema,
  type UserIdParams,
  userIdParamsSchema,
} from './users.schema';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() actor: UserTokenPayload) {
    return this.service.getMe(actor.userId);
  }

  @Patch('me')
  updateMe(@CurrentUser() actor: UserTokenPayload, @ZodBody(updateMeSchema) input: UpdateMeInput) {
    return this.service.updateMe(actor.userId, input);
  }

  @Get('users')
  @Roles(UserRoleEnum.SuperAdmin)
  list(@CurrentUser() actor: UserTokenPayload, @ZodQuery(listUsersSchema) query: ListUsersInput) {
    return this.service.list(actor.userId, query);
  }

  @Get('users/:userId')
  @Roles(UserRoleEnum.SuperAdmin)
  getById(
    @CurrentUser() actor: UserTokenPayload,
    @ZodParam(userIdParamsSchema) params: UserIdParams,
  ) {
    return this.service.getById(actor.userId, params.userId);
  }

  @Post('users/:userId/roles')
  @Roles(UserRoleEnum.SuperAdmin)
  assignRole(
    @CurrentUser() actor: UserTokenPayload,
    @ZodParam(userIdParamsSchema) params: UserIdParams,
    @ZodBody(assignRoleSchema) input: AssignRoleInput,
  ) {
    return this.service.assignRole(actor.userId, params.userId, input);
  }

  @Delete('users/:userId/roles/:role')
  @Roles(UserRoleEnum.SuperAdmin)
  revokeRole(
    @CurrentUser() actor: UserTokenPayload,
    @ZodParam(revokeRoleParamsSchema) params: RevokeRoleParams,
  ) {
    return this.service.revokeRole(actor.userId, params.userId, params.role);
  }

  @Delete('users/:userId')
  @Roles(UserRoleEnum.SuperAdmin)
  deactivate(
    @CurrentUser() actor: UserTokenPayload,
    @ZodParam(userIdParamsSchema) params: UserIdParams,
  ) {
    return this.service.deactivate(actor.userId, params.userId);
  }
}
