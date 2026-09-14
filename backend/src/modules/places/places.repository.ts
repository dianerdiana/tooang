import { Injectable } from '@nestjs/common';

import { type PlaceMemberRole, Prisma } from '@/generated/prisma/client';

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
