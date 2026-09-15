import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthPrincipalService } from './auth-principal.service';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthRateLimitRepository } from './auth-rate-limit.repository';
import { AuthRateLimitService } from './auth-rate-limit.service';
import { PasswordPolicyService } from './password-policy.service';
import { RefreshCookieService } from './refresh-cookie.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthPrincipalService,
    AuthRepository,
    PasswordPolicyService,
    AuthRateLimitGuard,
    AuthRateLimitService,
    AuthRateLimitRepository,
    RefreshCookieService,
  ],
  exports: [AuthPrincipalService, AuthRateLimitGuard, AuthRateLimitService],
})
export class AuthModule {}
