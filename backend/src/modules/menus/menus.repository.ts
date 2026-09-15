import { Injectable } from '@nestjs/common';

import { type MenuItemType, Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type MenusDbClient = PrismaService | Prisma.TransactionClient;

const CATEGORY_SELECT = {
  id: true,
  placeId: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MenuCategorySelect;

const ITEM_SELECT = {
  id: true,
  placeId: true,
  categoryId: true,
  name: true,
  description: true,
  type: true,
  price: true,
  isAvailable: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, sortOrder: true, isActive: true } },
  imageAsset: { select: { status: true, deliveryUrl: true } },
} satisfies Prisma.MenuItemSelect;

type ItemFilters = {
  page: number;
  limit: number;
  type?: MenuItemType;
  categoryId?: string;
  isAvailable?: boolean;
};

@Injectable()
export class MenusRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(
    placeId: string,
    input: { page: number; limit: number; isActive?: boolean },
  ) {
    const where: Prisma.MenuCategoryWhereInput = {
      placeId,
      deletedAt: null,
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    };
    const [categories, totalItems] = await this.prisma.$transaction([
      this.prisma.menuCategory.findMany({
        where,
        select: CATEGORY_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.menuCategory.count({ where }),
    ]);
    return { categories, totalItems };
  }

  findCategory(placeId: string, categoryId: string, db: MenusDbClient = this.prisma) {
    return db.menuCategory.findFirst({
      where: { id: categoryId, placeId, deletedAt: null },
      select: CATEGORY_SELECT,
    });
  }

  createCategory(
    placeId: string,
    data: { name: string; normalizedName: string; sortOrder: number; isActive: boolean },
    db: MenusDbClient,
  ) {
    return db.menuCategory.create({ data: { placeId, ...data }, select: CATEGORY_SELECT });
  }

  updateCategory(
    placeId: string,
    categoryId: string,
    data: Prisma.MenuCategoryUpdateInput,
    db: MenusDbClient,
  ) {
    return db.menuCategory.update({
      where: { id: categoryId, placeId, deletedAt: null },
      data,
      select: CATEGORY_SELECT,
    });
  }

  countCategoryItems(placeId: string, categoryId: string, db: MenusDbClient) {
    return db.menuItem.count({ where: { placeId, categoryId, deletedAt: null } });
  }

  deleteCategory(placeId: string, categoryId: string, at: Date, db: MenusDbClient) {
    return db.menuCategory.update({
      where: { id: categoryId, placeId, deletedAt: null },
      data: { isActive: false, deletedAt: at },
      select: CATEGORY_SELECT,
    });
  }

  async listItems(placeId: string, input: ItemFilters) {
    const where = this.itemWhere(placeId, input);
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.menuItem.findMany({
        where,
        select: ITEM_SELECT,
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { categoryId: 'asc' },
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.menuItem.count({ where }),
    ]);
    return { items, totalItems };
  }

  async listPublic(placeId: string, input: Omit<ItemFilters, 'isAvailable'>) {
    const place = await this.prisma.place.findFirst({
      where: { id: placeId, deletedAt: null, isPublished: true },
      select: { id: true },
    });
    if (!place) return null;

    const where: Prisma.MenuItemWhereInput = {
      placeId,
      deletedAt: null,
      isAvailable: true,
      place: { isPublished: true, deletedAt: null },
      category: { isActive: true, deletedAt: null },
      ...(input.type ? { type: input.type } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.menuItem.findMany({
        where,
        select: ITEM_SELECT,
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { categoryId: 'asc' },
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.menuItem.count({ where }),
    ]);
    return { items, totalItems };
  }

  findItem(placeId: string, menuItemId: string, db: MenusDbClient = this.prisma) {
    return db.menuItem.findFirst({
      where: { id: menuItemId, placeId, deletedAt: null },
      select: ITEM_SELECT,
    });
  }

  createItem(
    placeId: string,
    data: Prisma.MenuItemUncheckedCreateWithoutPlaceInput,
    db: MenusDbClient,
  ) {
    return db.menuItem.create({ data: { ...data, placeId }, select: ITEM_SELECT });
  }

  updateItem(
    placeId: string,
    menuItemId: string,
    data: Prisma.MenuItemUpdateInput,
    db: MenusDbClient,
  ) {
    return db.menuItem.update({
      where: { id: menuItemId, placeId, deletedAt: null },
      data,
      select: ITEM_SELECT,
    });
  }

  deleteItem(placeId: string, menuItemId: string, at: Date, db: MenusDbClient) {
    return db.menuItem.update({
      where: { id: menuItemId, placeId, deletedAt: null },
      data: { isAvailable: false, deletedAt: at },
      select: ITEM_SELECT,
    });
  }

  deleteItemCartRows(placeId: string, menuItemId: string, db: MenusDbClient) {
    return db.cartItem.deleteMany({ where: { placeId, menuItemId } });
  }

  deleteCategoryCartRows(placeId: string, categoryId: string, db: MenusDbClient) {
    return db.cartItem.deleteMany({ where: { placeId, menuItem: { categoryId } } });
  }

  countEligibleItems(placeId: string, availableOnly: boolean, db: MenusDbClient) {
    return db.menuItem.count({
      where: {
        placeId,
        deletedAt: null,
        ...(availableOnly ? { isAvailable: true } : {}),
        category: { isActive: true, deletedAt: null },
      },
    });
  }

  findPlaceState(placeId: string, db: MenusDbClient) {
    return db.place.findFirst({
      where: { id: placeId, deletedAt: null },
      select: { isPublished: true, isOrderingEnabled: true },
    });
  }

  updatePlaceState(
    placeId: string,
    data: { isPublished?: boolean; isOrderingEnabled?: boolean },
    db: MenusDbClient,
  ) {
    return db.place.update({ where: { id: placeId, deletedAt: null }, data });
  }

  private itemWhere(placeId: string, input: ItemFilters): Prisma.MenuItemWhereInput {
    return {
      placeId,
      deletedAt: null,
      ...(input.type ? { type: input.type } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(input.isAvailable === undefined ? {} : { isAvailable: input.isAvailable }),
    };
  }
}
