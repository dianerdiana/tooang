import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import {
  CurrentActor,
  Public,
  RequirePermissions,
  ZodBody,
  ZodParam,
  ZodQuery,
} from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { type PlaceIdParam, placeIdParamSchema } from '@/modules/places/places.schema';

import {
  type CategoryParam,
  categoryParamSchema,
  type CreateCategoryInput,
  createCategorySchema,
  type CreateMenuItemInput,
  createMenuItemSchema,
  type ListCategoriesInput,
  listCategoriesSchema,
  type ListMenuItemsInput,
  listMenuItemsSchema,
  type MenuItemParam,
  menuItemParamSchema,
  type PublicMenuInput,
  publicMenuSchema,
  type UpdateCategoryInput,
  updateCategorySchema,
  type UpdateMenuItemInput,
  updateMenuItemSchema,
} from './menus.schema';
import { MenusService } from './menus.service';

@Controller('places/:placeId/menu-categories')
export class MenuCategoriesController {
  constructor(private readonly service: MenusService) {}

  @Get()
  @RequirePermissions(PERMISSION.MENU_UPDATE)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) p: PlaceIdParam,
    @ZodQuery(listCategoriesSchema) query: ListCategoriesInput,
  ) {
    const result = await this.service.listCategories(actor, p.placeId, query);
    return HttpResponse.success({
      message: 'Menu categories retrieved',
      data: { categories: result.categories },
      meta: result.meta,
    });
  }

  @Get(':categoryId')
  @RequirePermissions(PERMISSION.MENU_UPDATE)
  async get(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(categoryParamSchema) p: CategoryParam,
  ) {
    const category = await this.service.getCategory(actor, p.placeId, p.categoryId);
    return HttpResponse.success({ message: 'Menu category retrieved', data: { category } });
  }

  @Post()
  @RequirePermissions(PERMISSION.MENU_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) p: PlaceIdParam,
    @ZodBody(createCategorySchema) input: CreateCategoryInput,
  ) {
    const category = await this.service.createCategory(actor, p.placeId, input);
    return HttpResponse.success({ message: 'Menu category created', data: { category } });
  }

  @Patch(':categoryId')
  @RequirePermissions(PERMISSION.MENU_UPDATE)
  async update(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(categoryParamSchema) p: CategoryParam,
    @ZodBody(updateCategorySchema) input: UpdateCategoryInput,
  ) {
    const category = await this.service.updateCategory(actor, p.placeId, p.categoryId, input);
    return HttpResponse.success({ message: 'Menu category updated', data: { category } });
  }

  @Delete(':categoryId')
  @RequirePermissions(PERMISSION.MENU_DELETE)
  async remove(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(categoryParamSchema) p: CategoryParam,
  ) {
    const category = await this.service.removeCategory(actor, p.placeId, p.categoryId);
    return HttpResponse.success({ message: 'Menu category deleted', data: { category } });
  }
}

@Controller('places/:placeId/menu-items')
export class MenuItemsController {
  constructor(private readonly service: MenusService) {}

  @Get()
  @RequirePermissions(PERMISSION.MENU_UPDATE)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) p: PlaceIdParam,
    @ZodQuery(listMenuItemsSchema) query: ListMenuItemsInput,
  ) {
    const result = await this.service.listItems(actor, p.placeId, query);
    return HttpResponse.success({
      message: 'Menu items retrieved',
      data: { items: result.items },
      meta: result.meta,
    });
  }

  @Get(':menuItemId')
  @RequirePermissions(PERMISSION.MENU_UPDATE)
  async get(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(menuItemParamSchema) p: MenuItemParam,
  ) {
    const menuItem = await this.service.getItem(actor, p.placeId, p.menuItemId);
    return HttpResponse.success({ message: 'Menu item retrieved', data: { menuItem } });
  }

  @Post()
  @RequirePermissions(PERMISSION.MENU_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) p: PlaceIdParam,
    @ZodBody(createMenuItemSchema) input: CreateMenuItemInput,
  ) {
    const menuItem = await this.service.createItem(actor, p.placeId, input);
    return HttpResponse.success({ message: 'Menu item created', data: { menuItem } });
  }

  @Patch(':menuItemId')
  @RequirePermissions(PERMISSION.MENU_UPDATE)
  async update(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(menuItemParamSchema) p: MenuItemParam,
    @ZodBody(updateMenuItemSchema) input: UpdateMenuItemInput,
  ) {
    const menuItem = await this.service.updateItem(actor, p.placeId, p.menuItemId, input);
    return HttpResponse.success({ message: 'Menu item updated', data: { menuItem } });
  }

  @Delete(':menuItemId')
  @RequirePermissions(PERMISSION.MENU_DELETE)
  async remove(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(menuItemParamSchema) p: MenuItemParam,
  ) {
    const menuItem = await this.service.removeItem(actor, p.placeId, p.menuItemId);
    return HttpResponse.success({ message: 'Menu item deleted', data: { menuItem } });
  }
}

@Controller('places/:placeId/menu')
export class PublicMenuController {
  constructor(private readonly service: MenusService) {}

  @Get()
  @Public()
  async get(
    @ZodParam(placeIdParamSchema) p: PlaceIdParam,
    @ZodQuery(publicMenuSchema) query: PublicMenuInput,
  ) {
    const result = await this.service.publicMenu(p.placeId, query);
    return HttpResponse.success({
      message: 'Menu retrieved',
      data: { categories: result.categories },
      meta: result.meta,
    });
  }
}
