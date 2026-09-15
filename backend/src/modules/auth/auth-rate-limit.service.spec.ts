import { ConfigService } from '@nestjs/config';

import { jest } from '@jest/globals';

import { AuthRateLimitRepository } from './auth-rate-limit.repository';
import { AuthRateLimitService } from './auth-rate-limit.service';

describe('AuthRateLimitService', () => {
  const logger = { warn: jest.fn(), error: jest.fn() };

  it('pseudonymizes equivalent IPv4-mapped addresses identically', () => {
    const service = new AuthRateLimitService(
      {} as AuthRateLimitRepository,
      logger as never,
      new ConfigService({ security: { rateLimitSourceSecret: 'x'.repeat(32) } }),
    );
    expect(service.sourceHash('::ffff:127.0.0.1')).toBe(service.sourceHash('127.0.0.1'));
    expect(service.sourceHash('127.0.0.1')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns the longest binding retry window after consuming every login policy', async () => {
    const repository = {
      consume: jest.fn(() =>
        Promise.resolve([
          { policy: 'login-15m', attemptCount: 11, windowStartedAt: new Date() },
          { policy: 'login-1h', attemptCount: 31, windowStartedAt: new Date() },
        ]),
      ),
    };
    const service = new AuthRateLimitService(
      repository as unknown as AuthRateLimitRepository,
      logger as never,
      new ConfigService({ security: { rateLimitSourceSecret: 'x'.repeat(32) } }),
    );
    await expect(service.consume('login', '127.0.0.1')).resolves.toBeGreaterThan(3500);
    expect(repository.consume).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.arrayContaining([
        expect.objectContaining({ name: 'login-15m', limit: 10 }),
        expect.objectContaining({ name: 'login-1h', limit: 30 }),
      ]),
      expect.any(Date),
    );
  });

  it('applies the public verification policy', async () => {
    const repository = {
      consume: jest.fn(() =>
        Promise.resolve([
          { policy: 'order-verification-1m', attemptCount: 1, windowStartedAt: new Date() },
        ]),
      ),
    };
    const service = new AuthRateLimitService(
      repository as unknown as AuthRateLimitRepository,
      logger as never,
      new ConfigService({ security: { rateLimitSourceSecret: 'x'.repeat(32) } }),
    );
    await expect(service.consume('order-verification', '127.0.0.1')).resolves.toBeNull();
    expect(repository.consume).toHaveBeenCalledWith(
      expect.any(String),
      [{ name: 'order-verification-1m', limit: 30, windowSeconds: 60 }],
      expect.any(Date),
    );
  });
});
