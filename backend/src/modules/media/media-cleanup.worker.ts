import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { ImageKitService, WinstonLoggerService } from '../../lib';

import { MediaCleanupService } from './media-cleanup.service';

const WORK_INTERVAL_MS = 60_000;
const FOLDER_RECONCILIATION_TICKS = 60;

@Injectable()
export class MediaCleanupWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;
  private tick = 0;
  private folderSkip = 0;

  constructor(
    private readonly cleanup: MediaCleanupService,
    private readonly imageKit: ImageKitService,
    private readonly logger: WinstonLoggerService,
  ) {}

  onModuleInit(): void {
    if (!this.imageKit.enabled) return;
    this.timer = setInterval(() => void this.run(), WORK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.cleanup.runBatch();
      await this.cleanup.reconcileExpiredIntents();
      this.tick += 1;
      if (this.tick >= FOLDER_RECONCILIATION_TICKS) {
        this.tick = 0;
        const result = await this.cleanup.reconcileProviderFolder(100, this.folderSkip);
        this.folderSkip = result.removed > 0 || result.scanned < 100 ? 0 : this.folderSkip + 100;
      }
    } catch (error) {
      this.logger.error('Media cleanup worker cycle failed', undefined, {
        operation: 'media_cleanup_cycle',
        providerCategory: this.imageKit.providerErrorCategory(error),
      });
    } finally {
      this.running = false;
    }
  }
}
