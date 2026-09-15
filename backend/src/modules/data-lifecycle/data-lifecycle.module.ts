import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';

import { DataLifecycleRepository } from './data-lifecycle.repository';
import { DataLifecycleService } from './data-lifecycle.service';
import { DataLifecycleWorker } from './data-lifecycle.worker';

@Module({
  imports: [AuditModule],
  providers: [DataLifecycleRepository, DataLifecycleService, DataLifecycleWorker],
})
export class DataLifecycleModule {}
