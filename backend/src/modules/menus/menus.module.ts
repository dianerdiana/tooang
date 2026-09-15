import { Module } from '@nestjs/common';

import { AuditModule } from '@/modules/audit/audit.module';
import { PlacesModule } from '@/modules/places/places.module';

import {
  MenuCategoriesController,
  MenuItemsController,
  PublicMenuController,
} from './menus.controller';
import { MenusRepository } from './menus.repository';
import { MenusService } from './menus.service';

@Module({
  imports: [AuditModule, PlacesModule],
  controllers: [MenuCategoriesController, MenuItemsController, PublicMenuController],
  providers: [MenusRepository, MenusService],
  exports: [MenusRepository],
})
export class MenusModule {}
