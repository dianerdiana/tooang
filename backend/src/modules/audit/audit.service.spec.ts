import { BadRequestException } from '@nestjs/common';

import { jest } from '@jest/globals';

import type { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('passes safe records to the repository and preserves the transaction client', async () => {
    const repository = { append: jest.fn(() => Promise.resolve({ id: 'audit-id' })) };
    const service = new AuditService(repository as unknown as AuditRepository);
    const tx = {};
    await service.append(
      {
        actorUserId: 'actor',
        action: 'PLATFORM_ROLE_UPDATED',
        targetType: 'User',
        targetId: 'target',
        afterData: { platformRole: 'ADMIN' },
      },
      tx as never,
    );
    expect(repository.append).toHaveBeenCalledWith(expect.any(Object), tx);
  });

  it('rejects sensitive keys at any nesting depth', () => {
    const service = new AuditService({ append: jest.fn() } as unknown as AuditRepository);
    expect(() =>
      service.append({
        actorUserId: 'actor',
        action: 'USER_DEACTIVATED',
        targetType: 'User',
        targetId: 'target',
        afterData: { nested: { refreshToken: 'secret' } },
      }),
    ).toThrow(BadRequestException);
  });
});
