import { ConflictException, ServiceUnavailableException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

import { OrdersService } from './orders.service';

const actor = { id: 'actor-id', userId: 'usr_actor', platformRole: 'USER' as const };
const input = {
  placeId: '11111111-1111-4111-8111-111111111111',
  fulfillmentType: 'TAKEAWAY' as const,
  customerName: 'Ayu',
};

function prismaError(code: string, target?: string) {
  return new Prisma.PrismaClientKnownRequestError('database failure', {
    code,
    clientVersion: 'test',
    meta: target ? { target: [target] } : undefined,
  });
}

describe('OrdersService retry boundaries', () => {
  it('retries generated identifier collisions at most five times', async () => {
    const prisma = {
      $transaction: jest
        .fn<() => Promise<unknown>>()
        .mockRejectedValue(prismaError('P2002', 'orders_order_code_key')),
    };
    const service = new OrdersService(prisma as never, {} as never, {} as never);

    await expect(service.checkout(actor, 'request-1', input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(5);
  });

  it('retries serialization failures three times and returns a stable conflict', async () => {
    const prisma = {
      $transaction: jest.fn<() => Promise<unknown>>().mockRejectedValue(prismaError('P2034')),
    };
    const service = new OrdersService(prisma as never, {} as never, {} as never);

    await expect(service.checkout(actor, 'request-1', input)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('does not retry unrelated uniqueness failures', async () => {
    const error = prismaError('P2002', 'idempotency_keys_user_id_endpoint_key_key');
    const prisma = {
      $transaction: jest.fn<() => Promise<unknown>>().mockRejectedValue(error),
    };
    const service = new OrdersService(prisma as never, {} as never, {} as never);

    await expect(service.checkout(actor, 'request-1', input)).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
