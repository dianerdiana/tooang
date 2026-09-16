import { Prisma } from '@/generated/prisma/client';

type DriverAdapterErrorShape = {
  name?: unknown;
  cause?: { kind?: unknown };
};

/**
 * Prisma's client engine reports serialization failures as P2034, while the
 * JavaScript PostgreSQL driver adapter can surface the equivalent structured
 * DriverAdapterError directly during transaction commit.
 */
export function isTransactionWriteConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === 'P2034';
  if (!error || typeof error !== 'object') return false;

  const candidate = error as DriverAdapterErrorShape;
  return (
    candidate.name === 'DriverAdapterError' && candidate.cause?.kind === 'TransactionWriteConflict'
  );
}
