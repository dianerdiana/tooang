import { Prisma } from '@/generated/prisma/client';

import { isTransactionWriteConflict } from './database-error';

describe('database error classification', () => {
  it('recognizes Prisma and driver-adapter transaction write conflicts', () => {
    const prismaConflict = new Prisma.PrismaClientKnownRequestError('write conflict', {
      code: 'P2034',
      clientVersion: 'test',
    });
    const adapterConflict = Object.assign(new Error('TransactionWriteConflict'), {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict' },
    });

    expect(isTransactionWriteConflict(prismaConflict)).toBe(true);
    expect(isTransactionWriteConflict(adapterConflict)).toBe(true);
  });

  it('does not classify unrelated or spoofed errors as write conflicts', () => {
    expect(isTransactionWriteConflict(new Error('TransactionWriteConflict'))).toBe(false);
    expect(
      isTransactionWriteConflict({
        name: 'DriverAdapterError',
        cause: { kind: 'ConnectionClosed' },
      }),
    ).toBe(false);
    expect(isTransactionWriteConflict(null)).toBe(false);
  });
});
