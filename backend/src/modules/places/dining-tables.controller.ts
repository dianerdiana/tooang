import { Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';

import { type AuthenticatedActor, PERMISSION } from '@/common/auth';
import { CurrentActor, RequirePermissions, ZodBody, ZodParam } from '@/common/decorators';
import { HttpResponse } from '@/common/responses';

import {
  type CreateDiningTableInput,
  createDiningTableSchema,
  type DiningTableParam,
  diningTableParamSchema,
  type UpdateDiningTableInput,
  updateDiningTableSchema,
} from './dining-tables.schema';
import { DiningTablesService } from './dining-tables.service';
import { type PlaceIdParam, placeIdParamSchema } from './places.schema';

@Controller('places/:placeId/dining-tables')
export class DiningTablesController {
  constructor(private readonly service: DiningTablesService) {}

  @Get()
  @RequirePermissions(PERMISSION.TABLE_READ)
  async list(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
  ) {
    const tables = await this.service.list(actor, params.placeId);
    return HttpResponse.success({ message: 'Dining tables retrieved', data: { tables } });
  }

  @Get(':tableId')
  @RequirePermissions(PERMISSION.TABLE_READ)
  async get(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(diningTableParamSchema) params: DiningTableParam,
  ) {
    const table = await this.service.get(actor, params.placeId, params.tableId);
    return HttpResponse.success({ message: 'Dining table retrieved', data: { table } });
  }

  @Post()
  @RequirePermissions(PERMISSION.TABLE_CREATE)
  async create(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(placeIdParamSchema) params: PlaceIdParam,
    @ZodBody(createDiningTableSchema) input: CreateDiningTableInput,
  ) {
    const table = await this.service.create(actor, params.placeId, input);
    return HttpResponse.success({ message: 'Dining table created', data: { table } });
  }

  @Patch(':tableId')
  @RequirePermissions(PERMISSION.TABLE_UPDATE)
  async update(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(diningTableParamSchema) params: DiningTableParam,
    @ZodBody(updateDiningTableSchema) input: UpdateDiningTableInput,
  ) {
    const table = await this.service.update(actor, params.placeId, params.tableId, input);
    return HttpResponse.success({ message: 'Dining table updated', data: { table } });
  }

  @Delete(':tableId')
  @RequirePermissions(PERMISSION.TABLE_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentActor() actor: AuthenticatedActor,
    @ZodParam(diningTableParamSchema) params: DiningTableParam,
  ) {
    const table = await this.service.remove(actor, params.placeId, params.tableId);
    return HttpResponse.success({ message: 'Dining table deleted', data: { table } });
  }
}
