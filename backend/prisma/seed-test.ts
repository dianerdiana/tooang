import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import 'dotenv/config';

import {
  DayOfWeek,
  FulfillmentType,
  MenuItemType,
  OrderSource,
  OrderStatus,
  PlaceMemberRole,
  PlaceType,
  PlatformRole,
  PrismaClient,
} from '../generated/prisma/client.js';
import { preHashPassword } from '../src/lib/bcrypt-hashing.service.js';
import { PasswordPolicyService } from '../src/modules/auth/password-policy.service.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to load release-readiness fixtures in production');
}
if (process.env.CONFIRM_TEST_SEED !== '1') {
  throw new Error('Set CONFIRM_TEST_SEED=1 to confirm release-readiness fixture replacement');
}

const connectionString = process.env.DATABASE_URL;
const password = process.env.SEED_TEST_PASSWORD;
if (!connectionString) throw new Error('DATABASE_URL is required');
if (!password) throw new Error('SEED_TEST_PASSWORD is required');
new PasswordPolicyService(new ConfigService()).assertAllowed(password);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const ids = {
  users: {
    customer: '03000000-0000-4000-8000-000000000001',
    owner: '03000000-0000-4000-8000-000000000002',
    cashier: '03000000-0000-4000-8000-000000000003',
    admin: '03000000-0000-4000-8000-000000000004',
    superAdmin: '03000000-0000-4000-8000-000000000005',
  },
  places: {
    open: '03000000-0000-4000-8000-000000000101',
    unavailable: '03000000-0000-4000-8000-000000000102',
  },
  categories: {
    meals: '03000000-0000-4000-8000-000000000201',
    drinks: '03000000-0000-4000-8000-000000000202',
    hidden: '03000000-0000-4000-8000-000000000203',
  },
  items: {
    rice: '03000000-0000-4000-8000-000000000301',
    noodles: '03000000-0000-4000-8000-000000000302',
    tea: '03000000-0000-4000-8000-000000000303',
    unavailable: '03000000-0000-4000-8000-000000000304',
    hidden: '03000000-0000-4000-8000-000000000305',
  },
  tables: {
    one: '03000000-0000-4000-8000-000000000401',
    patio: '03000000-0000-4000-8000-000000000402',
    inactive: '03000000-0000-4000-8000-000000000403',
  },
  carts: {
    open: '03000000-0000-4000-8000-000000000501',
    unavailable: '03000000-0000-4000-8000-000000000502',
  },
  orders: {
    pending: '03000000-0000-4000-8000-000000000601',
    confirmed: '03000000-0000-4000-8000-000000000602',
    ready: '03000000-0000-4000-8000-000000000603',
    completed: '03000000-0000-4000-8000-000000000604',
    cancelled: '03000000-0000-4000-8000-000000000605',
    manual: '03000000-0000-4000-8000-000000000606',
  },
};

const userRows = [
  { id: ids.users.customer, userId: 'usr_fixturecustomer', fullName: 'Fixture Customer', email: 'customer.fixture@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.owner, userId: 'usr_fixtureowner', fullName: 'Fixture Owner', email: 'owner.fixture@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.cashier, userId: 'usr_fixturecashier', fullName: 'Fixture Cashier', email: 'cashier.fixture@tooang.test', platformRole: PlatformRole.USER },
  { id: ids.users.admin, userId: 'usr_fixtureadmin', fullName: 'Fixture Administrator', email: 'admin.fixture@tooang.test', platformRole: PlatformRole.ADMIN },
  { id: ids.users.superAdmin, userId: 'usr_fixturesuperadmin', fullName: 'Fixture Super Administrator', email: 'superadmin.fixture@tooang.test', platformRole: PlatformRole.SUPER_ADMIN },
];

const all = <T extends Record<string, string>>(values: T) => Object.values(values);
const at = (daysAgo: number, minutes = 0) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - daysAgo);
  value.setUTCMinutes(value.getUTCMinutes() + minutes, 0, 0);
  return value;
};
const time = (hours: number, minutes: number) => new Date(Date.UTC(1970, 0, 1, hours, minutes));

async function main() {
  const passwordHash = await bcrypt.hash(preHashPassword(password!), 4);

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: all(ids.users) } },
          { targetId: { in: [...all(ids.users), ...all(ids.places), ...all(ids.orders)] } },
        ],
      },
    });
    await tx.placeReview.deleteMany({ where: { orderId: { in: all(ids.orders) } } });
    await tx.menuItemReview.deleteMany({ where: { orderId: { in: all(ids.orders) } } });
    await tx.orderItem.deleteMany({ where: { orderId: { in: all(ids.orders) } } });
    await tx.order.deleteMany({ where: { id: { in: all(ids.orders) } } });
    await tx.cartItem.deleteMany({ where: { cartId: { in: all(ids.carts) } } });
    await tx.cart.deleteMany({ where: { id: { in: all(ids.carts) } } });
    await tx.placeMember.deleteMany({ where: { userId: { in: all(ids.users) } } });
    await tx.businessHour.deleteMany({ where: { placeId: { in: all(ids.places) } } });
    await tx.diningTable.deleteMany({ where: { id: { in: all(ids.tables) } } });
    await tx.menuItem.deleteMany({ where: { id: { in: all(ids.items) } } });
    await tx.menuCategory.deleteMany({ where: { id: { in: all(ids.categories) } } });
    await tx.place.deleteMany({ where: { id: { in: all(ids.places) } } });
    await tx.user.deleteMany({ where: { id: { in: all(ids.users) } } });

    await tx.user.createMany({ data: userRows.map((user) => ({ ...user, passwordHash })) });
    await tx.place.createMany({
      data: [
        {
          id: ids.places.open,
          name: 'Tooang Release Kitchen',
          slug: 'tooang-release-kitchen',
          type: PlaceType.RESTAURANT,
          description: 'A complete release-readiness fixture with ordering, tables, menus, reviews, and orders.',
          address: '1 Fixture Street',
          city: 'Bandung',
          timezone: 'Asia/Jakarta',
          phone: '+622200000001',
          whatsapp: '+6281200000001',
          isPublished: true,
          isOrderingEnabled: true,
        },
        {
          id: ids.places.unavailable,
          name: 'Tooang Hidden Fixture',
          slug: 'tooang-hidden-fixture',
          type: PlaceType.CAFE,
          description: 'An unpublished and ordering-disabled fixture used for isolation and unavailable-state checks.',
          address: '2 Fixture Street',
          city: 'Bandung',
          timezone: 'Asia/Jakarta',
          isPublished: false,
          isOrderingEnabled: false,
        },
      ],
    });
    await tx.placeMember.createMany({
      data: [
        { placeId: ids.places.open, userId: ids.users.owner, role: PlaceMemberRole.OWNER },
        { placeId: ids.places.open, userId: ids.users.cashier, role: PlaceMemberRole.CASHIER },
        { placeId: ids.places.unavailable, userId: ids.users.owner, role: PlaceMemberRole.OWNER },
      ],
    });
    await tx.businessHour.createMany({
      data: Object.values(DayOfWeek).flatMap((day) => [
        { placeId: ids.places.open, day, opensAt: time(0, 0), closesAt: time(23, 59), isClosed: false },
        { placeId: ids.places.unavailable, day, opensAt: null, closesAt: null, isClosed: true },
      ]),
    });
    await tx.diningTable.createMany({
      data: [
        { id: ids.tables.one, placeId: ids.places.open, name: 'Table 1', normalizedName: 'table 1', isActive: true },
        { id: ids.tables.patio, placeId: ids.places.open, name: 'Patio', normalizedName: 'patio', isActive: true },
        { id: ids.tables.inactive, placeId: ids.places.open, name: 'Maintenance', normalizedName: 'maintenance', isActive: false },
      ],
    });
    await tx.menuCategory.createMany({
      data: [
        { id: ids.categories.meals, placeId: ids.places.open, name: 'Main meals', normalizedName: 'main meals', description: 'Freshly prepared fixture meals.', sortOrder: 1, isActive: true },
        { id: ids.categories.drinks, placeId: ids.places.open, name: 'Drinks', normalizedName: 'drinks', description: 'Fixture drinks.', sortOrder: 2, isActive: true },
        { id: ids.categories.hidden, placeId: ids.places.unavailable, name: 'Hidden menu', normalizedName: 'hidden menu', sortOrder: 1, isActive: true },
      ],
    });
    await tx.menuItem.createMany({
      data: [
        { id: ids.items.rice, placeId: ids.places.open, categoryId: ids.categories.meals, name: 'Fixture fried rice', description: 'A long but practical menu description for responsive layout checks.', type: MenuItemType.FOOD, price: 25000, sortOrder: 1, isAvailable: true },
        { id: ids.items.noodles, placeId: ids.places.open, categoryId: ids.categories.meals, name: 'Fixture noodles', description: 'Prepared to order.', type: MenuItemType.FOOD, price: 22000, sortOrder: 2, isAvailable: true },
        { id: ids.items.tea, placeId: ids.places.open, categoryId: ids.categories.drinks, name: 'Iced tea', description: 'Fresh tea over ice.', type: MenuItemType.DRINK, price: 8000, sortOrder: 1, isAvailable: true },
        { id: ids.items.unavailable, placeId: ids.places.open, categoryId: ids.categories.meals, name: 'Unavailable fixture item', type: MenuItemType.FOOD, price: 30000, sortOrder: 3, isAvailable: false },
        { id: ids.items.hidden, placeId: ids.places.unavailable, categoryId: ids.categories.hidden, name: 'Hidden fixture item', type: MenuItemType.DRINK, price: 10000, sortOrder: 1, isAvailable: true },
      ],
    });
    await tx.cart.createMany({
      data: [
        { id: ids.carts.open, userId: ids.users.customer, placeId: ids.places.open },
        { id: ids.carts.unavailable, userId: ids.users.customer, placeId: ids.places.unavailable },
      ],
    });
    await tx.cartItem.createMany({
      data: [
        { cartId: ids.carts.open, placeId: ids.places.open, menuItemId: ids.items.rice, quantity: 2, note: 'Less spicy' },
        { cartId: ids.carts.open, placeId: ids.places.open, menuItemId: ids.items.tea, quantity: 1, note: null },
        { cartId: ids.carts.unavailable, placeId: ids.places.unavailable, menuItemId: ids.items.hidden, quantity: 1, note: null },
      ],
    });

    const orderFixtures = [
      { id: ids.orders.pending, code: 'TNG-20300101-PENDNG01', status: OrderStatus.PENDING, fulfillment: FulfillmentType.DINE_IN, daysAgo: 0, token: 'P'.repeat(43) },
      { id: ids.orders.confirmed, code: 'TNG-20300101-CNFRM001', status: OrderStatus.CONFIRMED, fulfillment: FulfillmentType.TAKEAWAY, daysAgo: 1, token: 'C'.repeat(43) },
      { id: ids.orders.ready, code: 'TNG-20300101-READY001', status: OrderStatus.READY, fulfillment: FulfillmentType.DINE_IN, daysAgo: 1, token: 'R'.repeat(43) },
      { id: ids.orders.completed, code: 'TNG-20300101-CMPLT001', status: OrderStatus.COMPLETED, fulfillment: FulfillmentType.TAKEAWAY, daysAgo: 2, token: 'D'.repeat(43) },
      { id: ids.orders.cancelled, code: 'TNG-20300101-CNCLD001', status: OrderStatus.CANCELLED, fulfillment: FulfillmentType.TAKEAWAY, daysAgo: 2, token: 'X'.repeat(43) },
    ];
    for (const fixture of orderFixtures) {
      const createdAt = at(fixture.daysAgo);
      const terminalAt = at(fixture.daysAgo, 5);
      await tx.order.create({
        data: {
          id: fixture.id,
          orderCode: fixture.code,
          verificationToken: fixture.token,
          userId: ids.users.customer,
          placeId: ids.places.open,
          diningTableId: fixture.fulfillment === FulfillmentType.DINE_IN ? ids.tables.one : null,
          diningTableName: fixture.fulfillment === FulfillmentType.DINE_IN ? 'Table 1' : null,
          status: fixture.status,
          source: OrderSource.CUSTOMER,
          fulfillmentType: fixture.fulfillment,
          customerName: 'Fixture Customer',
          customerNote: 'Release-readiness order fixture',
          cancellationReason: fixture.status === OrderStatus.CANCELLED ? 'Fixture cancellation' : null,
          subtotal: 58000,
          createdAt,
          statusUpdatedAt: terminalAt,
          expiresAt: new Date(createdAt.getTime() + 15 * 60_000),
          confirmedAt: fixture.status === OrderStatus.PENDING ? null : terminalAt,
          completedAt: fixture.status === OrderStatus.COMPLETED ? terminalAt : null,
          cancelledAt: fixture.status === OrderStatus.CANCELLED ? terminalAt : null,
          items: {
            create: [
              { menuItemId: ids.items.rice, itemName: 'Fixture fried rice', itemType: MenuItemType.FOOD, unitPrice: 25000, quantity: 2, note: 'Less spicy', lineTotal: 50000 },
              { menuItemId: ids.items.tea, itemName: 'Iced tea', itemType: MenuItemType.DRINK, unitPrice: 8000, quantity: 1, note: null, lineTotal: 8000 },
            ],
          },
        },
      });
    }
    const manualCreatedAt = at(1);
    await tx.order.create({
      data: {
        id: ids.orders.manual,
        orderCode: 'TNG-20300101-MNAA0001',
        verificationToken: 'M'.repeat(43),
        userId: null,
        createdByUserId: ids.users.cashier,
        placeId: ids.places.open,
        status: OrderStatus.PREPARING,
        source: OrderSource.MANUAL,
        fulfillmentType: FulfillmentType.TAKEAWAY,
        customerName: 'Walk-in Fixture',
        subtotal: 22000,
        createdAt: manualCreatedAt,
        statusUpdatedAt: manualCreatedAt,
        expiresAt: new Date(manualCreatedAt.getTime() + 15 * 60_000),
        confirmedAt: manualCreatedAt,
        verificationDisabledAt: manualCreatedAt,
        items: { create: [{ menuItemId: ids.items.noodles, itemName: 'Fixture noodles', itemType: MenuItemType.FOOD, unitPrice: 22000, quantity: 1, lineTotal: 22000 }] },
      },
    });
    await tx.placeReview.create({
      data: { userId: ids.users.customer, placeId: ids.places.open, orderId: ids.orders.completed, rating: 5, comment: 'Reliable fixture review for public and owned review journeys.' },
    });
    await tx.menuItemReview.create({
      data: { userId: ids.users.customer, menuItemId: ids.items.rice, orderId: ids.orders.completed, rating: 4, comment: 'Fixture menu-item review.' },
    });
  });

  console.info('Release-readiness fixtures loaded', {
    accounts: userRows.map(({ email, platformRole }) => ({ email, platformRole })),
    places: ['tooang-release-kitchen', 'tooang-hidden-fixture'],
    orders: Object.keys(ids.orders).length,
  });
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
