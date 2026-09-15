import { Injectable } from '@nestjs/common';

import { ImageKitService, WinstonLoggerService } from '../../lib';

import { MediaRepository } from './media.repository';

const MINUTE = 60_000;
const LEASE_MS = 5 * MINUTE;

@Injectable()
export class MediaCleanupService {
  constructor(
    private readonly repository: MediaRepository,
    private readonly imageKit: ImageKitService,
    private readonly logger: WinstonLoggerService,
  ) {}

  async runBatch(limit = 25, now = new Date()): Promise<number> {
    if (!this.imageKit.enabled) return 0;
    const candidates = await this.repository.listCleanupCandidates(limit);
    let processed = 0;
    for (const asset of candidates) {
      if (processed >= limit || !this.isDue(asset, now)) continue;
      if (await this.processAsset(asset.id, now)) processed += 1;
    }
    return processed;
  }

  async processAsset(assetId: string, now = new Date()): Promise<boolean> {
    const asset = await this.repository.findAsset(assetId);
    if (!asset || !['PENDING_DELETE', 'DELETE_FAILED'].includes(asset.status)) return false;
    if (!this.isDue(asset, now)) return false;
    const claimed = await this.repository.claimCleanup(
      asset.id,
      asset.status as 'PENDING_DELETE' | 'DELETE_FAILED',
      asset.cleanupAttempts,
      now,
    );
    if (claimed.count !== 1) return false;
    const attempt = asset.cleanupAttempts + 1;
    try {
      await this.imageKit.deleteFile(asset.imageKitFileId);
      await this.repository.completeCleanup(asset.id, attempt, new Date());
      this.logger.log('Media provider deletion completed', {
        assetId: asset.id,
        operation: 'delete',
        attempt,
        status: 'DELETED',
      });
    } catch (error) {
      const category = this.imageKit.providerErrorCategory(error);
      await this.repository.failCleanup(asset.id, attempt, category);
      this.logger.warn('Media provider deletion failed', {
        assetId: asset.id,
        operation: 'delete',
        attempt,
        status: 'DELETE_FAILED',
        providerCategory: category,
        alert: attempt >= 5,
      });
    }
    return true;
  }

  async reconcileExpiredIntents(limit = 25, now = new Date()): Promise<number> {
    if (!this.imageKit.enabled) return 0;
    const intents = await this.repository.listExpiredIntents(now, limit);
    let reconciled = 0;
    for (const intent of intents) {
      try {
        const slash = intent.expectedFilePath.lastIndexOf('/');
        const folder = intent.expectedFilePath.slice(0, slash) || '/';
        const files = await this.imageKit.listFiles(folder, 100);
        const uploaded = files.find((file) => file.filePath === intent.expectedFilePath);
        if (uploaded?.fileId) await this.imageKit.deleteFile(uploaded.fileId);
        const removed = await this.repository.deleteUnconsumedIntent(intent.id);
        if (removed.count === 1) reconciled += 1;
      } catch (error) {
        this.logger.warn('Expired media upload intent reconciliation failed', {
          intentId: intent.id,
          operation: 'reconcile_expired_intent',
          providerCategory: this.imageKit.providerErrorCategory(error),
        });
      }
    }
    return reconciled;
  }

  async reconcileProviderFolder(
    limit = 100,
    skip = 0,
  ): Promise<{ removed: number; scanned: number }> {
    if (!this.imageKit.enabled) return { removed: 0, scanned: 0 };
    const [providerFiles, persisted, outstanding] = await Promise.all([
      this.imageKit.listFiles(this.imageKit.uploadFolder, limit, skip),
      this.repository.listPersistedProviderIds(),
      this.repository.listOutstandingProviderPaths(new Date()),
    ]);
    const known = new Set(persisted.map((asset) => asset.imageKitFileId));
    const reservedPaths = new Set(outstanding.map((intent) => intent.expectedFilePath));
    let removed = 0;
    for (const file of providerFiles) {
      if (
        !file.fileId ||
        known.has(file.fileId) ||
        (file.filePath && reservedPaths.has(file.filePath))
      )
        continue;
      await this.imageKit.deleteFile(file.fileId);
      removed += 1;
    }
    return { removed, scanned: providerFiles.length };
  }

  private isDue(
    asset: {
      status: string;
      cleanupAttempts: number;
      cleanupRequestedAt: Date | null;
      updatedAt: Date;
    },
    now: Date,
  ): boolean {
    if (asset.status === 'PENDING_DELETE') {
      const leaseStartedAt = asset.cleanupRequestedAt ?? asset.updatedAt;
      return asset.cleanupAttempts === 0 || leaseStartedAt.getTime() <= now.getTime() - LEASE_MS;
    }
    const delay = Math.min(24 * 60 * MINUTE, MINUTE * 2 ** Math.max(asset.cleanupAttempts - 1, 0));
    return asset.updatedAt.getTime() + delay <= now.getTime();
  }
}
