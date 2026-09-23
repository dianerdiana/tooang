import { Injectable } from '@nestjs/common';

import { type OrderStatus, type PlatformRole, Prisma } from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type ReviewsDbClient = PrismaService | Prisma.TransactionClient;

export const PLACE_REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: { userId: true, fullName: true } },
} satisfies Prisma.PlaceReviewSelect;

export const MENU_ITEM_REVIEW_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: { userId: true, fullName: true } },
} satisfies Prisma.MenuItemReviewSelect;

export const PLACE_REVIEW_MODERATION_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { userId: true, fullName: true } },
  place: { select: { id: true, name: true } },
} satisfies Prisma.PlaceReviewSelect;

export const MENU_ITEM_REVIEW_MODERATION_SELECT = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { userId: true, fullName: true } },
  menuItem: {
    select: {
      id: true,
      name: true,
      place: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.MenuItemReviewSelect;

type ReviewWrite = { rating: number; comment: string | null };
type ReviewPatch = { rating?: number; comment?: string | null };

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async lockActiveActor(userId: string, db: ReviewsDbClient) {
    const rows = await db.$queryRaw<
      Array<{ id: string; userId: string; platformRole: PlatformRole }>
    >(Prisma.sql`
      SELECT "id", "id_user" AS "userId", "platform_role"::text AS "platformRole"
      FROM "users"
      WHERE "id" = ${userId}
        AND "deleted_at" IS NULL
        AND "deletion_requested_at" IS NULL
        AND "anonymized_at" IS NULL
      FOR SHARE
    `);
    return rows[0] ?? null;
  }

  async lockOwnedOrder(userId: string, orderId: string, db: ReviewsDbClient) {
    const rows = await db.$queryRaw<Array<{ id: string; placeId: string; status: OrderStatus }>>(
      Prisma.sql`
        SELECT "id", "place_id" AS "placeId", "status"::text AS "status"
        FROM "orders"
        WHERE "id" = ${orderId} AND "user_id" = ${userId}
        FOR UPDATE
      `,
    );
    return rows[0] ?? null;
  }

  findReviewablePlace(placeId: string, db: ReviewsDbClient = this.prisma) {
    return db.place.findFirst({
      where: { id: placeId, isPublished: true, deletedAt: null },
      select: { id: true },
    });
  }

  findReviewableMenuItem(placeId: string, menuItemId: string, db: ReviewsDbClient) {
    return db.menuItem.findFirst({
      where: { id: menuItemId, placeId, deletedAt: null },
      select: { id: true },
    });
  }

  orderContainsMenuItem(orderId: string, menuItemId: string, db: ReviewsDbClient) {
    return db.orderItem.findFirst({
      where: { orderId, menuItemId },
      select: { id: true },
    });
  }

  findStoredPlaceReviewByOrder(orderId: string, db: ReviewsDbClient) {
    return db.placeReview.findUnique({ where: { orderId }, select: PLACE_REVIEW_SELECT });
  }

  findStoredMenuItemReview(orderId: string, menuItemId: string, db: ReviewsDbClient) {
    return db.menuItemReview.findUnique({
      where: { orderId_menuItemId: { orderId, menuItemId } },
      select: MENU_ITEM_REVIEW_SELECT,
    });
  }

  createPlaceReview(
    userId: string,
    placeId: string,
    orderId: string,
    data: ReviewWrite,
    db: ReviewsDbClient,
  ) {
    return db.placeReview.create({
      data: { userId, placeId, orderId, ...data },
      select: PLACE_REVIEW_SELECT,
    });
  }

  restorePlaceReview(id: string, data: ReviewWrite, db: ReviewsDbClient) {
    return db.placeReview.update({
      where: { id, deletedAt: { not: null } },
      data: { ...data, deletedAt: null },
      select: PLACE_REVIEW_SELECT,
    });
  }

  createMenuItemReview(
    userId: string,
    menuItemId: string,
    orderId: string,
    data: ReviewWrite,
    db: ReviewsDbClient,
  ) {
    return db.menuItemReview.create({
      data: { userId, menuItemId, orderId, ...data },
      select: MENU_ITEM_REVIEW_SELECT,
    });
  }

  restoreMenuItemReview(id: string, data: ReviewWrite, db: ReviewsDbClient) {
    return db.menuItemReview.update({
      where: { id, deletedAt: { not: null } },
      data: { ...data, deletedAt: null },
      select: MENU_ITEM_REVIEW_SELECT,
    });
  }

  updateOwnActivePlaceReview(
    userId: string,
    reviewId: string,
    data: ReviewPatch,
    db: ReviewsDbClient = this.prisma,
  ) {
    return db.placeReview.update({
      where: { id: reviewId, userId, deletedAt: null },
      data,
      select: PLACE_REVIEW_SELECT,
    });
  }

  updateOwnActiveMenuItemReview(
    userId: string,
    reviewId: string,
    data: ReviewPatch,
    db: ReviewsDbClient = this.prisma,
  ) {
    return db.menuItemReview.update({
      where: { id: reviewId, userId, deletedAt: null },
      data,
      select: MENU_ITEM_REVIEW_SELECT,
    });
  }

  softDeleteOwnActivePlaceReview(
    userId: string,
    reviewId: string,
    deletedAt: Date,
    db: ReviewsDbClient = this.prisma,
  ) {
    return db.placeReview.update({
      where: { id: reviewId, userId, deletedAt: null },
      data: { deletedAt },
      select: PLACE_REVIEW_SELECT,
    });
  }

  softDeleteOwnActiveMenuItemReview(
    userId: string,
    reviewId: string,
    deletedAt: Date,
    db: ReviewsDbClient = this.prisma,
  ) {
    return db.menuItemReview.update({
      where: { id: reviewId, userId, deletedAt: null },
      data: { deletedAt },
      select: MENU_ITEM_REVIEW_SELECT,
    });
  }

  findPublicMenuItem(placeId: string, menuItemId: string) {
    return this.prisma.menuItem.findFirst({
      where: {
        id: menuItemId,
        placeId,
        isAvailable: true,
        deletedAt: null,
        place: { isPublished: true, deletedAt: null },
        category: { isActive: true, deletedAt: null },
      },
      select: { id: true },
    });
  }

  async listPublicPlaceReviews(placeId: string, page: number, limit: number) {
    const where: Prisma.PlaceReviewWhereInput = {
      placeId,
      deletedAt: null,
      place: { isPublished: true, deletedAt: null },
    };
    const [reviews, totalItems, summary] = await this.prisma.$transaction([
      this.prisma.placeReview.findMany({
        where,
        select: PLACE_REVIEW_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.placeReview.count({ where }),
      this.prisma.placeReview.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);
    return { reviews, totalItems, summary };
  }

  async listPublicMenuItemReviews(
    placeId: string,
    menuItemId: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.MenuItemReviewWhereInput = {
      menuItemId,
      deletedAt: null,
      menuItem: {
        placeId,
        isAvailable: true,
        deletedAt: null,
        place: { isPublished: true, deletedAt: null },
        category: { isActive: true, deletedAt: null },
      },
    };
    const [reviews, totalItems, summary] = await this.prisma.$transaction([
      this.prisma.menuItemReview.findMany({
        where,
        select: MENU_ITEM_REVIEW_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.menuItemReview.count({ where }),
      this.prisma.menuItemReview.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);
    return { reviews, totalItems, summary };
  }

  async listPlaceReviewsForModeration(page: number, limit: number, placeId?: string) {
    const where: Prisma.PlaceReviewWhereInput = {
      deletedAt: null,
      ...(placeId ? { placeId } : {}),
    };
    const [reviews, totalItems] = await this.prisma.$transaction([
      this.prisma.placeReview.findMany({
        where,
        select: PLACE_REVIEW_MODERATION_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.placeReview.count({ where }),
    ]);
    return { reviews, totalItems };
  }

  async listMenuItemReviewsForModeration(
    page: number,
    limit: number,
    filters: { placeId?: string; menuItemId?: string },
  ) {
    const where: Prisma.MenuItemReviewWhereInput = {
      deletedAt: null,
      ...(filters.menuItemId ? { menuItemId: filters.menuItemId } : {}),
      ...(filters.placeId ? { menuItem: { placeId: filters.placeId } } : {}),
    };
    const [reviews, totalItems] = await this.prisma.$transaction([
      this.prisma.menuItemReview.findMany({
        where,
        select: MENU_ITEM_REVIEW_MODERATION_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.menuItemReview.count({ where }),
    ]);
    return { reviews, totalItems };
  }

  findActivePlaceReviewForModeration(reviewId: string, db: ReviewsDbClient) {
    return db.placeReview.findFirst({
      where: { id: reviewId, deletedAt: null },
      select: { id: true },
    });
  }

  findActiveMenuItemReviewForModeration(reviewId: string, db: ReviewsDbClient) {
    return db.menuItemReview.findFirst({
      where: { id: reviewId, deletedAt: null },
      select: { id: true },
    });
  }

  moderatePlaceReview(reviewId: string, deletedAt: Date, db: ReviewsDbClient) {
    return db.placeReview.updateMany({
      where: { id: reviewId, deletedAt: null },
      data: { deletedAt },
    });
  }

  moderateMenuItemReview(reviewId: string, deletedAt: Date, db: ReviewsDbClient) {
    return db.menuItemReview.updateMany({
      where: { id: reviewId, deletedAt: null },
      data: { deletedAt },
    });
  }
}
