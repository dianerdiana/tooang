import { BadRequestException } from '@nestjs/common';

import { jest } from '@jest/globals';

import { Prisma } from '@/generated/prisma/client';

import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const execute = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const logger = { error: jest.fn() };
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          header: () => 'request-id',
          method: 'POST',
          route: { path: '/resource/:id' },
        }),
      }),
    };
    new HttpExceptionFilter(logger as never).catch(exception, host as never);
    return { status, json, logger };
  };

  it.each([
    ['P2000', 400, 'BAD_REQUEST'],
    ['P2002', 409, 'CONFLICT'],
    ['P2025', 404, 'NOT_FOUND'],
    ['P2034', 409, 'CONFLICT'],
  ])('maps Prisma %s to a stable response', (code, expectedStatus, expectedCode) => {
    const result = execute(
      new Prisma.PrismaClientKnownRequestError('private database detail', {
        code,
        clientVersion: 'test',
      }),
    );
    expect(result.status).toHaveBeenCalledWith(expectedStatus);
    expect(result.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: true, code: expectedCode }),
    );
    expect(JSON.stringify(result.json.mock.calls)).not.toContain('private database detail');
  });

  it('preserves safe validation details without submitted values', () => {
    const result = execute(
      new BadRequestException({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: [{ field: 'rating', message: 'Must be at most 5' }],
      }),
    );
    expect(result.json).toHaveBeenCalledWith({
      error: true,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: [{ field: 'rating', message: 'Must be at most 5' }],
    });
  });

  it('sanitizes unknown errors and logs only request context plus the secure trace', () => {
    const result = execute(new Error('private failure'));
    expect(result.status).toHaveBeenCalledWith(500);
    expect(result.json).toHaveBeenCalledWith({
      error: true,
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
    expect(result.logger.error).toHaveBeenCalledWith(
      'Unhandled request exception',
      expect.any(String),
      expect.objectContaining({ requestId: 'request-id', route: '/resource/:id', status: 500 }),
    );
  });
});
