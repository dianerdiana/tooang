import { Module } from '@nestjs/common';

import { MeController, UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  controllers: [MeController, UsersController],
  providers: [UsersService, UsersRepository],
})
export class UsersModule {}
