import { Controller, Delete, Post } from '@nestjs/common';

import { MediaTargetType } from '@/generated/prisma/client';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody, ZodParam } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import {
  type CompleteUploadIntentInput,
  completeUploadIntentSchema,
  type CreateUploadIntentInput,
  createUploadIntentSchema,
  type IntentParam,
  intentParamSchema,
  type MenuItemMediaParam,
  menuItemMediaParamSchema,
  type PlaceMediaParam,
  placeMediaParamSchema,
} from './media.schema';
import { MediaService } from './media.service';

@Controller('media/upload-intents')
export class MediaUploadIntentsController {
  constructor(private readonly service: MediaService) {}

  @Post()
  @RequirePermissions(PERMISSION.MEDIA_UPLOAD)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodBody(createUploadIntentSchema) input: CreateUploadIntentInput,
  ) {
    const upload = await this.service.createIntent(actor, input);
    return HttpResponse.success({ message: 'Media upload authorized', data: { upload } });
  }

  @Post(':intentId/complete')
  @RequirePermissions(PERMISSION.MEDIA_UPLOAD)
  async complete(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(intentParamSchema) params: IntentParam,
    @ZodBody(completeUploadIntentSchema) input: CompleteUploadIntentInput,
  ) {
    const media = await this.service.complete(actor, params.intentId, input.fileId);
    return HttpResponse.success({ message: 'Media upload completed', data: { media } });
  }
}

@Controller()
export class MediaAssociationsController {
  constructor(private readonly service: MediaService) {}

  @Delete('places/:placeId/media/logo')
  @RequirePermissions(PERMISSION.MEDIA_DELETE)
  async removeLogo(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeMediaParamSchema) params: PlaceMediaParam,
  ) {
    const media = await this.service.removePlaceMedia(
      actor,
      params.placeId,
      MediaTargetType.PLACE_LOGO,
    );
    return HttpResponse.success({ message: 'Place logo removed', data: { media } });
  }

  @Delete('places/:placeId/media/cover')
  @RequirePermissions(PERMISSION.MEDIA_DELETE)
  async removeCover(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeMediaParamSchema) params: PlaceMediaParam,
  ) {
    const media = await this.service.removePlaceMedia(
      actor,
      params.placeId,
      MediaTargetType.PLACE_COVER,
    );
    return HttpResponse.success({ message: 'Place cover removed', data: { media } });
  }

  @Delete('places/:placeId/menu-items/:menuItemId/image')
  @RequirePermissions(PERMISSION.MEDIA_DELETE)
  async removeMenuItemImage(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(menuItemMediaParamSchema) params: MenuItemMediaParam,
  ) {
    const media = await this.service.removeMenuItemMedia(actor, params.placeId, params.menuItemId);
    return HttpResponse.success({ message: 'Menu item image removed', data: { media } });
  }
}
