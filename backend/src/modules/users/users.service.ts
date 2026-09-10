import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../lib';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.listUsers(10);
  }
}
