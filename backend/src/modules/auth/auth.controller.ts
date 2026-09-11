import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import type { UserTokenPayload } from '@/common/auth';
import { CurrentUser, Public, ZodBody } from '@/common/decorators';

import {
  type LoginInput,
  loginSchema,
  type LogoutInput,
  logoutSchema,
  type RefreshInput,
  refreshSchema,
  type RegisterInput,
  registerSchema,
} from './auth.schema';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('register')
  @Public()
  register(@ZodBody(registerSchema) input: RegisterInput) {
    return this.service.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Public()
  login(@ZodBody(loginSchema) input: LoginInput) {
    return this.service.login(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Public()
  refresh(@ZodBody(refreshSchema) input: RefreshInput) {
    return this.service.refresh(input);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() actor: UserTokenPayload, @ZodBody(logoutSchema) input: LogoutInput) {
    return this.service.logout(actor.userId, input);
  }
}
