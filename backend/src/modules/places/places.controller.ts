import { Controller, Post } from '@nestjs/common';

import type { AuthenticatedUser } from '@/common/auth';
import { CurrentUser, RequirePermissions, ZodBody } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import { type CreatePlaceInput, createPlaceSchema } from './places.schema';
import { PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly service: PlacesService) {}

  @Post()
  @RequirePermissions('place.create')
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @ZodBody(createPlaceSchema) input: CreatePlaceInput,
  ) {
    const place = await this.service.create(actor, input);
    return HttpResponse.success({ message: 'Place created', data: { place } });
  }
}
