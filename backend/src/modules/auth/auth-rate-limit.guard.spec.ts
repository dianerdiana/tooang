import { HttpException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { AuthRateLimitGuard } from './auth-rate-limit.guard';

describe('AuthRateLimitGuard lookup scopes', () => {
  function setup(policy: 'order-verification' | 'order-code-lookup', retryAfter: number | null) {
    const reflector = { getAllAndOverride: jest.fn(() => policy) };
    const rateLimits = {
      consume: jest.fn<() => Promise<number | null>>().mockResolvedValue(retryAfter),
    };
    const setHeader = jest.fn();
    const request = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'x-request-id': 'request-1' },
      user: { id: 'actor-id' },
    };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setHeader }),
      }),
    };
    return {
      guard: new AuthRateLimitGuard(reflector as never, rateLimits as never),
      context,
      rateLimits,
      setHeader,
    };
  }

  it('uses IP-only scope for public verification', async () => {
    const { guard, context, rateLimits } = setup('order-verification', null);
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(rateLimits.consume).toHaveBeenCalledWith('order-verification', '127.0.0.1', 'request-1');
  });

  it('combines actor and IP for order-code lookup and returns Retry-After', async () => {
    const { guard, context, rateLimits, setHeader } = setup('order-code-lookup', 12);
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(HttpException);
    expect(rateLimits.consume).toHaveBeenCalledWith(
      'order-code-lookup',
      'actor-id:127.0.0.1',
      'request-1',
    );
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '12');
  });
});
