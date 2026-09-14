import { Controller, Get, Put } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody, ZodParam } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import {
  type BusinessHourInput,
  type BusinessHourParam,
  businessHourParamSchema,
  businessHourSchema,
} from './business-hours.schema';
import { BusinessHoursService } from './business-hours.service';
import { type PlaceIdParam, placeIdParamSchema } from './places.schema';

@Controller('places/:placeId/business-hours')
export class BusinessHoursController {
  constructor(private readonly service: BusinessHoursService) {}

  @Get()
  @RequirePermissions(PERMISSION.PLACE_READ)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
  ) {
    const businessHours = await this.service.list(actor, params.placeId);
    return HttpResponse.success({ message: 'Business hours retrieved', data: { businessHours } });
  }

  @Put(':day')
  @RequirePermissions(PERMISSION.PLACE_UPDATE)
  async upsert(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(businessHourParamSchema) params: BusinessHourParam,
    @ZodBody(businessHourSchema) input: BusinessHourInput,
  ) {
    const businessHour = await this.service.upsert(actor, params, input);
    return HttpResponse.success({ message: 'Business hours updated', data: { businessHour } });
  }
}
