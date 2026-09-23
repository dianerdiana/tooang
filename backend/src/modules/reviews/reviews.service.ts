import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma } from '@/generated/prisma/client';

import { type AuthenticatedActor, hasGlobalPlatformPermission, PERMISSION } from '@/common/auth';

import { AuditService } from '@/modules/audit/audit.service';

import { PrismaService } from '../../lib';

import {
  MENU_ITEM_REVIEW_MODERATION_SELECT,
  MENU_ITEM_REVIEW_SELECT,
  PLACE_REVIEW_MODERATION_SELECT,
  PLACE_REVIEW_SELECT,
  ReviewsRepository,
} from './reviews.repository';
import type {
  CreateReviewInput,
  MenuItemReviewModerationListInput,
  PlaceReviewModerationListInput,
  ReviewListInput,
  UpdateReviewInput,
} from './reviews.schema';

type PlaceReviewRow = Prisma.PlaceReviewGetPayload<{ select: typeof PLACE_REVIEW_SELECT }>;
type MenuItemReviewRow = Prisma.MenuItemReviewGetPayload<{
  select: typeof MENU_ITEM_REVIEW_SELECT;
}>;
type ReviewRow = PlaceReviewRow | MenuItemReviewRow;
type PlaceModerationRow = Prisma.PlaceReviewGetPayload<{
  select: typeof PLACE_REVIEW_MODERATION_SELECT;
}>;
type MenuItemModerationRow = Prisma.MenuItemReviewGetPayload<{
  select: typeof MENU_ITEM_REVIEW_MODERATION_SELECT;
}>;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: ReviewsRepository,
    private readonly audit: AuditService,
  ) {}

  async createPlaceReview(actor: AuthenticatedActor, placeId: string, input: CreateReviewInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentActor = await this.repository.lockActiveActor(actor.id, tx);
        if (!currentActor) throw new UnauthorizedException();

        const order = await this.repository.lockOwnedOrder(currentActor.id, input.orderId, tx);
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== 'COMPLETED') {
          throw new ConflictException({
            message: 'Only completed orders may be reviewed',
            code: 'REVIEW_ORDER_NOT_COMPLETED',
          });
        }
        if (order.placeId !== placeId) {
          throw new ConflictException({
            message: 'Order does not belong to the requested place',
            code: 'REVIEW_ORDER_PLACE_MISMATCH',
          });
        }
        if (!(await this.repository.findReviewablePlace(placeId, tx))) {
          throw new NotFoundException('Place not found');
        }

        const stored = await this.repository.findStoredPlaceReviewByOrder(order.id, tx);
        const data = { rating: input.rating, comment: input.comment ?? null };
        if (stored && !stored.deletedAt) this.alreadyExists();
        const review = stored
          ? await this.repository.restorePlaceReview(stored.id, data, tx)
          : await this.repository.createPlaceReview(
              currentActor.id,
              order.placeId,
              order.id,
              data,
              tx,
            );
        return { created: !stored, review: reviewResponse(review) };
      });
    } catch (error) {
      this.rethrowCreateConflict(error);
    }
  }

  async createMenuItemReview(
    actor: AuthenticatedActor,
    placeId: string,
    menuItemId: string,
    input: CreateReviewInput,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentActor = await this.repository.lockActiveActor(actor.id, tx);
        if (!currentActor) throw new UnauthorizedException();
        const order = await this.repository.lockOwnedOrder(currentActor.id, input.orderId, tx);
        if (!order) throw new NotFoundException('Order not found');
        if (order.status !== 'COMPLETED') {
          throw new ConflictException({
            message: 'Only completed orders may be reviewed',
            code: 'REVIEW_ORDER_NOT_COMPLETED',
          });
        }
        if (order.placeId !== placeId) {
          throw new ConflictException({
            message: 'Order does not belong to the requested place',
            code: 'REVIEW_ORDER_PLACE_MISMATCH',
          });
        }
        if (!(await this.repository.findReviewableMenuItem(placeId, menuItemId, tx))) {
          throw new NotFoundException('Menu item not found');
        }
        if (!(await this.repository.orderContainsMenuItem(order.id, menuItemId, tx))) {
          throw new ConflictException({
            message: 'Menu item was not included in the order',
            code: 'REVIEW_ITEM_NOT_IN_ORDER',
          });
        }

        const stored = await this.repository.findStoredMenuItemReview(order.id, menuItemId, tx);
        const data = { rating: input.rating, comment: input.comment ?? null };
        if (stored && !stored.deletedAt) this.alreadyExists();
        const review = stored
          ? await this.repository.restoreMenuItemReview(stored.id, data, tx)
          : await this.repository.createMenuItemReview(
              currentActor.id,
              menuItemId,
              order.id,
              data,
              tx,
            );
        return { created: !stored, review: reviewResponse(review) };
      });
    } catch (error) {
      this.rethrowCreateConflict(error);
    }
  }

  async updateOwnPlaceReview(
    actor: AuthenticatedActor,
    reviewId: string,
    input: UpdateReviewInput,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentActor = await this.repository.lockActiveActor(actor.id, tx);
        if (!currentActor) throw new UnauthorizedException();
        return reviewResponse(
          await this.repository.updateOwnActivePlaceReview(currentActor.id, reviewId, input, tx),
        );
      });
    } catch (error) {
      this.rethrowNotFound(error, 'Place review not found');
    }
  }

  async updateOwnMenuItemReview(
    actor: AuthenticatedActor,
    reviewId: string,
    input: UpdateReviewInput,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentActor = await this.repository.lockActiveActor(actor.id, tx);
        if (!currentActor) throw new UnauthorizedException();
        return reviewResponse(
          await this.repository.updateOwnActiveMenuItemReview(currentActor.id, reviewId, input, tx),
        );
      });
    } catch (error) {
      this.rethrowNotFound(error, 'Menu-item review not found');
    }
  }

  async deleteOwnPlaceReview(actor: AuthenticatedActor, reviewId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentActor = await this.repository.lockActiveActor(actor.id, tx);
        if (!currentActor) throw new UnauthorizedException();
        return reviewResponse(
          await this.repository.softDeleteOwnActivePlaceReview(
            currentActor.id,
            reviewId,
            new Date(),
            tx,
          ),
        );
      });
    } catch (error) {
      this.rethrowNotFound(error, 'Place review not found');
    }
  }

  async deleteOwnMenuItemReview(actor: AuthenticatedActor, reviewId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const currentActor = await this.repository.lockActiveActor(actor.id, tx);
        if (!currentActor) throw new UnauthorizedException();
        return reviewResponse(
          await this.repository.softDeleteOwnActiveMenuItemReview(
            currentActor.id,
            reviewId,
            new Date(),
            tx,
          ),
        );
      });
    } catch (error) {
      this.rethrowNotFound(error, 'Menu-item review not found');
    }
  }

  async listPlaceReviews(placeId: string, input: ReviewListInput) {
    if (!(await this.repository.findReviewablePlace(placeId))) {
      throw new NotFoundException('Place not found');
    }
    const result = await this.repository.listPublicPlaceReviews(placeId, input.page, input.limit);
    return this.listResponse(result, input);
  }

  async listMenuItemReviews(placeId: string, menuItemId: string, input: ReviewListInput) {
    if (!(await this.repository.findPublicMenuItem(placeId, menuItemId))) {
      throw new NotFoundException('Menu item not found');
    }
    const result = await this.repository.listPublicMenuItemReviews(
      placeId,
      menuItemId,
      input.page,
      input.limit,
    );
    return this.listResponse(result, input);
  }

  async listPlaceReviewsForModeration(input: PlaceReviewModerationListInput) {
    const result = await this.repository.listPlaceReviewsForModeration(
      input.page,
      input.limit,
      input.placeId,
    );
    return {
      reviews: result.reviews.map(placeModerationReviewResponse),
      meta: paginationMeta(input, result.totalItems),
    };
  }

  async listMenuItemReviewsForModeration(input: MenuItemReviewModerationListInput) {
    const result = await this.repository.listMenuItemReviewsForModeration(input.page, input.limit, {
      placeId: input.placeId,
      menuItemId: input.menuItemId,
    });
    return {
      reviews: result.reviews.map(menuItemModerationReviewResponse),
      meta: paginationMeta(input, result.totalItems),
    };
  }

  moderatePlaceReview(actor: AuthenticatedActor, reviewId: string) {
    return this.moderate(actor, reviewId, 'PlaceReview');
  }

  moderateMenuItemReview(actor: AuthenticatedActor, reviewId: string) {
    return this.moderate(actor, reviewId, 'MenuItemReview');
  }

  private async moderate(
    actor: AuthenticatedActor,
    reviewId: string,
    type: 'PlaceReview' | 'MenuItemReview',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const currentActor = await this.repository.lockActiveActor(actor.id, tx);
      if (!currentActor) throw new UnauthorizedException();
      if (!hasGlobalPlatformPermission(currentActor.platformRole, PERMISSION.REVIEW_MODERATE)) {
        throw new ForbiddenException('Insufficient permissions');
      }

      const review =
        type === 'PlaceReview'
          ? await this.repository.findActivePlaceReviewForModeration(reviewId, tx)
          : await this.repository.findActiveMenuItemReviewForModeration(reviewId, tx);
      if (!review) throw new NotFoundException('Review not found');

      const deletedAt = new Date();
      const updated =
        type === 'PlaceReview'
          ? await this.repository.moderatePlaceReview(reviewId, deletedAt, tx)
          : await this.repository.moderateMenuItemReview(reviewId, deletedAt, tx);
      if (updated.count !== 1) {
        throw new ConflictException('Review changed concurrently');
      }
      await this.audit.append(
        {
          actor: { kind: 'USER', userId: currentActor.id },
          action: 'REVIEW_MODERATED',
          targetType: type,
          targetId: reviewId,
          beforeData: { deletedAt: null },
          afterData: {
            operation: 'SOFT_DELETE',
            deletedAt: deletedAt.toISOString(),
            changedFields: ['deletedAt'],
          },
        },
        tx,
      );
      return { reviewId, deletedAt: deletedAt.toISOString() };
    });
  }

  private listResponse(
    result: {
      reviews: ReviewRow[];
      totalItems: number;
      summary: { _avg: { rating: number | null }; _count: { rating: number } };
    },
    input: ReviewListInput,
  ) {
    return {
      reviews: result.reviews.map(reviewResponse),
      summary: {
        reviewCount: result.summary._count.rating,
        averageRating: result.summary._avg.rating,
      },
      meta: {
        page: input.page,
        limit: input.limit,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / input.limit),
      },
    };
  }

  private alreadyExists(): never {
    throw new ConflictException({
      message: 'A review already exists for this purchase',
      code: 'REVIEW_ALREADY_EXISTS',
    });
  }

  private rethrowCreateConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      this.alreadyExists();
    }
    throw error;
  }

  private rethrowNotFound(error: unknown, message: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(message);
    }
    throw error;
  }
}

export function reviewResponse(review: ReviewRow) {
  return {
    reviewId: review.id,
    rating: review.rating,
    comment: review.comment,
    reviewer: review.user,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

function paginationMeta(input: { page: number; limit: number }, totalItems: number) {
  return {
    page: input.page,
    limit: input.limit,
    totalItems,
    totalPages: Math.ceil(totalItems / input.limit),
  };
}

export function placeModerationReviewResponse(review: PlaceModerationRow) {
  return {
    reviewId: review.id,
    rating: review.rating,
    comment: review.comment,
    reviewer: review.user,
    place: { placeId: review.place.id, name: review.place.name },
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export function menuItemModerationReviewResponse(review: MenuItemModerationRow) {
  return {
    reviewId: review.id,
    rating: review.rating,
    comment: review.comment,
    reviewer: review.user,
    place: { placeId: review.menuItem.place.id, name: review.menuItem.place.name },
    menuItem: { menuItemId: review.menuItem.id, name: review.menuItem.name },
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
