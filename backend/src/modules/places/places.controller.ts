import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';

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
  type CreatePlaceInput,
  createPlaceSchema,
  type ListPlacesInput,
  listPlacesSchema,
  type OrderingInput,
  orderingSchema,
  type PlaceIdParam,
  placeIdParamSchema,
  type PlaceSlugParam,
  placeSlugParamSchema,
  type PublishingInput,
  publishingSchema,
  type UpdatePlaceInput,
  updatePlaceSchema,
} from './places.schema';
import { PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @Get()
  @Public()
  async list(@ZodQuery(listPlacesSchema) query: ListPlacesInput) {
    const result = await this.service.listPublic(query);
    return HttpResponse.success({
      message: 'Places retrieved',
      data: { places: result.places },
      meta: result.meta,
    });
  }

  @Get('management')
  @RequirePermissions(PERMISSION.PLACE_READ)
  async listManagement(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodQuery(listPlacesSchema) query: ListPlacesInput,
  ) {
    const result = await this.service.listManagement(actor, query);
    return HttpResponse.success({
      message: 'Management places retrieved',
      data: { places: result.places },
      meta: result.meta,
    });
  }

  @Get(':placeId/management')
  @RequirePermissions(PERMISSION.PLACE_READ)
  async getManagement(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
  ) {
    const place = await this.service.getManagement(actor, params.placeId);
    return HttpResponse.success({ message: 'Management place retrieved', data: { place } });
  }

  @Get(':slug')
  @Public()
  async get(@ZodParam(placeSlugParamSchema) params: PlaceSlugParam) {
    const place = await this.service.getPublic(params.slug);
    return HttpResponse.success({ message: 'Place retrieved', data: { place } });
  }

  @Post()
  @RequirePermissions(PERMISSION.PLACE_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodBody(createPlaceSchema) input: CreatePlaceInput,
  ) {
    const place = await this.service.create(actor, input);
    return HttpResponse.success({ message: 'Place created', data: { place } });
  }

  @Patch(':placeId')
  @RequirePermissions(PERMISSION.PLACE_UPDATE)
  async update(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
    @ZodBody(updatePlaceSchema) input: UpdatePlaceInput,
  ) {
    const place = await this.service.update(actor, params.placeId, input);
    return HttpResponse.success({ message: 'Place updated', data: { place } });
  }

  @Patch(':placeId/publishing')
  @RequirePermissions(PERMISSION.PLACE_PUBLISH)
  async publishing(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
    @ZodBody(publishingSchema) input: PublishingInput,
  ) {
    const place = await this.service.setPublishing(actor, params.placeId, input.isPublished);
    return HttpResponse.success({ message: 'Place publishing updated', data: { place } });
  }

  @Patch(':placeId/ordering')
  @RequirePermissions(PERMISSION.PLACE_UPDATE)
  async ordering(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
    @ZodBody(orderingSchema) input: OrderingInput,
  ) {
    const place = await this.service.setOrdering(actor, params.placeId, input.isOrderingEnabled);
    return HttpResponse.success({ message: 'Place ordering updated', data: { place } });
  }

  @Delete(':placeId')
  @RequirePermissions(PERMISSION.PLACE_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
  ) {
    const place = await this.service.remove(actor, params.placeId);
    return HttpResponse.success({ message: 'Place deleted', data: { place } });
  }
}
