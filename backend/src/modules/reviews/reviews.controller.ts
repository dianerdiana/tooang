import { Controller, Delete, Get, Patch, Post, Res } from '@nestjs/common';

import type { Response } from 'express';

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

import {
  type CreateReviewInput,
  createReviewSchema,
  type MenuItemReviewParam,
  menuItemReviewParamSchema,
  type PlaceReviewParam,
  placeReviewParamSchema,
  type ReviewIdParam,
  reviewIdParamSchema,
  type ReviewListInput,
  reviewListSchema,
  type UpdateReviewInput,
  updateReviewSchema,
} from './reviews.schema';
import { ReviewsService } from './reviews.service';

@Controller('places/:placeId/reviews')
export class PlaceReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  @Public()
  async list(
    @ZodParam(placeReviewParamSchema) params: PlaceReviewParam,
    @ZodQuery(reviewListSchema) query: ReviewListInput,
  ) {
    const result = await this.service.listPlaceReviews(params.placeId, query);
    return HttpResponse.success({
      message: 'Place reviews retrieved',
      data: { reviews: result.reviews, summary: result.summary },
      meta: result.meta,
    });
  }

  @Post()
  @RequirePermissions(PERMISSION.REVIEW_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeReviewParamSchema) params: PlaceReviewParam,
    @ZodBody(createReviewSchema) input: CreateReviewInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.createPlaceReview(actor, params.placeId, input);
    response.status(result.created ? 201 : 200);
    return HttpResponse.success({
      message: result.created ? 'Place review created' : 'Place review restored',
      data: { review: result.review },
    });
  }
}

@Controller('places/:placeId/menu-items/:menuItemId/reviews')
export class MenuItemReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  @Public()
  async list(
    @ZodParam(menuItemReviewParamSchema) params: MenuItemReviewParam,
    @ZodQuery(reviewListSchema) query: ReviewListInput,
  ) {
    const result = await this.service.listMenuItemReviews(params.placeId, params.menuItemId, query);
    return HttpResponse.success({
      message: 'Menu-item reviews retrieved',
      data: { reviews: result.reviews, summary: result.summary },
      meta: result.meta,
    });
  }

  @Post()
  @RequirePermissions(PERMISSION.REVIEW_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(menuItemReviewParamSchema) params: MenuItemReviewParam,
    @ZodBody(createReviewSchema) input: CreateReviewInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.service.createMenuItemReview(
      actor,
      params.placeId,
      params.menuItemId,
      input,
    );
    response.status(result.created ? 201 : 200);
    return HttpResponse.success({
      message: result.created ? 'Menu-item review created' : 'Menu-item review restored',
      data: { review: result.review },
    });
  }
}

@Controller('me')
export class MyReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Patch('place-reviews/:reviewId')
  @RequirePermissions(PERMISSION.REVIEW_UPDATE)
  async updatePlace(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(reviewIdParamSchema) params: ReviewIdParam,
    @ZodBody(updateReviewSchema) input: UpdateReviewInput,
  ) {
    const review = await this.service.updateOwnPlaceReview(actor, params.reviewId, input);
    return HttpResponse.success({ message: 'Place review updated', data: { review } });
  }

  @Delete('place-reviews/:reviewId')
  @RequirePermissions(PERMISSION.REVIEW_DELETE)
  async deletePlace(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(reviewIdParamSchema) params: ReviewIdParam,
  ) {
    const review = await this.service.deleteOwnPlaceReview(actor, params.reviewId);
    return HttpResponse.success({ message: 'Place review deleted', data: { review } });
  }

  @Patch('menu-item-reviews/:reviewId')
  @RequirePermissions(PERMISSION.REVIEW_UPDATE)
  async updateMenuItem(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(reviewIdParamSchema) params: ReviewIdParam,
    @ZodBody(updateReviewSchema) input: UpdateReviewInput,
  ) {
    const review = await this.service.updateOwnMenuItemReview(actor, params.reviewId, input);
    return HttpResponse.success({ message: 'Menu-item review updated', data: { review } });
  }

  @Delete('menu-item-reviews/:reviewId')
  @RequirePermissions(PERMISSION.REVIEW_DELETE)
  async deleteMenuItem(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(reviewIdParamSchema) params: ReviewIdParam,
  ) {
    const review = await this.service.deleteOwnMenuItemReview(actor, params.reviewId);
    return HttpResponse.success({ message: 'Menu-item review deleted', data: { review } });
  }
}

@Controller()
export class ReviewModerationController {
  constructor(private readonly service: ReviewsService) {}

  @Delete('place-reviews/:reviewId')
  @RequirePermissions(PERMISSION.REVIEW_MODERATE)
  async moderatePlace(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(reviewIdParamSchema) params: ReviewIdParam,
  ) {
    const review = await this.service.moderatePlaceReview(actor, params.reviewId);
    return HttpResponse.success({ message: 'Place review moderated', data: { review } });
  }

  @Delete('menu-item-reviews/:reviewId')
  @RequirePermissions(PERMISSION.REVIEW_MODERATE)
  async moderateMenuItem(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(reviewIdParamSchema) params: ReviewIdParam,
  ) {
    const review = await this.service.moderateMenuItemReview(actor, params.reviewId);
    return HttpResponse.success({ message: 'Menu-item review moderated', data: { review } });
  }
}
