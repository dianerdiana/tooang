import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION, type Permission } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';
import {
  PlaceAccessService,
  type ResolvedPlaceAccess,
} from '@/modules/places/place-access.service';

import { PrismaService } from '../../lib';

import { MenusRepository } from './menus.repository';
import type {
  CreateCategoryInput,
  CreateMenuItemInput,
  ListCategoriesInput,
  ListMenuItemsInput,
  PublicMenuInput,
  UpdateCategoryInput,
  UpdateMenuItemInput,
} from './menus.schema';
import { normalizeCategoryName } from './menus.schema';

@Injectable()
export class MenusService {
  constructor(
    private readonly repository: MenusRepository,
    private readonly access: PlaceAccessService,
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async listCategories(actor: AuthenticatedActor, placeId: string, input: ListCategoriesInput) {
    await this.access.assertPermission(actor, placeId, PERMISSION.MENU_UPDATE);
    const result = await this.repository.listCategories(placeId, input);
    return {
      categories: result.categories.map((category) => this.categoryResponse(category)),
      meta: this.meta(input, result.totalItems),
    };
  }

  async getCategory(actor: AuthenticatedActor, placeId: string, categoryId: string) {
    await this.access.assertPermission(actor, placeId, PERMISSION.MENU_UPDATE);
    const category = await this.repository.findCategory(placeId, categoryId);
    if (!category) throw new NotFoundException('Menu category not found');
    return this.categoryResponse(category);
  }

  createCategory(actor: AuthenticatedActor, placeId: string, input: CreateCategoryInput) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.MENU_CREATE,
      'MENU_CATEGORY_CREATED',
      Object.keys(input),
      async (tx) =>
        this.repository.createCategory(
          placeId,
          { ...input, normalizedName: normalizeCategoryName(input.name).toLowerCase() },
          tx,
        ),
    ).then((category) => this.categoryResponse(category));
  }

  updateCategory(
    actor: AuthenticatedActor,
    placeId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.MENU_UPDATE,
      'MENU_CATEGORY_UPDATED',
      Object.keys(input),
      async (tx) => {
        if (!(await this.repository.findCategory(placeId, categoryId, tx))) {
          throw new NotFoundException('Menu category not found');
        }
        const category = await this.repository.updateCategory(
          placeId,
          categoryId,
          {
            ...input,
            ...(input.name === undefined
              ? {}
              : { normalizedName: normalizeCategoryName(input.name).toLowerCase() }),
          },
          tx,
        );
        if (input.isActive === false) {
          await this.repository.deleteCategoryCartRows(placeId, categoryId, tx);
          await this.reconcilePlaceState(actor, placeId, tx);
        }
        return category;
      },
      categoryId,
    ).then((category) => this.categoryResponse(category));
  }

  removeCategory(actor: AuthenticatedActor, placeId: string, categoryId: string) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.MENU_DELETE,
      'MENU_CATEGORY_DELETED',
      ['isActive', 'deletedAt'],
      async (tx) => {
        if (!(await this.repository.findCategory(placeId, categoryId, tx))) {
          throw new NotFoundException('Menu category not found');
        }
        if ((await this.repository.countCategoryItems(placeId, categoryId, tx)) > 0) {
          throw new ConflictException('Menu category still contains menu items');
        }
        const category = await this.repository.deleteCategory(placeId, categoryId, new Date(), tx);
        await this.reconcilePlaceState(actor, placeId, tx);
        return category;
      },
      categoryId,
    ).then((category) => this.categoryResponse(category));
  }

  async listItems(actor: AuthenticatedActor, placeId: string, input: ListMenuItemsInput) {
    await this.access.assertPermission(actor, placeId, PERMISSION.MENU_UPDATE);
    const result = await this.repository.listItems(placeId, input);
    return {
      items: result.items.map((item) => this.itemResponse(item)),
      meta: this.meta(input, result.totalItems),
    };
  }

  async getItem(actor: AuthenticatedActor, placeId: string, menuItemId: string) {
    await this.access.assertPermission(actor, placeId, PERMISSION.MENU_UPDATE);
    const item = await this.repository.findItem(placeId, menuItemId);
    if (!item) throw new NotFoundException('Menu item not found');
    return this.itemResponse(item);
  }

  async publicMenu(placeId: string, input: PublicMenuInput) {
    const result = await this.repository.listPublic(placeId, input);
    if (!result) throw new NotFoundException('Place not found');
    const groups = new Map<
      string,
      {
        categoryId: string;
        name: string;
        sortOrder: number;
        items: ReturnType<MenusService['publicItemResponse']>[];
      }
    >();
    for (const item of result.items) {
      const group = groups.get(item.categoryId) ?? {
        categoryId: item.category.id,
        name: item.category.name,
        sortOrder: item.category.sortOrder,
        items: [],
      };
      group.items.push(this.publicItemResponse(item));
      groups.set(item.categoryId, group);
    }
    return { categories: [...groups.values()], meta: this.meta(input, result.totalItems) };
  }

  createItem(actor: AuthenticatedActor, placeId: string, input: CreateMenuItemInput) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.MENU_CREATE,
      'MENU_ITEM_CREATED',
      Object.keys(input),
      async (tx) => {
        if (!(await this.repository.findCategory(placeId, input.categoryId, tx))) {
          throw new NotFoundException('Menu category not found');
        }
        return this.repository.createItem(
          placeId,
          { ...input, price: new Prisma.Decimal(input.price.toString()) },
          tx,
        );
      },
    ).then((item) => this.itemResponse(item));
  }

  updateItem(
    actor: AuthenticatedActor,
    placeId: string,
    menuItemId: string,
    input: UpdateMenuItemInput,
  ) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.MENU_UPDATE,
      'MENU_ITEM_UPDATED',
      Object.keys(input),
      async (tx) => {
        if (!(await this.repository.findItem(placeId, menuItemId, tx))) {
          throw new NotFoundException('Menu item not found');
        }
        if (
          input.categoryId &&
          !(await this.repository.findCategory(placeId, input.categoryId, tx))
        ) {
          throw new NotFoundException('Menu category not found');
        }
        const item = await this.repository.updateItem(
          placeId,
          menuItemId,
          {
            ...input,
            ...(input.price === undefined
              ? {}
              : { price: new Prisma.Decimal(input.price.toString()) }),
          },
          tx,
        );
        if (!item.isAvailable || !item.category.isActive) {
          await this.repository.deleteItemCartRows(placeId, menuItemId, tx);
        }
        await this.reconcilePlaceState(actor, placeId, tx);
        return item;
      },
      menuItemId,
    ).then((item) => this.itemResponse(item));
  }

  removeItem(actor: AuthenticatedActor, placeId: string, menuItemId: string) {
    return this.mutate(
      actor,
      placeId,
      PERMISSION.MENU_DELETE,
      'MENU_ITEM_DELETED',
      ['isAvailable', 'deletedAt'],
      async (tx) => {
        if (!(await this.repository.findItem(placeId, menuItemId, tx))) {
          throw new NotFoundException('Menu item not found');
        }
        const item = await this.repository.deleteItem(placeId, menuItemId, new Date(), tx);
        await this.repository.deleteItemCartRows(placeId, menuItemId, tx);
        await this.reconcilePlaceState(actor, placeId, tx);
        return item;
      },
      menuItemId,
    ).then((item) => this.itemResponse(item));
  }

  private async mutate<T extends { id: string }>(
    actor: AuthenticatedActor,
    placeId: string,
    permission: Permission,
    operation: string,
    changedFields: string[],
    mutation: (tx: Prisma.TransactionClient) => Promise<T>,
    targetId?: string,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const access = await this.access.assertPermission(actor, placeId, permission, tx);
          const result = await mutation(tx);
          await this.auditGlobal(
            actor,
            access,
            placeId,
            targetId ?? result.id,
            operation,
            changedFields,
            tx,
          );
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A menu category with that normalized name already exists');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Concurrent menu change; retry the request');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Menu resource not found');
      }
      throw error;
    }
  }

  private async reconcilePlaceState(
    actor: AuthenticatedActor,
    placeId: string,
    tx: Prisma.TransactionClient,
  ) {
    const state = await this.repository.findPlaceState(placeId, tx);
    if (!state) throw new NotFoundException('Place not found');
    const [publishable, available] = await Promise.all([
      this.repository.countEligibleItems(placeId, false, tx),
      this.repository.countEligibleItems(placeId, true, tx),
    ]);
    const isPublished = publishable === 0 ? false : state.isPublished;
    const isOrderingEnabled = available === 0 || !isPublished ? false : state.isOrderingEnabled;
    if (isPublished === state.isPublished && isOrderingEnabled === state.isOrderingEnabled) return;
    await this.repository.updatePlaceState(placeId, { isPublished, isOrderingEnabled }, tx);
    if (isOrderingEnabled !== state.isOrderingEnabled) {
      await this.audit.append(
        {
          actor: { kind: 'USER', userId: actor.id },
          action: 'ORDERING_SETTING_UPDATED',
          targetType: 'Place',
          targetId: placeId,
          beforeData: { isOrderingEnabled: state.isOrderingEnabled },
          afterData: { isOrderingEnabled },
        },
        tx,
      );
    }
  }

  private async auditGlobal(
    actor: AuthenticatedActor,
    access: ResolvedPlaceAccess,
    placeId: string,
    targetId: string,
    operation: string,
    changedFields: string[],
    tx: Prisma.TransactionClient,
  ) {
    if (access.source !== 'platform') return;
    await this.audit.append(
      {
        actor: { kind: 'USER', userId: actor.id },
        action: 'ADMIN_CROSS_PLACE_MUTATION',
        targetType: operation.startsWith('MENU_CATEGORY') ? 'MenuCategory' : 'MenuItem',
        targetId,
        afterData: { operation, permission: access.permission, placeId, changedFields },
      },
      tx,
    );
  }

  private meta(input: { page: number; limit: number }, totalItems: number) {
    return {
      page: input.page,
      limit: input.limit,
      totalItems,
      totalPages: Math.ceil(totalItems / input.limit),
    };
  }

  private categoryResponse(category: {
    id: string;
    placeId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      categoryId: category.id,
      placeId: category.placeId,
      name: category.name,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  private itemResponse(item: {
    id: string;
    placeId: string;
    categoryId: string;
    name: string;
    description: string | null;
    type: string;
    price: Prisma.Decimal;
    isAvailable: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    imageAsset: { status: string; deliveryUrl: string } | null;
  }) {
    return {
      menuItemId: item.id,
      placeId: item.placeId,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      type: item.type,
      price: item.price.toNumber(),
      isAvailable: item.isAvailable,
      sortOrder: item.sortOrder,
      imageUrl: item.imageAsset?.status === 'ACTIVE' ? item.imageAsset.deliveryUrl : null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private publicItemResponse(item: Parameters<MenusService['itemResponse']>[0]) {
    const {
      placeId: _placeId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...publicItem
    } = this.itemResponse(item);
    return publicItem;
  }
}
