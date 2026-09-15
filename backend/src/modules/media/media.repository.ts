import { Injectable } from '@nestjs/common';

import { type MediaTargetType, Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type MediaDbClient = PrismaService | Prisma.TransactionClient;

const ASSET_SELECT = {
  id: true,
  imageKitFileId: true,
  deliveryUrl: true,
  deliveryPath: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  cleanupAttempts: true,
  cleanupRequestedAt: true,
  cleanupCompletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MediaAssetSelect;

const INTENT_SELECT = {
  id: true,
  actorUserId: true,
  placeId: true,
  menuItemId: true,
  target: true,
  expectedFileName: true,
  expectedFilePath: true,
  expectedMimeType: true,
  expectedSizeBytes: true,
  expiresAt: true,
  completedAt: true,
  completedAssetId: true,
  completedAsset: { select: ASSET_SELECT },
} satisfies Prisma.MediaUploadIntentSelect;

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveActor(actorId: string, db: MediaDbClient = this.prisma) {
    return db.user.findFirst({
      where: { id: actorId, deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      select: { id: true },
    });
  }

  findActiveMenuItem(placeId: string, menuItemId: string, db: MediaDbClient = this.prisma) {
    return db.menuItem.findFirst({
      where: { id: menuItemId, placeId, deletedAt: null },
      select: { id: true, imageAssetId: true },
    });
  }

  createIntent(
    data: {
      actorUserId: string;
      placeId: string;
      menuItemId?: string;
      target: MediaTargetType;
      providerTokenHash: string;
      expectedFileName: string;
      expectedFilePath: string;
      expectedMimeType: string;
      expectedSizeBytes: number;
      expiresAt: Date;
    },
    db: MediaDbClient,
  ) {
    return db.mediaUploadIntent.create({ data, select: { id: true, expiresAt: true } });
  }

  findIntent(intentId: string, actorUserId: string, db: MediaDbClient = this.prisma) {
    return db.mediaUploadIntent.findFirst({
      where: { id: intentId, actorUserId },
      select: INTENT_SELECT,
    });
  }

  createAsset(
    data: {
      imageKitFileId: string;
      deliveryUrl: string;
      deliveryPath: string;
      mimeType: string;
      sizeBytes: number;
    },
    db: MediaDbClient,
  ) {
    return db.mediaAsset.create({ data, select: ASSET_SELECT });
  }

  async switchAssociation(
    target: MediaTargetType,
    placeId: string,
    menuItemId: string | null,
    newAssetId: string,
    db: MediaDbClient,
  ): Promise<string | null> {
    if (target === 'PLACE_LOGO' || target === 'PLACE_COVER') {
      const place = await db.place.findFirst({
        where: { id: placeId, deletedAt: null },
        select: { logoAssetId: true, coverAssetId: true },
      });
      if (!place) return null;
      const oldId = target === 'PLACE_LOGO' ? place.logoAssetId : place.coverAssetId;
      await db.place.update({
        where: { id: placeId, deletedAt: null },
        data: target === 'PLACE_LOGO' ? { logoAssetId: newAssetId } : { coverAssetId: newAssetId },
      });
      return oldId;
    }
    if (!menuItemId) return null;
    const item = await this.findActiveMenuItem(placeId, menuItemId, db);
    if (!item) return null;
    await db.menuItem.update({
      where: { id: menuItemId, placeId, deletedAt: null },
      data: { imageAssetId: newAssetId },
    });
    return item.imageAssetId;
  }

  consumeIntent(intentId: string, assetId: string, completedAt: Date, db: MediaDbClient) {
    return db.mediaUploadIntent.update({
      where: { id: intentId, completedAt: null },
      data: { completedAt, completedAssetId: assetId },
      select: INTENT_SELECT,
    });
  }

  queueAsset(assetId: string, at: Date, db: MediaDbClient) {
    return db.mediaAsset.updateMany({
      where: { id: assetId, status: 'ACTIVE' },
      data: { status: 'PENDING_DELETE', cleanupRequestedAt: at, cleanupLastError: null },
    });
  }

  async detachAssociation(
    target: MediaTargetType,
    placeId: string,
    menuItemId: string | null,
    db: MediaDbClient,
  ): Promise<string | null | undefined> {
    if (target === 'PLACE_LOGO' || target === 'PLACE_COVER') {
      const place = await db.place.findFirst({
        where: { id: placeId, deletedAt: null },
        select: { logoAssetId: true, coverAssetId: true },
      });
      if (!place) return undefined;
      const oldId = target === 'PLACE_LOGO' ? place.logoAssetId : place.coverAssetId;
      if (oldId) {
        await db.place.update({
          where: { id: placeId, deletedAt: null },
          data: target === 'PLACE_LOGO' ? { logoAssetId: null } : { coverAssetId: null },
        });
      }
      return oldId;
    }
    if (!menuItemId) return undefined;
    const item = await this.findActiveMenuItem(placeId, menuItemId, db);
    if (!item) return undefined;
    if (item.imageAssetId) {
      await db.menuItem.update({
        where: { id: menuItemId, placeId, deletedAt: null },
        data: { imageAssetId: null },
      });
    }
    return item.imageAssetId;
  }

  findAsset(assetId: string, db: MediaDbClient = this.prisma) {
    return db.mediaAsset.findUnique({ where: { id: assetId }, select: ASSET_SELECT });
  }

  listCleanupCandidates(limit: number) {
    return this.prisma.mediaAsset.findMany({
      where: { status: { in: ['PENDING_DELETE', 'DELETE_FAILED'] } },
      select: ASSET_SELECT,
      orderBy: [{ cleanupRequestedAt: 'asc' }, { id: 'asc' }],
      take: Math.max(limit * 4, limit),
    });
  }

  claimCleanup(
    assetId: string,
    status: 'PENDING_DELETE' | 'DELETE_FAILED',
    attempts: number,
    at: Date,
  ) {
    return this.prisma.mediaAsset.updateMany({
      where: { id: assetId, status, cleanupAttempts: attempts },
      data: { status: 'PENDING_DELETE', cleanupAttempts: { increment: 1 }, cleanupRequestedAt: at },
    });
  }

  completeCleanup(assetId: string, attempt: number, at: Date) {
    return this.prisma.mediaAsset.updateMany({
      where: { id: assetId, status: 'PENDING_DELETE', cleanupAttempts: attempt },
      data: { status: 'DELETED', cleanupCompletedAt: at, cleanupLastError: null },
    });
  }

  failCleanup(assetId: string, attempt: number, error: string) {
    return this.prisma.mediaAsset.updateMany({
      where: { id: assetId, status: 'PENDING_DELETE', cleanupAttempts: attempt },
      data: { status: 'DELETE_FAILED', cleanupLastError: error.slice(0, 500) },
    });
  }

  listExpiredIntents(now: Date, limit: number) {
    return this.prisma.mediaUploadIntent.findMany({
      where: { completedAt: null, expiresAt: { lt: now } },
      select: INTENT_SELECT,
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  deleteUnconsumedIntent(id: string) {
    return this.prisma.mediaUploadIntent.deleteMany({ where: { id, completedAt: null } });
  }

  listPersistedProviderIds() {
    return this.prisma.mediaAsset.findMany({ select: { imageKitFileId: true } });
  }

  listOutstandingProviderPaths(now: Date) {
    return this.prisma.mediaUploadIntent.findMany({
      where: { completedAt: null, expiresAt: { gte: now } },
      select: { expectedFilePath: true },
    });
  }
}
