import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';

import { BusinessHoursController } from './business-hours.controller';
import { BusinessHoursService } from './business-hours.service';
import { DiningTablesController } from './dining-tables.controller';
import { DiningTablesService } from './dining-tables.service';
import { PlaceAccessService } from './place-access.service';
import { PlaceMembersController } from './place-members.controller';
import { PlaceMembersService } from './place-members.service';
import { PlaceOpeningStateService } from './place-opening-state.service';
import { PlacesController } from './places.controller';
import { PlacesRepository } from './places.repository';
import { PlacesService } from './places.service';

@Module({
  imports: [AuditModule],
  controllers: [
    PlacesController,
    PlaceMembersController,
    BusinessHoursController,
    DiningTablesController,
  ],
  providers: [
    PlaceAccessService,
    PlaceMembersService,
    PlacesRepository,
    PlacesService,
    BusinessHoursService,
    DiningTablesService,
    PlaceOpeningStateService,
  ],
  exports: [PlaceAccessService, PlaceOpeningStateService],
})
export class PlacesModule {}
