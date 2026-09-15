import { NotFoundException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { OrderVerificationService } from './order-verification.service';

const token = 'A'.repeat(43);

describe('OrderVerificationService', () => {
  it('returns only the public verification contract', async () => {
    const repository = {
      databaseNow: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue([{ now: new Date('2026-09-15T12:00:00Z') }]),
      findPublicVerification: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        orderCode: 'TNG-20260915-ABCDEFGH',
        status: 'CONFIRMED',
        fulfillmentType: 'DINE_IN',
        createdAt: new Date('2026-09-15T10:00:00Z'),
        expiresAt: new Date('2026-09-15T10:15:00Z'),
        statusUpdatedAt: new Date('2026-09-15T10:01:00Z'),
        place: { name: 'Tooang Place' },
        verificationToken: token,
        customerName: 'must not leak',
      }),
    };
    const result = await new OrderVerificationService(repository as never).verify(token);
    expect(result).toEqual({
      orderCode: 'TNG-20260915-ABCDEFGH',
      placeName: 'Tooang Place',
      status: 'CONFIRMED',
      fulfillmentType: 'DINE_IN',
      createdAt: '2026-09-15T10:00:00.000Z',
      expiresAt: '2026-09-15T10:15:00.000Z',
      statusUpdatedAt: '2026-09-15T10:01:00.000Z',
    });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain('must not leak');
  });

  it.each(['short', `${token}=`, 'a/b', token.toLowerCase()])(
    'returns the same not-found error for unusable token %s',
    async (candidate) => {
      const repository = {
        databaseNow: jest.fn<() => Promise<unknown>>().mockResolvedValue([{ now: new Date() }]),
        findPublicVerification: jest.fn(),
      };
      const service = new OrderVerificationService(repository as never);
      if (candidate === token.toLowerCase()) {
        repository.findPublicVerification.mockResolvedValue(null);
      }
      await expect(service.verify(candidate)).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('uses the same not-found response for an unknown well-formed token', async () => {
    const service = new OrderVerificationService({
      databaseNow: jest.fn<() => Promise<unknown>>().mockResolvedValue([{ now: new Date() }]),
      findPublicVerification: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    } as never);
    await expect(service.verify(token)).rejects.toBeInstanceOf(NotFoundException);
  });
});
