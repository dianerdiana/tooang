import { EventEmitter } from 'node:events';

import { jest } from '@jest/globals';

import { currentRequestId } from '@/common/observability/request-context';

import { RequestContextMiddleware } from './request-context.middleware';

describe('RequestContextMiddleware', () => {
  const setup = (supplied?: string) => {
    const logger = { log: jest.fn() };
    const metrics = { increment: jest.fn(), observe: jest.fn() };
    const middleware = new RequestContextMiddleware(logger as never, metrics);
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      setHeader: jest.fn(),
    });
    const request = {
      headers: supplied === undefined ? {} : { 'x-request-id': supplied },
      method: 'GET',
      route: { path: '/places/:placeId' },
      baseUrl: '/api/v1',
    };
    let activeRequestId: string | undefined;
    middleware.use(request as never, response as never, () => {
      activeRequestId = currentRequestId();
    });
    response.emit('finish');
    return { request, response, logger, metrics, activeRequestId };
  };

  it('accepts a bounded safe request ID and propagates it', () => {
    const result = setup('request_123.safe-id');
    expect(result.activeRequestId).toBe('request_123.safe-id');
    expect(result.response.setHeader).toHaveBeenCalledWith('X-Request-ID', 'request_123.safe-id');
    expect(result.logger.log).toHaveBeenCalledWith(
      'HTTP request completed',
      expect.objectContaining({ route: '/places/:placeId', status: 200 }),
    );
    expect(result.metrics.increment).toHaveBeenCalledWith(
      'http_server_requests_total',
      expect.objectContaining({ statusClass: '2xx' }),
    );
  });

  it.each(['bad id with spaces', 'x'.repeat(101)])('replaces an unsafe request ID', (supplied) => {
    const result = setup(supplied);
    expect(result.activeRequestId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(result.activeRequestId).not.toBe(supplied);
  });
});
