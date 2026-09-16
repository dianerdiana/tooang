import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';
import type { PrismaService } from '../src/lib/prisma.service';
import { PlaceAccessService } from '../src/modules/places/place-access.service';
import { PlaceMembersService } from '../src/modules/places/place-members.service';
import { PlacesRepository } from '../src/modules/places/places.repository';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const id = () => randomUUID();

describeDatabase('Place access repository (PostgreSQL E2E)', () => {
  let prisma: PrismaClient;
  let repository: PlacesRepository;
  const userIds: string[] = [];
  const placeIds: string[] = [];

  beforeAll(() => {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: testDatabaseUrl! }),
    });
    repository = new PlacesRepository(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.place.deleteMany({ where: { id: { in: placeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  async function createUser(
    state: 'active' | 'deactivated' | 'deletion-pending' | 'anonymized' = 'active',
  ) {
    const internalId = id();
    userIds.push(internalId);
    return prisma.user.create({
      data: {
        id: internalId,
        userId: 'usr_' + id(),
        fullName: 'Place access test user',
        email: 'place-access-' + id() + '@example.com',
        passwordHash: 'not-used-by-this-test',
        ...(state === 'deactivated' ? { deletedAt: new Date() } : {}),
        ...(state === 'deletion-pending' ? { deletionRequestedAt: new Date() } : {}),
        ...(state === 'anonymized' ? { anonymizedAt: new Date() } : {}),
      },
    });
  }

  async function createPlace(deletedAt: Date | null = null) {
    const placeId = id();
    placeIds.push(placeId);
    return prisma.place.create({
      data: {
        id: placeId,
        name: 'Place access test place',
        slug: 'place-access-' + id(),
        type: 'CAFE',
        address: 'Test address',
        timezone: 'Asia/Jakarta',
        deletedAt,
      },
    });
  }

  it('matches only the current target-place membership and an allowed role', async () => {
    const owner = await createUser();
    const cashier = await createUser();
    const place = await createPlace();
    const foreignPlace = await createPlace();
    await prisma.placeMember.createMany({
      data: [
        { placeId: place.id, userId: owner.id, role: 'OWNER' },
        { placeId: place.id, userId: cashier.id, role: 'CASHIER' },
      ],
    });

    await expect(
      repository.findActiveMembership(place.id, owner.id, ['OWNER']),
    ).resolves.toMatchObject({ role: 'OWNER' });
    await expect(
      repository.findActiveMembership(place.id, cashier.id, ['OWNER']),
    ).resolves.toBeNull();
    await expect(
      repository.findActiveMembership(foreignPlace.id, owner.id, ['OWNER', 'CASHIER']),
    ).resolves.toBeNull();

    await prisma.placeMember.update({
      where: { placeId_userId: { placeId: place.id, userId: owner.id } },
      data: { revokedAt: new Date() },
    });
    await expect(
      repository.findActiveMembership(place.id, owner.id, ['OWNER']),
    ).resolves.toBeNull();
  });

  it('excludes memberships for inactive users and deleted places', async () => {
    const deactivated = await createUser('deactivated');
    const deletionPending = await createUser('deletion-pending');
    const anonymized = await createUser('anonymized');
    const active = await createUser();
    const place = await createPlace();
    const deletedPlace = await createPlace(new Date());
    await prisma.placeMember.createMany({
      data: [
        { placeId: place.id, userId: deactivated.id, role: 'OWNER' },
        { placeId: place.id, userId: deletionPending.id, role: 'OWNER' },
        { placeId: place.id, userId: anonymized.id, role: 'OWNER' },
        { placeId: deletedPlace.id, userId: active.id, role: 'OWNER' },
      ],
    });

    for (const [placeId, userId] of [
      [place.id, deactivated.id],
      [place.id, deletionPending.id],
      [place.id, anonymized.id],
      [deletedPlace.id, active.id],
    ]) {
      await expect(repository.findActiveMembership(placeId, userId, ['OWNER'])).resolves.toBeNull();
    }
  });

  it('rolls back a membership mutation when its required audit write fails', async () => {
    const administrator = await createUser();
    const target = await createUser();
    const place = await createPlace();
    const access = new PlaceAccessService(repository);
    const auditFailure = new Error('intentional audit failure');
    const audit = { append: () => Promise.reject(auditFailure) };
    const service = new PlaceMembersService(
      repository,
      access,
      audit as never,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.setRole(
        {
          id: administrator.id,
          userId: administrator.userId,
          platformRole: 'SUPER_ADMIN',
        },
        place.id,
        target.userId,
        'CASHIER',
      ),
    ).rejects.toBe(auditFailure);
    await expect(
      prisma.placeMember.findUnique({
        where: { placeId_userId: { placeId: place.id, userId: target.id } },
      }),
    ).resolves.toBeNull();
  });
});
