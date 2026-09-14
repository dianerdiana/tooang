import { Controller, Post } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { type CreatePlaceInput, createPlaceSchema } from './places.schema';
import { PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @Post()
  @RequirePermissions(PERMISSION.PLACE_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodBody(createPlaceSchema) input: CreatePlaceInput,
  ) {
    const place = await this.service.create(actor, input);
    return HttpResponse.success({ message: 'Place created', data: { place } });
  }
}
