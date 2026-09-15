import { ServiceUnavailableException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns only bounded readiness checks when dependencies are healthy', async () => {
    const metrics = { observe: jest.fn() };
    const controller = new HealthController(
      { $queryRaw: jest.fn(() => Promise.resolve([{ ready: 1 }])) } as never,
      { getOrThrow: jest.fn(() => 'test') } as never,
      metrics as never,
    );
    await expect(controller.ready()).resolves.toEqual(
      expect.objectContaining({
        error: false,
        data: { status: 'ok', checks: { configuration: 'up', database: 'up' } },
      }),
    );
    expect(metrics.observe).toHaveBeenCalledWith('database_health', 1);
  });

  it('returns a sanitized 503 without dependency details', async () => {
    const controller = new HealthController(
      { $queryRaw: jest.fn(() => Promise.reject(new Error('postgresql://secret@db'))) } as never,
      { getOrThrow: jest.fn(() => 'test') } as never,
      { observe: jest.fn() } as never,
    );
    await expect(controller.ready()).rejects.toMatchObject<ServiceUnavailableException>({
      status: 503,
    });
    try {
      await controller.ready();
    } catch (error) {
      expect(JSON.stringify((error as ServiceUnavailableException).getResponse())).not.toContain(
        'postgresql',
      );
    }
  });
});
