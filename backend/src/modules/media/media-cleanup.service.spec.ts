import { jest } from '@jest/globals';

import { MediaCleanupService } from './media-cleanup.service';

describe('MediaCleanupService', () => {
  const asset = {
    id: 'asset-internal',
    imageKitFileId: 'provider-file',
    status: 'PENDING_DELETE',
    cleanupAttempts: 0,
    cleanupRequestedAt: new Date('2026-09-14T00:00:00.000Z'),
    updatedAt: new Date('2026-09-14T00:00:00.000Z'),
  };
  let repository: Record<string, jest.Mock>;
  let imageKit: Record<string, unknown>;
  let logger: { log: jest.Mock; warn: jest.Mock };
  let service: MediaCleanupService;

  beforeEach(() => {
    repository = {
      findAsset: jest.fn().mockResolvedValue(asset),
      claimCleanup: jest.fn().mockResolvedValue({ count: 1 }),
      completeCleanup: jest.fn().mockResolvedValue({ count: 1 }),
      failCleanup: jest.fn().mockResolvedValue({ count: 1 }),
      listCleanupCandidates: jest.fn().mockResolvedValue([asset]),
      listExpiredIntents: jest.fn().mockResolvedValue([]),
      listPersistedProviderIds: jest.fn().mockResolvedValue([]),
      listOutstandingProviderPaths: jest.fn().mockResolvedValue([]),
    };
    imageKit = {
      enabled: true,
      uploadFolder: '/tooang',
      deleteFile: jest.fn().mockResolvedValue('deleted'),
      listFiles: jest.fn().mockResolvedValue([]),
      providerErrorCategory: jest.fn().mockReturnValue('transport'),
    };
    logger = { log: jest.fn(), warn: jest.fn() };
    service = new MediaCleanupService(repository as never, imageKit as never, logger as never);
  });

  it('claims before provider deletion and conditionally completes the matching attempt', async () => {
    await expect(service.processAsset(asset.id)).resolves.toBe(true);
    expect(repository.claimCleanup).toHaveBeenCalledWith(
      asset.id,
      'PENDING_DELETE',
      0,
      expect.any(Date),
    );
    expect(imageKit.deleteFile).toHaveBeenCalledWith('provider-file');
    expect(repository.completeCleanup).toHaveBeenCalledWith(asset.id, 1, expect.any(Date));
    expect(repository.failCleanup).not.toHaveBeenCalled();
    expect(repository.claimCleanup.mock.invocationCallOrder[0]).toBeLessThan(
      (imageKit.deleteFile as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('stores only a bounded provider category and alerts on the fifth failure', async () => {
    repository.findAsset.mockResolvedValue({
      ...asset,
      status: 'DELETE_FAILED',
      cleanupAttempts: 4,
      updatedAt: new Date(0),
    });
    (imageKit.deleteFile as jest.Mock).mockRejectedValue(new Error('private raw response'));
    await service.processAsset(asset.id, new Date('2026-09-14T00:00:00.000Z'));
    expect(repository.failCleanup).toHaveBeenCalledWith(asset.id, 5, 'transport');
    expect(logger.warn).toHaveBeenCalledWith(
      'Media provider deletion failed',
      expect.objectContaining({ attempt: 5, alert: true, providerCategory: 'transport' }),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('private raw response');
  });

  it('does not overwrite state when another worker wins the optimistic claim', async () => {
    repository.claimCleanup.mockResolvedValue({ count: 0 });
    await expect(service.processAsset(asset.id)).resolves.toBe(false);
    expect(imageKit.deleteFile).not.toHaveBeenCalled();
    expect(repository.completeCleanup).not.toHaveBeenCalled();
  });

  it('does not remove provider files reserved by live upload intents', async () => {
    (imageKit.listFiles as jest.Mock).mockResolvedValue([
      { fileId: 'in-flight', filePath: '/tooang/in-flight.png' },
      { fileId: 'orphan', filePath: '/tooang/orphan.png' },
    ]);
    repository.listOutstandingProviderPaths.mockResolvedValue([
      { expectedFilePath: '/tooang/in-flight.png' },
    ]);
    await expect(service.reconcileProviderFolder()).resolves.toEqual({ removed: 1, scanned: 2 });
    expect(imageKit.deleteFile).toHaveBeenCalledTimes(1);
    expect(imageKit.deleteFile).toHaveBeenCalledWith('orphan');
  });
});
