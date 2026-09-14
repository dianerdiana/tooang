import { jest } from '@jest/globals';

import { PlatformRole } from '@/common/auth';

import { AuthRepository } from './auth.repository';
import { AuthPrincipalService } from './auth-principal.service';

describe('AuthPrincipalService', () => {
  const activeUser = {
    id: 'internal-id',
    userId: 'usr_123',
    platformRole: PlatformRole.ADMIN,
    deletedAt: null,
    deletionRequestedAt: null,
    anonymizedAt: null,
  };

  function serviceFor(candidate: unknown) {
    const findPrincipalCandidate = jest.fn(() => Promise.resolve(candidate));
    const repository = {
      findPrincipalCandidate,
    } as unknown as AuthRepository;
    return { service: new AuthPrincipalService(repository), findPrincipalCandidate };
  }

  it('constructs a minimal immutable actor from current server-side state', async () => {
    const { service, findPrincipalCandidate } = serviceFor(activeUser);

    const actor = await service.resolveActiveActor(activeUser.userId);

    expect(findPrincipalCandidate).toHaveBeenCalledWith(activeUser.userId);
    expect(actor).toEqual({
      id: activeUser.id,
      userId: activeUser.userId,
      platformRole: PlatformRole.ADMIN,
    });
    expect(Object.isFrozen(actor)).toBe(true);
    expect(actor).not.toHaveProperty('deletedAt');
    expect(actor).not.toHaveProperty('deletionRequestedAt');
    expect(actor).not.toHaveProperty('anonymizedAt');
  });

  it.each([
    ['missing', null],
    ['deleted', { ...activeUser, deletedAt: new Date() }],
    ['deletion pending', { ...activeUser, deletionRequestedAt: new Date() }],
    ['anonymized', { ...activeUser, anonymizedAt: new Date() }],
    ['unknown role', { ...activeUser, platformRole: 'ROOT' }],
  ])('rejects a %s principal candidate', async (_label, candidate) => {
    const { service } = serviceFor(candidate);
    await expect(service.resolveActiveActor(activeUser.userId)).resolves.toBeNull();
  });
});
