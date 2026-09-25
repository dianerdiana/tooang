import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/auth/auth.module';

import { MeController, UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [MeController, UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
