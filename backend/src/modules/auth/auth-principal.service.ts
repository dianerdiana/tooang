import { Injectable } from '@nestjs/common';

import { type AuthenticatedActor, isPlatformRole } from '@/common/auth';

import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthPrincipalService {
  constructor(private readonly repository: AuthRepository) {}

  async resolveActiveActor(userId: string): Promise<AuthenticatedActor | null> {
    const user = await this.repository.findPrincipalCandidate(userId);
    if (
      !user ||
      user.deletedAt ||
      user.deletionRequestedAt ||
      user.anonymizedAt ||
      !isPlatformRole(user.platformRole)
    ) {
      return null;
    }

    return Object.freeze({
      id: user.id,
      userId: user.userId,
      platformRole: user.platformRole,
    });
  }
}
