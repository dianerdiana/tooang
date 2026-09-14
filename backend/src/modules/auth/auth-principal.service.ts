import { Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '@/common/auth';

import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthPrincipalService {
  constructor(private readonly repository: AuthRepository) {}

  async resolve(userId: string): Promise<AuthenticatedUser | null> {
    return this.repository.findActivePrincipal(userId);
  }
}
