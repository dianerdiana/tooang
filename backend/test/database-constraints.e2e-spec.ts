import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

const id = () => randomUUID();

async function expectDatabaseRejection(operation: Promise<unknown>) {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeDefined();
    return;
  }

  throw new Error('Expected the database operation to be rejected');
}

describeDatabase('Database constraints (PostgreSQL E2E)', () => {
  let prisma: PrismaClient;
  const userIds: string[] = [];
  const placeIds: string[] = [];
  let userId: string;
  let otherUserId: string;
  let placeId: string;
  let otherPlaceId: string;
  let categoryId: string;
  let otherCategoryId: string;
  let menuItemId: string;
  let otherMenuItemId: string;

  const createOrder = async (
    overrides: Partial<{
      userId: string;
      placeId: string;
      diningTableId: string | null;
      fulfillmentType: 'DINE_IN' | 'TAKEAWAY';
      diningTableName: string | null;
      subtotal: string;
      createdAt: Date;
      expiresAt: Date;
    }> = {},
  ) => {
    const createdAt = overrides.createdAt ?? new Date();
    const expiresAt = overrides.expiresAt ?? new Date(createdAt.getTime() + 15 * 60_000);

    return prisma.order.create({
      data: {
        orderCode: `ORD-${randomUUID()}`,
        verificationToken: id(),
        userId: overrides.userId ?? userId,
        placeId: overrides.placeId ?? placeId,
        diningTableId: overrides.diningTableId ?? null,
        fulfillmentType: overrides.fulfillmentType ?? 'DINE_IN',
        customerName: 'Constraint Test User',
        diningTableName:
          overrides.diningTableName === undefined ? 'Table snapshot' : overrides.diningTableName,
        subtotal: overrides.subtotal ?? '0.00',
        createdAt,
        expiresAt,
      },
    });
  };

  const createMenuItem = (targetPlaceId: string, targetCategoryId: string, name: string) =>
    prisma.menuItem.create({
      data: {
        placeId: targetPlaceId,
        categoryId: targetCategoryId,
        name,
        type: 'FOOD',
        price: '10000.00',
      },
    });

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl! }) });

    userId = id();
    otherUserId = id();
    userIds.push(userId, otherUserId);
    await prisma.user.createMany({
      data: [
        {
          id: userId,
          userId: `usr_${id()}`,
          fullName: 'Database Constraint User',
          email: `db-constraint-${id()}@example.com`,
          passwordHash: 'not-used-by-this-test',
        },
        {
          id: otherUserId,
          userId: `usr_${id()}`,
          fullName: 'Other Database Constraint User',
          email: `db-constraint-${id()}@example.com`,
          passwordHash: 'not-used-by-this-test',
        },
      ],
    });

    placeId = id();
    otherPlaceId = id();
    placeIds.push(placeId, otherPlaceId);
    await prisma.place.createMany({
      data: [
        {
          id: placeId,
          name: 'Constraint Place',
          slug: `constraint-place-${id()}`,
          type: 'RESTAURANT',
          address: 'Test address',
          timezone: 'Asia/Jakarta',
        },
        {
          id: otherPlaceId,
          name: 'Other Constraint Place',
          slug: `constraint-place-${id()}`,
          type: 'CAFE',
          address: 'Other test address',
          timezone: 'Asia/Jakarta',
        },
      ],
    });

    categoryId = id();
    otherCategoryId = id();
    await prisma.menuCategory.createMany({
      data: [
        {
          id: categoryId,
          placeId,
          name: 'Main Menu',
          normalizedName: 'main menu',
        },
        {
          id: otherCategoryId,
          placeId: otherPlaceId,
          name: 'Other Menu',
          normalizedName: 'other menu',
        },
      ],
    });

    menuItemId = (await createMenuItem(placeId, categoryId, 'Main Item')).id;
    otherMenuItemId = (await createMenuItem(otherPlaceId, otherCategoryId, 'Other Item')).id;
  });

  afterAll(async () => {
    if (!prisma) return;

    await prisma.idempotencyKey.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.placeReview.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.menuItemReview.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.placeMember.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.place.deleteMany({ where: { id: { in: placeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('enforces business-hour consistency while allowing overnight hours', async () => {
    await prisma.businessHour.create({
      data: { placeId, day: 'MONDAY', isClosed: true },
    });
    await prisma.businessHour.create({
      data: {
        placeId,
        day: 'TUESDAY',
        isClosed: false,
        opensAt: new Date('1970-01-01T18:00:00.000Z'),
        closesAt: new Date('1970-01-01T02:00:00.000Z'),
      },
    });

    await expectDatabaseRejection(
      prisma.businessHour.create({
        data: {
          placeId,
          day: 'WEDNESDAY',
          isClosed: true,
          opensAt: new Date('1970-01-01T08:00:00.000Z'),
        },
      }),
    );
    await expectDatabaseRejection(
      prisma.businessHour.create({
        data: {
          placeId,
          day: 'THURSDAY',
          isClosed: false,
          opensAt: new Date('1970-01-01T08:00:00.000Z'),
          closesAt: new Date('1970-01-01T08:00:00.000Z'),
        },
      }),
    );
  });

  it('enforces canonical and per-place unique category and table names', async () => {
    await expectDatabaseRejection(
      prisma.menuCategory.create({
        data: { placeId, name: '   ', normalizedName: '' },
      }),
    );
    await expectDatabaseRejection(
      prisma.menuCategory.create({
        data: { placeId, name: '  Specials   Today ', normalizedName: 'wrong' },
      }),
    );
    await expectDatabaseRejection(
      prisma.menuCategory.create({
        data: { placeId, name: 'MAIN MENU', normalizedName: 'main menu' },
      }),
    );

    await prisma.diningTable.create({
      data: { placeId, name: ' Table   A ', normalizedName: 'table a' },
    });
    await expectDatabaseRejection(
      prisma.diningTable.create({
        data: { placeId, name: 'TABLE A', normalizedName: 'table a' },
      }),
    );
    await prisma.diningTable.create({
      data: { placeId: otherPlaceId, name: 'TABLE A', normalizedName: 'table a' },
    });
  });

  it('enforces menu tenant, monetary, name, and sort-order constraints', async () => {
    await expectDatabaseRejection(createMenuItem(placeId, otherCategoryId, 'Cross-place item'));
    await expectDatabaseRejection(
      prisma.menuItem.update({
        where: { id: menuItemId },
        data: { categoryId: otherCategoryId },
      }),
    );
    await expectDatabaseRejection(
      prisma.menuItem.create({
        data: {
          placeId,
          categoryId,
          name: 'Negative price',
          type: 'FOOD',
          price: '-0.01',
        },
      }),
    );
    await expectDatabaseRejection(
      prisma.menuItem.create({
        data: {
          placeId,
          categoryId,
          name: 'Negative sort',
          type: 'DRINK',
          price: '0.00',
          sortOrder: -1,
        },
      }),
    );
    await expectDatabaseRejection(
      prisma.menuCategory.create({
        data: {
          placeId,
          name: 'Negative category sort',
          normalizedName: 'negative category sort',
          sortOrder: -1,
        },
      }),
    );
    await expectDatabaseRejection(
      prisma.menuItem.create({
        data: {
          placeId,
          categoryId,
          name: 'Precision overflow',
          type: 'FOOD',
          price: '10000000000000.00',
        },
      }),
    );

    const decimalItem = await prisma.menuItem.create({
      data: { placeId, categoryId, name: 'Decimal storage', type: 'FOOD', price: '1.20' },
    });
    expect(decimalItem.price.toFixed(2)).toBe('1.20');
  });

  it('enforces cart row and aggregate limits', async () => {
    const cart = await prisma.cart.create({ data: { userId, placeId } });

    await expectDatabaseRejection(
      prisma.cartItem.create({
        data: { cartId: cart.id, placeId, menuItemId: otherMenuItemId, quantity: 1 },
      }),
    );
    for (const quantity of [0, 100]) {
      await expectDatabaseRejection(
        prisma.cartItem.create({
          data: { cartId: cart.id, placeId, menuItemId, quantity },
        }),
      );
    }

    await prisma.cartItem.create({
      data: { cartId: cart.id, placeId, menuItemId, quantity: 1 },
    });
    await expectDatabaseRejection(
      prisma.cartItem.create({
        data: { cartId: cart.id, placeId, menuItemId, quantity: 1 },
      }),
    );

    const items = await Promise.all(
      Array.from({ length: 51 }, (_, index) =>
        createMenuItem(placeId, categoryId, `Cart limit item ${index}-${id()}`),
      ),
    );
    for (const item of items.slice(0, 49)) {
      await prisma.cartItem.create({
        data: { cartId: cart.id, placeId, menuItemId: item.id, quantity: 4 },
      });
    }
    await expectDatabaseRejection(
      prisma.cartItem.create({
        data: { cartId: cart.id, placeId, menuItemId: items[49].id, quantity: 1 },
      }),
    );

    const totalCart = await prisma.cart.create({ data: { userId: otherUserId, placeId } });
    await prisma.cartItem.createMany({
      data: [
        { cartId: totalCart.id, placeId, menuItemId: items[0].id, quantity: 99 },
        { cartId: totalCart.id, placeId, menuItemId: items[1].id, quantity: 99 },
        { cartId: totalCart.id, placeId, menuItemId: items[2].id, quantity: 2 },
      ],
    });
    await expectDatabaseRejection(
      prisma.cartItem.create({
        data: { cartId: totalCart.id, placeId, menuItemId: items[3].id, quantity: 1 },
      }),
    );
  });

  it('serializes concurrent writes at the cart aggregate boundary', async () => {
    const concurrencyPlaceId = id();
    placeIds.push(concurrencyPlaceId);
    await prisma.place.create({
      data: {
        id: concurrencyPlaceId,
        name: 'Concurrency Place',
        slug: `concurrency-${id()}`,
        type: 'OTHER',
        address: 'Concurrency address',
        timezone: 'Asia/Jakarta',
      },
    });
    const concurrencyCategory = await prisma.menuCategory.create({
      data: {
        placeId: concurrencyPlaceId,
        name: 'Concurrency',
        normalizedName: 'concurrency',
      },
    });
    const [baseItemOne, baseItemTwo, candidateOne, candidateTwo] = await Promise.all([
      createMenuItem(concurrencyPlaceId, concurrencyCategory.id, `Base one ${id()}`),
      createMenuItem(concurrencyPlaceId, concurrencyCategory.id, `Base two ${id()}`),
      createMenuItem(concurrencyPlaceId, concurrencyCategory.id, `Candidate one ${id()}`),
      createMenuItem(concurrencyPlaceId, concurrencyCategory.id, `Candidate two ${id()}`),
    ]);
    const cart = await prisma.cart.create({ data: { userId, placeId: concurrencyPlaceId } });
    await prisma.cartItem.createMany({
      data: [
        { cartId: cart.id, placeId: concurrencyPlaceId, menuItemId: baseItemOne.id, quantity: 99 },
        { cartId: cart.id, placeId: concurrencyPlaceId, menuItemId: baseItemTwo.id, quantity: 99 },
      ],
    });

    const results = await Promise.allSettled([
      prisma.cartItem.create({
        data: {
          cartId: cart.id,
          placeId: concurrencyPlaceId,
          menuItemId: candidateOne.id,
          quantity: 2,
        },
      }),
      prisma.cartItem.create({
        data: {
          cartId: cart.id,
          placeId: concurrencyPlaceId,
          menuItemId: candidateTwo.id,
          quantity: 2,
        },
      }),
    ]);
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(
      await prisma.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } }),
    ).toMatchObject({
      _sum: { quantity: 200 },
    });
  });

  it('enforces review rating and stored-review cardinality', async () => {
    const order = await createOrder();
    await expectDatabaseRejection(
      prisma.placeReview.create({ data: { userId, placeId, orderId: order.id, rating: 0 } }),
    );
    const longCommentOrder = await createOrder();
    await expectDatabaseRejection(
      prisma.placeReview.create({
        data: {
          userId,
          placeId,
          orderId: longCommentOrder.id,
          rating: 5,
          comment: 'x'.repeat(2001),
        },
      }),
    );
    const review = await prisma.placeReview.create({
      data: { userId, placeId, orderId: order.id, rating: 5 },
    });
    await prisma.placeReview.update({ where: { id: review.id }, data: { deletedAt: new Date() } });
    await expectDatabaseRejection(
      prisma.placeReview.create({ data: { userId, placeId, orderId: order.id, rating: 4 } }),
    );

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId,
        itemName: 'Main Item',
        itemType: 'FOOD',
        unitPrice: '10000.00',
        quantity: 1,
        lineTotal: '10000.00',
      },
    });
    await expectDatabaseRejection(
      prisma.menuItemReview.create({
        data: { userId, orderId: order.id, menuItemId, rating: 6 },
      }),
    );
    const itemReview = await prisma.menuItemReview.create({
      data: { userId, orderId: order.id, menuItemId, rating: 1 },
    });
    await prisma.menuItemReview.update({
      where: { id: itemReview.id },
      data: { deletedAt: new Date() },
    });
    await expectDatabaseRejection(
      prisma.menuItemReview.create({
        data: { userId, orderId: order.id, menuItemId, rating: 3 },
      }),
    );
  });

  it('enforces order values, expiry, and fulfillment snapshots', async () => {
    await expectDatabaseRejection(createOrder({ subtotal: '-0.01' }));
    await expectDatabaseRejection(
      createOrder({
        fulfillmentType: 'TAKEAWAY',
        diningTableName: 'Must not be retained',
      }),
    );
    await expectDatabaseRejection(createOrder({ diningTableName: null }));
    const createdAt = new Date();
    await expectDatabaseRejection(
      createOrder({ createdAt, expiresAt: new Date(createdAt.getTime() + 14 * 60_000) }),
    );

    const order = await createOrder();
    for (const invalidData of [
      { unitPrice: '-0.01', quantity: 1, lineTotal: '0.00', itemName: 'Invalid unit price' },
      { unitPrice: '0.00', quantity: 0, lineTotal: '0.00', itemName: 'Invalid quantity' },
      { unitPrice: '0.00', quantity: 1, lineTotal: '-0.01', itemName: 'Invalid line total' },
      { unitPrice: '0.00', quantity: 1, lineTotal: '0.00', itemName: '   ' },
    ]) {
      await expectDatabaseRejection(
        prisma.orderItem.create({
          data: { orderId: order.id, itemType: 'FOOD', ...invalidData },
        }),
      );
    }

    const snapshotMenu = await createMenuItem(placeId, categoryId, `Snapshot source ${id()}`);
    const table = await prisma.diningTable.create({
      data: { placeId, name: 'Snapshot Table', normalizedName: 'snapshot table' },
    });
    const snapshotOrder = await createOrder({
      diningTableId: table.id,
      diningTableName: 'Snapshot Table',
    });
    const snapshotItem = await prisma.orderItem.create({
      data: {
        orderId: snapshotOrder.id,
        menuItemId: snapshotMenu.id,
        itemName: 'Original Item Name',
        itemType: 'FOOD',
        unitPrice: '10.00',
        quantity: 1,
        lineTotal: '10.00',
      },
    });
    await prisma.menuItem.delete({ where: { id: snapshotMenu.id } });
    await prisma.diningTable.delete({ where: { id: table.id } });

    expect(
      await prisma.orderItem.findUniqueOrThrow({ where: { id: snapshotItem.id } }),
    ).toMatchObject({
      menuItemId: null,
      itemName: 'Original Item Name',
    });
    expect(await prisma.order.findUniqueOrThrow({ where: { id: snapshotOrder.id } })).toMatchObject(
      {
        diningTableId: null,
        diningTableName: 'Snapshot Table',
      },
    );
  });

  it('uses exact database defaults and scoped uniqueness for idempotency', async () => {
    const defaultOrder = await prisma.order.create({
      data: {
        orderCode: `ORD-${id()}`,
        userId,
        placeId,
        customerName: 'Default expiry order',
        diningTableName: 'Default table',
        subtotal: '0.00',
      },
    });
    expect(defaultOrder.expiresAt.getTime() - defaultOrder.createdAt.getTime()).toBe(15 * 60_000);

    const key = `checkout-${id()}`;
    const first = await prisma.idempotencyKey.create({
      data: {
        key,
        userId,
        endpoint: '/api/v1/checkout',
        requestHash: id(),
        responseStatus: 201,
        responseBody: { orderId: defaultOrder.id },
      },
    });
    expect(first.expiresAt.getTime() - first.createdAt.getTime()).toBe(24 * 60 * 60_000);
    await expectDatabaseRejection(
      prisma.idempotencyKey.create({
        data: {
          key,
          userId,
          endpoint: '/api/v1/checkout',
          requestHash: id(),
          responseStatus: 201,
          responseBody: {},
        },
      }),
    );
    const wrongExpiryCreatedAt = new Date();
    await expectDatabaseRejection(
      prisma.idempotencyKey.create({
        data: {
          key: `invalid-expiry-${id()}`,
          userId,
          endpoint: '/api/v1/checkout',
          requestHash: id(),
          responseStatus: 201,
          responseBody: {},
          createdAt: wrongExpiryCreatedAt,
          expiresAt: new Date(wrongExpiryCreatedAt.getTime() + 23 * 60 * 60_000),
        },
      }),
    );
    await prisma.idempotencyKey.create({
      data: {
        key,
        userId: otherUserId,
        endpoint: '/api/v1/checkout',
        requestHash: id(),
        responseStatus: 201,
        responseBody: {},
      },
    });
    await prisma.idempotencyKey.create({
      data: {
        key,
        userId,
        endpoint: '/api/v1/other-checkout',
        requestHash: id(),
        responseStatus: 201,
        responseBody: {},
      },
    });
    await expectDatabaseRejection(
      prisma.idempotencyKey.create({
        data: {
          key: `invalid-status-${id()}`,
          userId,
          endpoint: '/api/v1/checkout',
          requestHash: id(),
          responseStatus: 99,
          responseBody: {},
        },
      }),
    );
  });

  it('preserves one membership row per user and place, including revoked rows', async () => {
    await prisma.placeMember.create({
      data: { placeId, userId, role: 'OWNER', revokedAt: new Date() },
    });
    await expectDatabaseRejection(
      prisma.placeMember.create({ data: { placeId, userId, role: 'CASHIER' } }),
    );
  });

  it('enforces upload-intent target and size consistency', async () => {
    const common = {
      actorUserId: userId,
      placeId,
      providerTokenHash: id().replaceAll('-', ''),
      expectedFileName: 'asset.png',
      expectedFilePath: '/tooang/asset.png',
      expectedMimeType: 'image/png',
      expiresAt: new Date(Date.now() + 300_000),
    };
    await expectDatabaseRejection(
      prisma.mediaUploadIntent.create({
        data: {
          ...common,
          target: 'PLACE_LOGO',
          menuItemId,
          expectedSizeBytes: 100,
        },
      }),
    );
    await expectDatabaseRejection(
      prisma.mediaUploadIntent.create({
        data: {
          ...common,
          providerTokenHash: id().replaceAll('-', ''),
          target: 'MENU_ITEM_IMAGE',
          menuItemId,
          expectedSizeBytes: 5_242_881,
        },
      }),
    );
    await expectDatabaseRejection(
      prisma.mediaUploadIntent.create({
        data: {
          ...common,
          providerTokenHash: id().replaceAll('-', ''),
          target: 'MENU_ITEM_IMAGE',
          menuItemId: otherMenuItemId,
          expectedSizeBytes: 100,
        },
      }),
    );
  });

  it('installs the retention and active-data indexes', async () => {
    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
    `;
    const names = new Set(indexes.map(({ indexname }) => indexname));

    for (const expectedName of [
      'audit_logs_created_at_idx',
      'orders_created_at_idx',
      'users_anonymized_at_deletion_requested_at_idx',
      'refresh_sessions_expires_at_idx',
      'idempotency_keys_expires_at_idx',
      'place_members_place_id_revoked_at_role_idx',
      'place_members_user_id_revoked_at_role_idx',
      'media_upload_intents_completed_at_expires_at_idx',
    ]) {
      expect(names.has(expectedName)).toBe(true);
    }
  });
});
