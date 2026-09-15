import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { MediaService } from './media.service';

describe('MediaService', () => {
  const actor = { id: 'actor-internal', userId: 'usr_1', platformRole: 'ADMIN' as const };
  const expiresAt = new Date(Date.now() + 60_000);
  const intent = {
    id: 'intent-id',
    actorUserId: actor.id,
    placeId: 'place-id',
    menuItemId: null,
    target: 'PLACE_LOGO' as const,
    expectedFileName: 'expected.png',
    expectedFilePath: '/tooang/places/place-id/logo/expected.png',
    expectedMimeType: 'image/png',
    expectedSizeBytes: 123,
    expiresAt,
    completedAt: null,
    completedAssetId: null,
    completedAsset: null,
  };
  const remote = {
    fileId: 'provider-id',
    fileType: 'image',
    name: intent.expectedFileName,
    filePath: intent.expectedFilePath,
    mime: 'image/png',
    size: 123,
    url: 'https://ik.imagekit.io/account/tooang/places/place-id/logo/expected.png',
  };
  let repository: Record<string, jest.Mock>;
  let access: { assertPermission: jest.Mock };
  let imageKit: Record<string, unknown>;
  let cleanup: { processAsset: jest.Mock };
  let audit: { append: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: { warn: jest.Mock };
  let service: MediaService;

  beforeEach(() => {
    repository = {
      findIntent: jest.fn().mockResolvedValue(intent),
      findActiveActor: jest.fn().mockResolvedValue({ id: actor.id }),
      findActiveMenuItem: jest.fn().mockResolvedValue({ id: 'menu-item' }),
      createAsset: jest.fn().mockResolvedValue({ id: 'asset-new', deliveryUrl: remote.url }),
      switchAssociation: jest.fn().mockResolvedValue('asset-old'),
      queueAsset: jest.fn().mockResolvedValue({ count: 1 }),
      consumeIntent: jest.fn().mockResolvedValue({}),
      createIntent: jest.fn().mockResolvedValue({ id: 'new-intent', expiresAt }),
    };
    access = {
      assertPermission: jest.fn().mockResolvedValue({
        source: 'platform',
        resourceScope: 'global',
        permission: 'media.upload',
      }),
    };
    imageKit = {
      enabled: true,
      urlEndpoint: 'https://ik.imagekit.io/account',
      uploadFolder: '/tooang',
      getFile: jest.fn().mockResolvedValue(remote),
      deleteFile: jest.fn().mockResolvedValue('deleted'),
      providerErrorCategory: jest.fn().mockReturnValue('provider_rejected'),
      authorize: jest.fn().mockReturnValue({
        token: 'client-token',
        signature: 'signature',
        expire: 123,
        publicKey: 'public_key',
        uploadUrl: 'https://upload.imagekit.io/api/v1/files/upload',
      }),
    };
    cleanup = { processAsset: jest.fn().mockResolvedValue(true) };
    audit = { append: jest.fn().mockResolvedValue({}) };
    prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => Promise.resolve(callback({}))),
    };
    logger = { warn: jest.fn() };
    service = new MediaService(
      repository as never,
      access as never,
      imageKit as never,
      cleanup as never,
      audit as never,
      prisma as never,
      logger as never,
    );
  });

  it('creates a target-bound five-minute authorization without exposing private configuration', async () => {
    const result = await service.createIntent(actor, {
      target: 'PLACE_LOGO',
      placeId: 'place-id',
      mimeType: 'image/png',
      sizeBytes: 123,
    });
    expect(result).toEqual(
      expect.objectContaining({
        intentId: 'new-intent',
        token: 'client-token',
        publicKey: 'public_key',
        useUniqueFileName: false,
      }),
    );
    expect(result).not.toHaveProperty('privateKey');
    expect(repository.createIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: actor.id,
        target: 'PLACE_LOGO',
        expectedMimeType: 'image/png',
        expectedSizeBytes: 123,
      }),
      expect.anything(),
    );
    const persisted = repository.createIntent.mock.calls[0][0] as {
      providerTokenHash: string;
    };
    expect(persisted.providerTokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hides foreign or deleted menu-item targets before persisting an intent', async () => {
    repository.findActiveMenuItem.mockResolvedValue(null);
    await expect(
      service.createIntent(actor, {
        target: 'MENU_ITEM_IMAGE',
        placeId: 'place-id',
        menuItemId: 'foreign-item',
        mimeType: 'image/png',
        sizeBytes: 123,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(repository.createIntent).not.toHaveBeenCalled();
  });

  it('verifies remotely before the serializable association transaction and cleans up after commit', async () => {
    await expect(service.complete(actor, intent.id, 'provider-id')).resolves.toEqual({
      imageUrl: remote.url,
    });
    expect((imageKit.getFile as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$transaction.mock.invocationCallOrder[0],
    );
    expect(cleanup.processAsset).toHaveBeenCalledWith('asset-old');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('returns the consumed result without another provider call or transaction', async () => {
    repository.findIntent.mockResolvedValue({
      ...intent,
      completedAt: new Date(),
      completedAsset: { deliveryUrl: 'https://ik.imagekit.io/account/existing.png' },
    });
    await expect(service.complete(actor, intent.id, 'ignored')).resolves.toEqual({
      imageUrl: 'https://ik.imagekit.io/account/existing.png',
    });
    expect(imageKit.getFile).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects mismatched provider metadata without persisting it', async () => {
    (imageKit.getFile as jest.Mock).mockResolvedValue({ ...remote, mime: 'image/svg+xml' });
    await expect(service.complete(actor, intent.id, 'provider-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns 503 while ImageKit is disabled', async () => {
    imageKit.enabled = false;
    await expect(service.complete(actor, intent.id, 'provider-id')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
