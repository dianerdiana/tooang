import { Injectable } from '@nestjs/common';

import {
  type DayOfWeek,
  type PlaceMemberRole,
  type PlaceType,
  Prisma,
} from '@/generated/prisma/client';

import { PrismaService } from '../../lib';

export type PlacesDbClient = PrismaService | Prisma.TransactionClient;

const MEMBER_SELECT = {
  id: true,
  placeId: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  revokedAt: true,
  user: { select: { id: true, userId: true, fullName: true, email: true } },
} satisfies Prisma.PlaceMemberSelect;

export const SAFE_PLACE_SELECT = {
  id: true,
  name: true,
  slug: true,
  type: true,
  description: true,
  address: true,
  city: true,
  latitude: true,
  longitude: true,
  phone: true,
  whatsapp: true,
  timezone: true,
  isPublished: true,
  isOrderingEnabled: true,
  createdAt: true,
  updatedAt: true,
  logoAsset: { select: { status: true, deliveryUrl: true } },
  coverAsset: { select: { status: true, deliveryUrl: true } },
} satisfies Prisma.PlaceSelect;

const BUSINESS_HOUR_SELECT = {
  day: true,
  opensAt: true,
  closesAt: true,
  isClosed: true,
} satisfies Prisma.BusinessHourSelect;

const DINING_TABLE_SELECT = {
  id: true,
  placeId: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DiningTableSelect;

@Injectable()
export class PlacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePlace(placeId: string, db: PlacesDbClient = this.prisma) {
    return db.place.findFirst({
      where: { id: placeId, deletedAt: null },
      select: { id: true },
    });
  }

  createWithInitialOwner(data: Prisma.PlaceCreateInput, ownerUserId: string, db: PlacesDbClient) {
    return db.place.create({
      data: {
        ...data,
        members: { create: { userId: ownerUserId, role: 'OWNER' } },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        phone: true,
        whatsapp: true,
        timezone: true,
        isPublished: true,
        isOrderingEnabled: true,
        createdAt: true,
        updatedAt: true,
        members: { select: { id: true }, take: 1 },
      },
    });
  }

  async listPublic(input: {
    page: number;
    limit: number;
    search?: string;
    type?: PlaceType;
    city?: string;
  }) {
    const where: Prisma.PlaceWhereInput = {
      isPublished: true,
      deletedAt: null,
      ...(input.type ? { type: input.type } : {}),
      ...(input.city ? { city: { equals: input.city, mode: 'insensitive' } } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { city: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [places, totalItems] = await this.prisma.$transaction([
      this.prisma.place.findMany({
        where,
        select: SAFE_PLACE_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.place.count({ where }),
    ]);
    return { places, totalItems };
  }

  async listManagement(input: {
    page: number;
    limit: number;
    search?: string;
    type?: PlaceType;
    city?: string;
  }) {
    const where: Prisma.PlaceWhereInput = {
      deletedAt: null,
      ...(input.type ? { type: input.type } : {}),
      ...(input.city ? { city: { equals: input.city, mode: 'insensitive' } } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { city: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [places, totalItems] = await this.prisma.$transaction([
      this.prisma.place.findMany({
        where,
        select: SAFE_PLACE_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.place.count({ where }),
    ]);
    return { places, totalItems };
  }

  findPublicBySlug(slug: string) {
    return this.prisma.place.findFirst({
      where: { slug, isPublished: true, deletedAt: null },
      select: {
        ...SAFE_PLACE_SELECT,
        businessHours: { select: BUSINESS_HOUR_SELECT },
      },
    });
  }

  findActivePlaceDetails(placeId: string, db: PlacesDbClient = this.prisma) {
    return db.place.findFirst({
      where: { id: placeId, deletedAt: null },
      select: SAFE_PLACE_SELECT,
    });
  }

  updateActivePlace(placeId: string, data: Prisma.PlaceUpdateInput, db: PlacesDbClient) {
    return db.place.update({
      where: { id: placeId, deletedAt: null },
      data,
      select: SAFE_PLACE_SELECT,
    });
  }

  deleteActivePlace(placeId: string, deletedAt: Date, db: PlacesDbClient) {
    return db.place.update({
      where: { id: placeId, deletedAt: null },
      data: { deletedAt, isPublished: false, isOrderingEnabled: false },
      select: SAFE_PLACE_SELECT,
    });
  }

  countPublishableMenuItems(placeId: string, availableOnly: boolean, db: PlacesDbClient) {
    return db.menuItem.count({
      where: {
        placeId,
        deletedAt: null,
        ...(availableOnly ? { isAvailable: true } : {}),
        category: { isActive: true, deletedAt: null },
      },
    });
  }

  countUnresolvedOrders(placeId: string, now: Date, db: PlacesDbClient) {
    return db.order.count({
      where: {
        placeId,
        OR: [
          { status: { in: ['CONFIRMED', 'PREPARING', 'READY'] } },
          { status: 'PENDING', expiresAt: { gt: now } },
        ],
      },
    });
  }

  listBusinessHours(placeId: string, db: PlacesDbClient = this.prisma) {
    return db.businessHour.findMany({
      where: { placeId, place: { deletedAt: null } },
      select: BUSINESS_HOUR_SELECT,
    });
  }

  findPlaceTimezone(placeId: string, db: PlacesDbClient = this.prisma) {
    return db.place.findFirst({
      where: { id: placeId, deletedAt: null },
      select: { timezone: true },
    });
  }

  upsertBusinessHour(
    placeId: string,
    day: DayOfWeek,
    data: { isClosed: boolean; opensAt: Date | null; closesAt: Date | null },
    db: PlacesDbClient,
  ) {
    return db.businessHour.upsert({
      where: { placeId_day: { placeId, day } },
      create: { placeId, day, ...data },
      update: data,
      select: BUSINESS_HOUR_SELECT,
    });
  }

  listDiningTables(placeId: string, activeOnly: boolean, db: PlacesDbClient = this.prisma) {
    return db.diningTable.findMany({
      where: { placeId, deletedAt: null, ...(activeOnly ? { isActive: true } : {}) },
      select: DINING_TABLE_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  findDiningTable(
    placeId: string,
    tableId: string,
    activeOnly: boolean,
    db: PlacesDbClient = this.prisma,
  ) {
    return db.diningTable.findFirst({
      where: { id: tableId, placeId, deletedAt: null, ...(activeOnly ? { isActive: true } : {}) },
      select: DINING_TABLE_SELECT,
    });
  }

  createDiningTable(placeId: string, name: string, normalizedName: string, db: PlacesDbClient) {
    return db.diningTable.create({
      data: { placeId, name, normalizedName },
      select: DINING_TABLE_SELECT,
    });
  }

  updateDiningTable(
    placeId: string,
    tableId: string,
    data: { name?: string; normalizedName?: string; isActive?: boolean },
    db: PlacesDbClient,
  ) {
    return db.diningTable.update({
      where: { id: tableId, placeId, deletedAt: null },
      data,
      select: DINING_TABLE_SELECT,
    });
  }

  deleteDiningTable(placeId: string, tableId: string, deletedAt: Date, db: PlacesDbClient) {
    return db.diningTable.update({
      where: { id: tableId, placeId, deletedAt: null },
      data: { isActive: false, deletedAt },
      select: DINING_TABLE_SELECT,
    });
  }

  findActiveMembership(
    placeId: string,
    userId: string,
    allowedRoles: readonly PlaceMemberRole[],
    db: PlacesDbClient = this.prisma,
  ) {
    return db.placeMember.findFirst({
      where: {
        placeId,
        userId,
        role: { in: [...allowedRoles] },
        revokedAt: null,
        place: { deletedAt: null },
        user: { deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      },
      select: { id: true, role: true },
    });
  }

  findMembership(placeId: string, userId: string, db: PlacesDbClient = this.prisma) {
    return db.placeMember.findUnique({
      where: { placeId_userId: { placeId, userId } },
      select: MEMBER_SELECT,
    });
  }

  findActiveUser(userId: string, db: PlacesDbClient = this.prisma) {
    return db.user.findFirst({
      where: { userId, deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      select: { id: true, userId: true },
    });
  }

  listActiveMembers(placeId: string, onlyUserId?: string, db: PlacesDbClient = this.prisma) {
    return db.placeMember.findMany({
      where: {
        placeId,
        ...(onlyUserId ? { userId: onlyUserId } : {}),
        revokedAt: null,
        user: { deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      },
      select: MEMBER_SELECT,
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  setMembership(placeId: string, userId: string, role: PlaceMemberRole, db: PlacesDbClient) {
    return db.placeMember.upsert({
      where: { placeId_userId: { placeId, userId } },
      create: { placeId, userId, role },
      update: { role, revokedAt: null },
      select: MEMBER_SELECT,
    });
  }

  revokeMembership(id: string, at: Date, db: PlacesDbClient) {
    return db.placeMember.update({
      where: { id },
      data: { revokedAt: at },
      select: MEMBER_SELECT,
    });
  }

  countActiveOwners(placeId: string, db: PlacesDbClient) {
    return db.placeMember.count({
      where: {
        placeId,
        role: 'OWNER',
        revokedAt: null,
        user: { deletedAt: null, deletionRequestedAt: null, anonymizedAt: null },
      },
    });
  }
}
