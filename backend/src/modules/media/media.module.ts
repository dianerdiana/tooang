import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';
import { PlacesModule } from '@/modules/places/places.module';

import { MediaAssociationsController, MediaUploadIntentsController } from './media.controller';
import { MediaRepository } from './media.repository';
import { MediaService } from './media.service';
import { MediaCleanupService } from './media-cleanup.service';
import { MediaCleanupWorker } from './media-cleanup.worker';

@Module({
  imports: [AuditModule, PlacesModule],
  controllers: [MediaUploadIntentsController, MediaAssociationsController],
  providers: [MediaRepository, MediaCleanupService, MediaCleanupWorker, MediaService],
  exports: [MediaCleanupService],
})
export class MediaModule {}
