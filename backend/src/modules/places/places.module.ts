import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';

import { PlaceAccessService } from './place-access.service';
import { PlaceMembersController } from './place-members.controller';
import { PlaceMembersService } from './place-members.service';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';

@Module({
  imports: [AuditModule],
  controllers: [PlacesController, PlaceMembersController],
  providers: [PlaceAccessService, PlaceMembersService, PlacesRepository, PlacesService],
  exports: [PlaceAccessService],
})
export class PlacesModule {}
