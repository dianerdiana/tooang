import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordPolicyService } from './password-policy.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, PasswordPolicyService],
})
export class AuthModule {}
