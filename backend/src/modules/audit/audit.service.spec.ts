import { jest } from '@jest/globals';

import type { AuditRepository } from './audit.repository';
import { AuditService, UnsafeAuditDataError } from './audit.service';

describe('AuditService', () => {
  it('passes safe records to the repository and preserves the transaction client', async () => {
    const repository = { append: jest.fn(() => Promise.resolve({ id: 'audit-id' })) };
    const service = new AuditService(repository as unknown as AuditRepository);
    const tx = {};
    await service.append(
      {
        actor: { kind: 'USER', userId: 'actor' },
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
        actor: { kind: 'USER', userId: 'actor' },
        action: 'USER_DEACTIVATED',
        targetType: 'User',
        targetId: 'target',
        afterData: { nested: { refreshToken: 'secret' } },
      }),
    ).toThrow(UnsafeAuditDataError);
  });

  it('appends SYSTEM batches with no synthetic user actor', async () => {
    const repository = { appendMany: jest.fn(() => Promise.resolve({ count: 1 })) };
    const service = new AuditService(repository as unknown as AuditRepository);
    const tx = {};
    await service.appendMany(
      [
        {
          actor: { kind: 'SYSTEM', id: 'retention-cleanup-worker' },
          action: 'RETENTION_CLEANUP_COMPLETED',
          targetType: 'DataRetentionJob',
          targetId: 'audit-logs',
          afterData: { deletedCount: 2 },
        },
      ],
      tx as never,
    );
    expect(repository.appendMany).toHaveBeenCalledWith(
      [expect.objectContaining({ actorType: 'SYSTEM', systemActor: 'retention-cleanup-worker' })],
      tx,
    );
  });
});
