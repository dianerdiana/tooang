import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { AuthPrincipalService } from './auth-principal.service';
import { PasswordPolicyService } from './password-policy.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthPrincipalService, AuthRepository, PasswordPolicyService],
  exports: [AuthPrincipalService],
})
export class AuthModule {}
