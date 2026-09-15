import { jest } from '@jest/globals';

import { DataLifecycleService } from './data-lifecycle.service';

describe('DataLifecycleService', () => {
  const now = new Date('2026-09-15T00:00:00.000Z');
  const count = (value = 1) => Promise.resolve({ count: value });

  it('anonymizes one eligible user and appends a safe SYSTEM audit in its transaction', async () => {
    const tx = { transaction: true };
    const prisma = { $transaction: jest.fn((callback: (db: object) => unknown) => callback(tx)) };
    const repository = {
      lockDueUser: jest.fn(() =>
        Promise.resolve({ id: 'internal-user', userId: 'public-user', deletionRequestedAt: now }),
      ),
      deleteCarts: jest.fn(() => count()),
      deleteRefreshSessions: jest.fn(() => count()),
      deleteIdempotencyKeys: jest.fn(() => count()),
      deleteUnconsumedUploadIntents: jest.fn(() => count()),
      anonymizePlaceReviews: jest.fn(() => count()),
      anonymizeMenuItemReviews: jest.fn(() => count()),
      anonymizeOrderItems: jest.fn(() => count()),
      anonymizeOrders: jest.fn(() => count()),
      anonymizeUser: jest.fn(() => Promise.resolve({ id: 'internal-user' })),
    };
    const audit = {
      append: jest.fn<(event: unknown, db: unknown) => Promise<void>>(() => Promise.resolve()),
    };
    const service = new DataLifecycleService(
      prisma as never,
      repository as never,
      audit as never,
      { warn: jest.fn() } as never,
    );

    await expect(service.anonymizeUser('internal-user', now)).resolves.toBe(true);
    expect(repository.anonymizeUser).toHaveBeenCalledWith('internal-user', now, tx);
    expect(audit.append).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: { kind: 'SYSTEM', id: 'account-anonymization-worker' },
        targetId: 'public-user',
      }),
      tx,
    );
    expect(JSON.stringify(audit.append.mock.calls[0]?.[0])).toContain('ANONYMIZED');
    expect(JSON.stringify(audit.append.mock.calls[0]?.[0])).not.toContain('email');
  });

  it('treats an ineligible or already-anonymized locked user as a no-op', async () => {
    const prisma = { $transaction: jest.fn((callback: (db: object) => unknown) => callback({})) };
    const repository = { lockDueUser: jest.fn(() => Promise.resolve(null)) };
    const audit = { append: jest.fn() };
    const service = new DataLifecycleService(
      prisma as never,
      repository as never,
      audit as never,
      { warn: jest.fn() } as never,
    );
    await expect(service.anonymizeUser('internal-user', now)).resolves.toBe(false);
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('rolls back the anonymization transaction when audit persistence fails', async () => {
    const tx = {};
    const prisma = { $transaction: jest.fn((callback: (db: object) => unknown) => callback(tx)) };
    const repository = {
      lockDueUser: jest.fn(() => Promise.resolve({ id: 'internal-user', userId: 'public-user' })),
      deleteCarts: jest.fn(() => count(0)),
      deleteRefreshSessions: jest.fn(() => count(0)),
      deleteIdempotencyKeys: jest.fn(() => count(0)),
      deleteUnconsumedUploadIntents: jest.fn(() => count(0)),
      anonymizePlaceReviews: jest.fn(() => count(0)),
      anonymizeMenuItemReviews: jest.fn(() => count(0)),
      anonymizeOrderItems: jest.fn(() => count(0)),
      anonymizeOrders: jest.fn(() => count(0)),
      anonymizeUser: jest.fn(() => Promise.resolve({ id: 'internal-user' })),
    };
    const service = new DataLifecycleService(
      prisma as never,
      repository as never,
      { append: jest.fn(() => Promise.reject(new Error('audit failed'))) } as never,
      { warn: jest.fn() } as never,
    );
    await expect(service.anonymizeUser('internal-user', now)).rejects.toThrow('audit failed');
  });
});
