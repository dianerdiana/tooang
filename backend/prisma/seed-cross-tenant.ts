import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import 'dotenv/config';

import {
  DayOfWeek,
  MenuItemType,
  PlaceMemberRole,
  PlaceType,
  PlatformRole,
  PrismaClient,
} from '../generated/prisma/client.js';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service.js';
import { PasswordPolicyService } from '../src/modules/auth/password-policy.service.js';

/**
 * Cross-tenant isolation fixtures for the Postman collection in postman/.
 *
 * Two independent tenants (A and B) each own a place with menu categories, menu items,
 * and dining tables. Every row uses a deterministic id so the Postman environment can
 * reference foreign-tenant resources directly. Re-running the seed restores the exact
 * baseline, including rows the collection may have touched.
 */

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to load cross-tenant fixtures in production');
}
if (process.env.CONFIRM_TEST_SEED !== '1') {
  throw new Error('Set CONFIRM_TEST_SEED=1 to confirm cross-tenant fixture replacement');
}

const connectionString = process.env.DATABASE_URL;
const password = process.env.SEED_TEST_PASSWORD;
if (!connectionString) throw new Error('DATABASE_URL is required');
if (!password) throw new Error('SEED_TEST_PASSWORD is required');
new PasswordPolicyService(new ConfigService()).assertAllowed(password);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const crossTenantIds = {
  users: {
    ownerA: '04000000-0000-4000-8000-000000000001',
    cashierA: '04000000-0000-4000-8000-000000000002',
    ownerB: '04000000-0000-4000-8000-000000000003',
    cashierB: '04000000-0000-4000-8000-000000000004',
    outsider: '04000000-0000-4000-8000-000000000005',
    admin: '04000000-0000-4000-8000-000000000006',
  },
  places: {
    a: '04000000-0000-4000-8000-000000000101',
    b: '04000000-0000-4000-8000-000000000102',
    bDraft: '04000000-0000-4000-8000-000000000103',
  },
  categories: {
    aFood: '04000000-0000-4000-8000-000000000201',
    bCoffee: '04000000-0000-4000-8000-000000000202',
    bInactive: '04000000-0000-4000-8000-000000000203',
  },
  items: {
    aRice: '04000000-0000-4000-8000-000000000301',
    bLatte: '04000000-0000-4000-8000-000000000302',
    bUnavailable: '04000000-0000-4000-8000-000000000303',
  },
  tables: {
    a1: '04000000-0000-4000-8000-000000000401',
    b1: '04000000-0000-4000-8000-000000000402',
    bInactive: '04000000-0000-4000-8000-000000000403',
  },
};
const ids = crossTenantIds;

const userRows = [
  { id: ids.users.ownerA, userId: 'usr_tenantaowner', fullName: 'Tenant A Owner', email: 'owner.tenant-a@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.cashierA, userId: 'usr_tenantacashier', fullName: 'Tenant A Cashier', email: 'cashier.tenant-a@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.ownerB, userId: 'usr_tenantbowner', fullName: 'Tenant B Owner', email: 'owner.tenant-b@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.cashierB, userId: 'usr_tenantbcashier', fullName: 'Tenant B Cashier', email: 'cashier.tenant-b@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.outsider, userId: 'usr_tenantoutsider', fullName: 'Tenant Outsider', email: 'outsider.tenant@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.admin, userId: 'usr_tenantadmin', fullName: 'Tenant Platform Admin', email: 'admin.tenant@tooang.test', platformRole: PlatformRole.ADMIN },
];

const all = <T extends Record<string, string>>(values: T) => Object.values(values);
const time = (hours: number, minutes: number) => new Date(Date.UTC(1970, 0, 1, hours, minutes));

async function main() {
  const passwordHash = await bcrypt.hash(preHashPassword(password!), 4);
  const userIds = all(ids.users);
  const placeIds = all(ids.places);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: userIds } },
          {
            targetId: {
              in: [
                ...userIds,
                ...placeIds,
                ...all(ids.categories),
                ...all(ids.items),
                ...all(ids.tables),
              ],
            },
          },
        ],
      },
    });
    // Rows the collection or manual exploration may have created against the fixtures.
    await tx.placeReview.deleteMany({ where: { placeId: { in: placeIds } } });
    await tx.menuItemReview.deleteMany({ where: { menuItem: { placeId: { in: placeIds } } } });
    await tx.order.deleteMany({
      where: {
        OR: [
          { placeId: { in: placeIds } },
          { userId: { in: userIds } },
          { createdByUserId: { in: userIds } },
        ],
      },
    });
    await tx.cart.deleteMany({
      where: { OR: [{ placeId: { in: placeIds } }, { userId: { in: userIds } }] },
    });
    await tx.mediaUploadIntent.deleteMany({
      where: { OR: [{ placeId: { in: placeIds } }, { actorUserId: { in: userIds } }] },
    });
    await tx.placeMember.deleteMany({
      where: { OR: [{ placeId: { in: placeIds } }, { userId: { in: userIds } }] },
    });
    await tx.businessHour.deleteMany({ where: { placeId: { in: placeIds } } });
    await tx.diningTable.deleteMany({ where: { placeId: { in: placeIds } } });
    await tx.menuItem.deleteMany({ where: { placeId: { in: placeIds } } });
    await tx.menuCategory.deleteMany({ where: { placeId: { in: placeIds } } });
    await tx.place.deleteMany({ where: { id: { in: placeIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });

    await tx.user.createMany({ data: userRows.map((user) => ({ ...user, passwordHash })) });
    await tx.place.createMany({
      data: [
        {
          id: ids.places.a,
          name: 'Tenant A Kitchen',
          slug: 'tenant-a-kitchen',
          type: PlaceType.RESTAURANT,
          description: 'Tenant A fixture for cross-tenant isolation checks.',
          address: '1 Tenant A Street',
          city: 'Bandung',
          timezone: 'Asia/Jakarta',
          phone: '+622200000101',
          isPublished: true,
          isOrderingEnabled: true,
        },
        {
          id: ids.places.b,
          name: 'Tenant B Coffee',
          slug: 'tenant-b-coffee',
          type: PlaceType.CAFE,
          description: 'Tenant B fixture targeted by cross-tenant requests.',
          address: '2 Tenant B Street',
          city: 'Jakarta',
          timezone: 'Asia/Jakarta',
          phone: '+622100000102',
          isPublished: true,
          isOrderingEnabled: true,
        },
        {
          id: ids.places.bDraft,
          name: 'Tenant B Draft Bakery',
          slug: 'tenant-b-draft-bakery',
          type: PlaceType.OTHER,
          description: 'Unpublished Tenant B place that must stay invisible to other tenants.',
          address: '3 Tenant B Street',
          city: 'Jakarta',
          timezone: 'Asia/Jakarta',
          isPublished: false,
          isOrderingEnabled: false,
        },
      ],
    });
    await tx.placeMember.createMany({
      data: [
        { placeId: ids.places.a, userId: ids.users.ownerA, role: PlaceMemberRole.OWNER },
        { placeId: ids.places.a, userId: ids.users.cashierA, role: PlaceMemberRole.CASHIER },
        { placeId: ids.places.b, userId: ids.users.ownerB, role: PlaceMemberRole.OWNER },
        { placeId: ids.places.b, userId: ids.users.cashierB, role: PlaceMemberRole.CASHIER },
        { placeId: ids.places.bDraft, userId: ids.users.ownerB, role: PlaceMemberRole.OWNER },
      ],
    });
    await tx.businessHour.createMany({
      data: Object.values(DayOfWeek).flatMap((day) =>
        placeIds.map((placeId) => ({
          placeId,
          day,
          opensAt: time(0, 0),
          closesAt: time(23, 59),
          isClosed: false,
        })),
      ),
    });
    await tx.menuCategory.createMany({
      data: [
        { id: ids.categories.aFood, placeId: ids.places.a, name: 'Tenant A Food', normalizedName: 'tenant a food', sortOrder: 1, isActive: true },
        { id: ids.categories.bCoffee, placeId: ids.places.b, name: 'Tenant B Espresso Bar', normalizedName: 'tenant b espresso bar', sortOrder: 1, isActive: true },
        { id: ids.categories.bInactive, placeId: ids.places.b, name: 'Tenant B Seasonal', normalizedName: 'tenant b seasonal', sortOrder: 2, isActive: false },
      ],
    });
    await tx.menuItem.createMany({
      data: [
        { id: ids.items.aRice, placeId: ids.places.a, categoryId: ids.categories.aFood, name: 'Tenant A Fried Rice', type: MenuItemType.FOOD, price: 25000, sortOrder: 1, isAvailable: true },
        { id: ids.items.bLatte, placeId: ids.places.b, categoryId: ids.categories.bCoffee, name: 'Tenant B Latte', type: MenuItemType.DRINK, price: 32000, sortOrder: 1, isAvailable: true },
        { id: ids.items.bUnavailable, placeId: ids.places.b, categoryId: ids.categories.bCoffee, name: 'Tenant B Secret Blend', type: MenuItemType.DRINK, price: 45000, sortOrder: 2, isAvailable: false },
      ],
    });
    await tx.diningTable.createMany({
      data: [
        { id: ids.tables.a1, placeId: ids.places.a, name: 'A-01', normalizedName: 'a-01', isActive: true },
        { id: ids.tables.b1, placeId: ids.places.b, name: 'B-01', normalizedName: 'b-01', isActive: true },
        { id: ids.tables.bInactive, placeId: ids.places.b, name: 'B-Maintenance', normalizedName: 'b-maintenance', isActive: false },
      ],
    });
  });

  console.info('Cross-tenant fixtures loaded', {
    accounts: userRows.map(({ email, platformRole }) => ({ email, platformRole })),
    places: ['tenant-a-kitchen', 'tenant-b-coffee', 'tenant-b-draft-bakery'],
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
